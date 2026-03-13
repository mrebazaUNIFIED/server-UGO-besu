// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

interface ILoanNFT {
    function mint(
        string memory loanId,
        address lenderAddress,
        uint256 originalBalance,
        uint256 currentBalance,
        uint256 noteRate,
        uint256 lenderOwnerPct,
        string memory status,
        string memory location
    ) external returns (uint256);

    function updateMetadata(
        uint256 tokenId,
        uint256 newBalance,
        string memory newStatus
    ) external;

    function burn(uint256 tokenId) external;
    function burnByLoanId(string memory loanId) external;

    function loanIdToTokenId(
        string memory loanId
    ) external view returns (uint256);

    function approveMarketplace(uint256 tokenId, address marketplace) external;
}

interface IPaymentDistributor {
    function recordPendingPayment(uint256 tokenId, uint256 amount) external;
}

contract BridgeReceiver is Ownable {
    ILoanNFT public loanNFT;
    IPaymentDistributor public paymentDistributor;
    address public marketplace;

    mapping(address => bool) public validators;
    address[] public validatorList;
    uint256 public requiredSignatures;
    mapping(bytes32 => bool) public processedMessages;

    mapping(string => bool) public approvedInBesu;

    event LoanMinted(
        string indexed loanId,
        uint256 indexed tokenId,
        address indexed lender,
        uint256 timestamp
    );

    event MetadataUpdated(
        string indexed loanId,
        uint256 indexed tokenId,
        uint256 timestamp
    );

    event PaymentProcessed(
        string indexed loanId,
        uint256 indexed tokenId,
        uint256 amount,
        uint256 timestamp
    );

    event TokenIdNeedsSyncToBesu(
        string indexed loanId,
        uint256 indexed tokenId,
        uint256 timestamp
    );

    event LoanPaidOff(
        string indexed loanId,
        uint256 indexed tokenId,
        uint256 timestamp
    );

    event LoanUnlocked(
        string indexed loanId,
        uint256 indexed tokenId,
        uint256 timestamp
    );

    // ⭐ NUEVO: Evento de burn
    event LoanNFTBurned(
        string indexed loanId,
        uint256 indexed tokenId,
        uint256 timestamp
    );

    constructor(
        address initialOwner,
        address _loanNFT,
        address _paymentDistributor,
        address[] memory _initialValidators,
        uint256 _requiredSignatures
    ) Ownable(initialOwner) {
        require(_loanNFT != address(0), "Invalid LoanNFT");
        require(
            _paymentDistributor != address(0),
            "Invalid PaymentDistributor"
        );
        require(_initialValidators.length > 0, "Need validators");
        require(
            _requiredSignatures > 0 &&
                _requiredSignatures <= _initialValidators.length,
            "Invalid threshold"
        );

        loanNFT = ILoanNFT(_loanNFT);
        paymentDistributor = IPaymentDistributor(_paymentDistributor);

        for (uint256 i = 0; i < _initialValidators.length; i++) {
            require(_initialValidators[i] != address(0), "Invalid validator");
            require(!validators[_initialValidators[i]], "Duplicate validator");

            validators[_initialValidators[i]] = true;
            validatorList.push(_initialValidators[i]);
        }

        requiredSignatures = _requiredSignatures;
    }

    // ===== PROCESAMIENTO DE MENSAJES =====

    /**
     * @notice ⭐ ACTUALIZADO: Nueva firma para el mint
     * @dev Ya no recibe askingPrice (está en MarketplaceBridge, no en NFT)
     */
    function processLoanApproval(
        string memory loanId,
        address lenderAddress,
        uint256 originalBalance,
        uint256 currentBalance,
        uint256 noteRate,
        uint256 lenderOwnerPct,
        string memory status,
        string memory location,
        uint256 timestamp,
        uint256 nonce,
        bytes[] memory signatures
    ) external returns (uint256) {
        // Construir mensaje hash con los nuevos parámetros
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "MINT",
                loanId,
                lenderAddress,
                originalBalance,
                currentBalance,
                noteRate,
                lenderOwnerPct,
                status,
                location,
                timestamp,
                nonce
            )
        );

        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        // Verificar firmas
        require(verifyMessage(ethSignedHash, signatures), "Invalid signatures");
        require(!processedMessages[ethSignedHash], "Already processed");
        require(block.timestamp - timestamp < 600, "Message too old");

        // Validar que el loan fue aprobado en Besu
        require(
            approvedInBesu[loanId],
            "Loan not approved or was cancelled in Besu"
        );

        processedMessages[ethSignedHash] = true;

        uint256 tokenId = loanNFT.mint(
            loanId,
            lenderAddress,
            originalBalance,
            currentBalance,
            noteRate,
            lenderOwnerPct,
            status,
            location
        );

        if (marketplace != address(0)) {
            loanNFT.approveMarketplace(tokenId, marketplace);
        }

        emit TokenIdNeedsSyncToBesu(loanId, tokenId, block.timestamp);
        emit LoanMinted(loanId, tokenId, lenderAddress, block.timestamp);

        return tokenId;
    }

    /**
     * @notice Marcar loan como aprobado en Besu
     */
    function markLoanApprovedInBesu(
        string memory loanId,
        uint256 timestamp,
        uint256 nonce,
        bytes[] memory signatures
    ) external returns (bool) {
        bytes32 messageHash = keccak256(
            abi.encodePacked("APPROVED", loanId, timestamp, nonce)
        );

        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        require(verifyMessage(ethSignedHash, signatures), "Invalid signatures");
        require(!processedMessages[ethSignedHash], "Already processed");
        require(block.timestamp - timestamp < 600, "Message too old");

        processedMessages[ethSignedHash] = true;
        approvedInBesu[loanId] = true;

        return true;
    }

    function setMarketplace(address _marketplace) external onlyOwner {
        require(_marketplace != address(0), "Invalid address");
        marketplace = _marketplace;
    }

    /**
     * @notice Marcar loan como cancelado en Besu
     */
    function markLoanCancelledInBesu(
        string memory loanId,
        uint256 timestamp,
        uint256 nonce,
        bytes[] memory signatures
    ) external returns (bool) {
        bytes32 messageHash = keccak256(
            abi.encodePacked("CANCELLED", loanId, timestamp, nonce)
        );

        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        require(verifyMessage(ethSignedHash, signatures), "Invalid signatures");
        require(!processedMessages[ethSignedHash], "Already processed");
        require(block.timestamp - timestamp < 600, "Message too old");

        processedMessages[ethSignedHash] = true;
        approvedInBesu[loanId] = false;

        return true;
    }

    /**
     * @notice ⭐ NUEVO: Procesar burn de NFT
     */
    function processBurnRequest(
        string memory loanId,
        uint256 timestamp,
        uint256 nonce,
        bytes[] memory signatures
    ) external returns (bool) {
        bytes32 messageHash = keccak256(
            abi.encodePacked("BURN", loanId, timestamp, nonce)
        );

        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        require(verifyMessage(ethSignedHash, signatures), "Invalid signatures");
        require(!processedMessages[ethSignedHash], "Already processed");
        require(block.timestamp - timestamp < 600, "Message too old");

        processedMessages[ethSignedHash] = true;

        uint256 tokenId = loanNFT.loanIdToTokenId(loanId);
        require(tokenId != 0, "Loan not minted");

        // Quemar el NFT
        loanNFT.burnByLoanId(loanId);

        // Marcar como no aprobado para prevenir re-mint inmediato
        approvedInBesu[loanId] = false;

        emit LoanNFTBurned(loanId, tokenId, block.timestamp);

        return true;
    }

    function processMetadataUpdate(
        string memory loanId,
        uint256 newBalance,
        string memory newStatus,
        uint256 timestamp,
        uint256 nonce,
        bytes[] memory signatures
    ) external returns (bool) {
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "UPDATE",
                loanId,
                newBalance,
                newStatus,
                timestamp,
                nonce
            )
        );

        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        require(verifyMessage(ethSignedHash, signatures), "Invalid signatures");
        require(!processedMessages[ethSignedHash], "Already processed");
        require(block.timestamp - timestamp < 600, "Message too old");

        processedMessages[ethSignedHash] = true;

        uint256 tokenId = loanNFT.loanIdToTokenId(loanId);
        require(tokenId != 0, "Loan not tokenized");

        loanNFT.updateMetadata(tokenId, newBalance, newStatus);

        emit MetadataUpdated(loanId, tokenId, block.timestamp);
        return true;
    }

    function processPayment(
        string memory loanId,
        uint256 amount,
        uint256 timestamp,
        uint256 nonce,
        bytes[] memory signatures
    ) external returns (bool) {
        bytes32 messageHash = keccak256(
            abi.encodePacked("PAYMENT", loanId, amount, timestamp, nonce)
        );

        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        require(verifyMessage(ethSignedHash, signatures), "Invalid signatures");
        require(!processedMessages[ethSignedHash], "Already processed");
        require(block.timestamp - timestamp < 600, "Message too old");

        processedMessages[ethSignedHash] = true;

        uint256 tokenId = loanNFT.loanIdToTokenId(loanId);
        require(tokenId != 0, "Loan not tokenized");

        paymentDistributor.recordPendingPayment(tokenId, amount);

        emit PaymentProcessed(loanId, tokenId, amount, block.timestamp);
        return true;
    }

    function processLoanPaidOff(
        string memory loanId,
        uint256 timestamp,
        uint256 nonce,
        bytes[] memory signatures
    ) external returns (bool) {
        bytes32 messageHash = keccak256(
            abi.encodePacked("PAID_OFF", loanId, timestamp, nonce)
        );

        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        require(verifyMessage(ethSignedHash, signatures), "Invalid signatures");
        require(!processedMessages[ethSignedHash], "Already processed");
        require(block.timestamp - timestamp < 600, "Message too old");

        processedMessages[ethSignedHash] = true;

        uint256 tokenId = loanNFT.loanIdToTokenId(loanId);
        require(tokenId != 0, "Loan not tokenized");

        loanNFT.updateMetadata(tokenId, 0, "Paid Off");

        emit LoanPaidOff(loanId, tokenId, block.timestamp);
        return true;
    }

    function processEmergencyUnlock(
        string memory loanId,
        uint256 timestamp,
        uint256 nonce,
        bytes[] memory signatures
    ) external returns (bool) {
        bytes32 messageHash = keccak256(
            abi.encodePacked("EMERGENCY_UNLOCK", loanId, timestamp, nonce)
        );

        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        require(verifyMessage(ethSignedHash, signatures), "Invalid signatures");
        require(!processedMessages[ethSignedHash], "Already processed");
        require(block.timestamp - timestamp < 600, "Message too old");

        processedMessages[ethSignedHash] = true;

        uint256 tokenId = loanNFT.loanIdToTokenId(loanId);
        require(tokenId != 0, "Loan not tokenized");

        loanNFT.updateMetadata(tokenId, 0, "Unlocked");

        emit LoanUnlocked(loanId, tokenId, block.timestamp);
        return true;
    }

    function processLoanUnlocked(
        string memory loanId,
        uint256 timestamp,
        uint256 nonce,
        bytes[] memory signatures
    ) external returns (bool) {
        bytes32 messageHash = keccak256(
            abi.encodePacked("UNLOCKED", loanId, timestamp, nonce)
        );

        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        require(verifyMessage(ethSignedHash, signatures), "Invalid signatures");
        require(!processedMessages[ethSignedHash], "Already processed");
        require(block.timestamp - timestamp < 600, "Message too old");

        processedMessages[ethSignedHash] = true;

        uint256 tokenId = loanNFT.loanIdToTokenId(loanId);
        require(tokenId != 0, "Loan not tokenized");

        loanNFT.updateMetadata(tokenId, 0, "Unlocked");

        emit LoanUnlocked(loanId, tokenId, block.timestamp);
        return true;
    }

    // ===== VERIFICACIÓN DE FIRMAS =====
    function verifyMessage(
        bytes32 messageHash,
        bytes[] memory signatures
    ) public view returns (bool) {
        require(
            signatures.length >= requiredSignatures,
            "Not enough signatures"
        );

        address[] memory signers = new address[](signatures.length);
        uint256 validCount = 0;

        for (uint256 i = 0; i < signatures.length; i++) {
            address signer = recoverSigner(messageHash, signatures[i]);

            if (!validators[signer]) continue;

            bool isDuplicate = false;
            for (uint256 j = 0; j < validCount; j++) {
                if (signers[j] == signer) {
                    isDuplicate = true;
                    break;
                }
            }

            if (!isDuplicate) {
                signers[validCount] = signer;
                validCount++;
            }
        }

        return validCount >= requiredSignatures;
    }

    function recoverSigner(
        bytes32 messageHash,
        bytes memory signature
    ) public pure returns (address) {
        require(signature.length == 65, "Invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        if (v < 27) {
            v += 27;
        }

        require(v == 27 || v == 28, "Invalid signature v value");
        return ecrecover(messageHash, v, r, s);
    }

    // ===== GESTIÓN DE VALIDADORES =====
    function addValidator(address validator) external onlyOwner {
        require(validator != address(0), "Invalid address");
        require(!validators[validator], "Already validator");

        validators[validator] = true;
        validatorList.push(validator);
    }

    function removeValidator(address validator) external onlyOwner {
        require(validators[validator], "Not a validator");
        require(
            validatorList.length - 1 >= requiredSignatures,
            "Would break threshold"
        );

        validators[validator] = false;

        for (uint256 i = 0; i < validatorList.length; i++) {
            if (validatorList[i] == validator) {
                validatorList[i] = validatorList[validatorList.length - 1];
                validatorList.pop();
                break;
            }
        }
    }

    function setRequiredSignatures(uint256 newThreshold) external onlyOwner {
        require(newThreshold > 0, "Threshold must be > 0");
        require(newThreshold <= validatorList.length, "Threshold too high");
        requiredSignatures = newThreshold;
    }

    // ===== ACTUALIZACIÓN DE CONTRATOS =====
    function setLoanNFT(address _loanNFT) external onlyOwner {
        require(_loanNFT != address(0), "Invalid address");
        loanNFT = ILoanNFT(_loanNFT);
    }

    function setPaymentDistributor(address _distributor) external onlyOwner {
        require(_distributor != address(0), "Invalid address");
        paymentDistributor = IPaymentDistributor(_distributor);
    }

    // ===== VISTAS =====
    function getValidators() external view returns (address[] memory) {
        return validatorList;
    }

    function isValidator(address addr) external view returns (bool) {
        return validators[addr];
    }

    function isMessageProcessed(
        bytes32 messageHash
    ) external view returns (bool) {
        return processedMessages[messageHash];
    }

    function isLoanApprovedInBesu(
        string memory loanId
    ) external view returns (bool) {
        return approvedInBesu[loanId];
    }
}
