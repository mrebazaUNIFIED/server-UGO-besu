// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract USFCI is ERC20, AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    struct Account {
        string mspId;
        string userId;
        uint256 frozenBalance;
        uint256 lastActivity;
        string kycStatus;
        string riskScore;
        string accountType;
        uint256 createdAt;
        bool exists;
    }

    struct SystemConfig {
        string tokenName;
        string tokenSymbol;
        uint256 maxTransactionAmount;
        uint256 maxDailyTransactionAmount;
        bool dailyReserveReportRequired;
        string reserveBank;
        bool complianceEnabled;
    }

    struct MintRecord {
        address recipientAddress;
        string recipientMspId;
        uint256 amount;
        string reserveProof;
        uint256 timestamp;
        address minter;
    }

    struct BurnRecord {
        address burnerAddress;
        string burnerMspId;
        uint256 amount;
        string reason;
        uint256 timestamp;
    }

    struct TransferRecord {
        address senderAddress;
        string senderMspId;
        address recipientAddress;
        string recipientMspId;
        uint256 amount;
        string metadata;
        uint256 timestamp;
        string settlementType;
    }

    mapping(address => Account) public accounts;
    mapping(string => address) public mspToWallet;
    mapping(string => address[]) private mspWallets;

    SystemConfig public systemConfig;
    MintRecord[] private mintRecords;
    BurnRecord[] private burnRecords;
    TransferRecord[] private transferRecords;

    event WalletRegistered(
        address indexed walletAddress,
        string mspId,
        string userId,
        uint256 timestamp
    );
    event TokensMinted(
        address indexed recipient,
        uint256 amount,
        string reserveProof,
        uint256 timestamp
    );
    event TokensBurned(
        address indexed burner,
        uint256 amount,
        string reason,
        uint256 timestamp
    );
    event TokensTransferred(
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        string metadata,
        uint256 timestamp
    );
    event ComplianceUpdated(
        address indexed walletAddress,
        string kycStatus,
        string riskScore,
        uint256 timestamp
    );

    constructor(address initialOwner) ERC20("USFCI", "USFCI") {
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(MINTER_ROLE, initialOwner);
        _grantRole(BURNER_ROLE, initialOwner);
        _grantRole(COMPLIANCE_ROLE, initialOwner);

        systemConfig = SystemConfig({
            tokenName: "USFCI",
            tokenSymbol: "USFCI",
            maxTransactionAmount: 100000000000000 * 10 ** decimals(),
            maxDailyTransactionAmount: 100000000000000 * 10 ** decimals(),
            dailyReserveReportRequired: true,
            reserveBank: "Sunwest Bank",
            complianceEnabled: true
        });
    }

    function initLedger() public onlyRole(DEFAULT_ADMIN_ROLE) {
        _registerInitialOrg("SunwestMSP", "institutional");
        _registerInitialOrg("FCIMSP", "institutional");
    }

    function _registerInitialOrg(
        string memory mspId,
        string memory accountType
    ) private {
        address walletAddress = address(
            uint160(uint256(keccak256(abi.encodePacked(mspId))))
        );
        uint256 currentTime = block.timestamp;

        accounts[walletAddress] = Account({
            mspId: mspId,
            userId: mspId,
            frozenBalance: 0,
            lastActivity: currentTime,
            kycStatus: "approved",
            riskScore: "low",
            accountType: accountType,
            createdAt: currentTime,
            exists: true
        });

        mspToWallet[mspId] = walletAddress;
        mspWallets[mspId].push(walletAddress);

        emit WalletRegistered(walletAddress, mspId, mspId, currentTime);
    }

    function registerWallet(
        string memory mspId,
        string memory userId,
        string memory accountType
    ) public returns (address) {
        require(!accounts[msg.sender].exists, "Wallet already registered");
        require(bytes(mspId).length > 0, "MspId required");
        require(bytes(userId).length > 0, "UserId required");

        uint256 currentTime = block.timestamp;

        accounts[msg.sender] = Account({
            mspId: mspId,
            userId: userId,
            frozenBalance: 0,
            lastActivity: currentTime,
            kycStatus: "pending",
            riskScore: "medium",
            accountType: accountType,
            createdAt: currentTime,
            exists: true
        });

        mspWallets[mspId].push(msg.sender);

        emit WalletRegistered(msg.sender, mspId, userId, currentTime);
        return msg.sender;
    }

    function mintTokens(
        address walletAddress,
        uint256 amount,
        string memory reserveProof
    ) public onlyRole(MINTER_ROLE) whenNotPaused nonReentrant returns (bool) {
        require(amount > 0, "Amount must be positive");
        require(bytes(reserveProof).length > 0, "Reserve proof required");
        require(accounts[walletAddress].exists, "Wallet not registered");

        _mint(walletAddress, amount);
        accounts[walletAddress].lastActivity = block.timestamp;

        mintRecords.push(
            MintRecord({
                recipientAddress: walletAddress,
                recipientMspId: accounts[walletAddress].mspId,
                amount: amount,
                reserveProof: reserveProof,
                timestamp: block.timestamp,
                minter: msg.sender
            })
        );

        emit TokensMinted(walletAddress, amount, reserveProof, block.timestamp);
        return true;
    }

    function burnTokens(
        address walletAddress,
        uint256 amount,
        string memory reason
    ) public onlyRole(BURNER_ROLE) whenNotPaused nonReentrant returns (bool) {
        require(amount > 0, "Amount must be positive");
        require(accounts[walletAddress].exists, "Wallet not registered");
        require(balanceOf(walletAddress) >= amount, "Insufficient balance");

        _burn(walletAddress, amount);
        accounts[walletAddress].lastActivity = block.timestamp;

        burnRecords.push(
            BurnRecord({
                burnerAddress: walletAddress,
                burnerMspId: accounts[walletAddress].mspId,
                amount: amount,
                reason: reason,
                timestamp: block.timestamp
            })
        );

        emit TokensBurned(walletAddress, amount, reason, block.timestamp);
        return true;
    }

    function transfer(
        address recipient,
        uint256 amount
    ) public virtual override whenNotPaused nonReentrant returns (bool) {
        require(amount > 0, "Amount must be positive");
        require(recipient != msg.sender, "Cannot transfer to yourself");
        require(accounts[msg.sender].exists, "Sender not registered");
        require(accounts[recipient].exists, "Recipient not registered");
        require(
            balanceOf(msg.sender) - accounts[msg.sender].frozenBalance >=
                amount,
            "Insufficient unfrozen balance"
        );

        if (systemConfig.complianceEnabled) {
            require(
                keccak256(bytes(accounts[msg.sender].kycStatus)) ==
                    keccak256(bytes("approved")),
                "Sender KYC not approved"
            );
            require(
                keccak256(bytes(accounts[recipient].kycStatus)) ==
                    keccak256(bytes("approved")),
                "Recipient KYC not approved"
            );
        }

        super.transfer(recipient, amount);

        accounts[msg.sender].lastActivity = block.timestamp;
        accounts[recipient].lastActivity = block.timestamp;

        transferRecords.push(
            TransferRecord({
                senderAddress: msg.sender,
                senderMspId: accounts[msg.sender].mspId,
                recipientAddress: recipient,
                recipientMspId: accounts[recipient].mspId,
                amount: amount,
                metadata: "",
                timestamp: block.timestamp,
                settlementType: "instant"
            })
        );

        emit TokensTransferred(
            msg.sender,
            recipient,
            amount,
            "",
            block.timestamp
        );
        return true;
    }

    function updateComplianceStatus(
        address walletAddress,
        string memory kycStatus,
        string memory riskScore
    ) public onlyRole(COMPLIANCE_ROLE) returns (bool) {
        require(accounts[walletAddress].exists, "Account does not exist");

        accounts[walletAddress].kycStatus = kycStatus;
        accounts[walletAddress].riskScore = riskScore;
        accounts[walletAddress].lastActivity = block.timestamp;

        emit ComplianceUpdated(
            walletAddress,
            kycStatus,
            riskScore,
            block.timestamp
        );
        return true;
    }

    function getAccountDetails(
        address walletAddress
    ) public view returns (Account memory) {
        require(accounts[walletAddress].exists, "Account does not exist");
        return accounts[walletAddress];
    }

    function getBalance(address walletAddress) public view returns (uint256) {
        return balanceOf(walletAddress);
    }

    function getAllMintRecords() public view returns (MintRecord[] memory) {
        return mintRecords;
    }

    /**
     * Obtener registros de minteo por wallet
     */
    function getMintHistory(
        address walletAddress
    ) public view returns (MintRecord[] memory) {
        uint256 count = 0;

        // Contar cuántos registros pertenecen a esta wallet
        for (uint256 i = 0; i < mintRecords.length; i++) {
            if (mintRecords[i].recipientAddress == walletAddress) {
                count++;
            }
        }

        // Crear array del tamaño correcto
        MintRecord[] memory result = new MintRecord[](count);
        uint256 index = 0;

        // Llenar el array
        for (uint256 i = 0; i < mintRecords.length; i++) {
            if (mintRecords[i].recipientAddress == walletAddress) {
                result[index] = mintRecords[i];
                index++;
            }
        }

        return result;
    }

    /**
     * Obtener todos los registros de quemado
     */
    function getAllBurnRecords() public view returns (BurnRecord[] memory) {
        return burnRecords;
    }

    /**
     * Obtener registros de quemado por wallet
     */
    function getBurnHistory(
        address walletAddress
    ) public view returns (BurnRecord[] memory) {
        uint256 count = 0;

        for (uint256 i = 0; i < burnRecords.length; i++) {
            if (burnRecords[i].burnerAddress == walletAddress) {
                count++;
            }
        }

        BurnRecord[] memory result = new BurnRecord[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < burnRecords.length; i++) {
            if (burnRecords[i].burnerAddress == walletAddress) {
                result[index] = burnRecords[i];
                index++;
            }
        }

        return result;
    }

    /**
     * Obtener todos los registros de transferencias
     */
    function getAllTransferRecords()
        public
        view
        returns (TransferRecord[] memory)
    {
        return transferRecords;
    }

    /**
     * Obtener historial de transferencias de una wallet (enviadas y recibidas)
     */
    function getTransactionHistory(
        address walletAddress
    ) public view returns (TransferRecord[] memory) {
        uint256 count = 0;

        // Contar transferencias donde la wallet es sender o recipient
        for (uint256 i = 0; i < transferRecords.length; i++) {
            if (
                transferRecords[i].senderAddress == walletAddress ||
                transferRecords[i].recipientAddress == walletAddress
            ) {
                count++;
            }
        }

        TransferRecord[] memory result = new TransferRecord[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < transferRecords.length; i++) {
            if (
                transferRecords[i].senderAddress == walletAddress ||
                transferRecords[i].recipientAddress == walletAddress
            ) {
                result[index] = transferRecords[i];
                index++;
            }
        }

        return result;
    }

    /**
     * Obtener solo las transferencias enviadas por una wallet
     */
    function getSentTransactions(
        address walletAddress
    ) public view returns (TransferRecord[] memory) {
        uint256 count = 0;

        for (uint256 i = 0; i < transferRecords.length; i++) {
            if (transferRecords[i].senderAddress == walletAddress) {
                count++;
            }
        }

        TransferRecord[] memory result = new TransferRecord[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < transferRecords.length; i++) {
            if (transferRecords[i].senderAddress == walletAddress) {
                result[index] = transferRecords[i];
                index++;
            }
        }

        return result;
    }

    /**
     * Obtener solo las transferencias recibidas por una wallet
     */
    function getReceivedTransactions(
        address walletAddress
    ) public view returns (TransferRecord[] memory) {
        uint256 count = 0;

        for (uint256 i = 0; i < transferRecords.length; i++) {
            if (transferRecords[i].recipientAddress == walletAddress) {
                count++;
            }
        }

        TransferRecord[] memory result = new TransferRecord[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < transferRecords.length; i++) {
            if (transferRecords[i].recipientAddress == walletAddress) {
                result[index] = transferRecords[i];
                index++;
            }
        }

        return result;
    }

    /**
     * Obtener contadores/estadísticas
     */
    function getStatistics()
        public
        view
        returns (
            uint256 totalMints,
            uint256 totalBurns,
            uint256 totalTransfers,
            uint256 totalSupply_
        )
    {
        return (
            mintRecords.length,
            burnRecords.length,
            transferRecords.length,
            totalSupply()
        );
    }
}
