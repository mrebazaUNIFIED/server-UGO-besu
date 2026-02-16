// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./LoanRegistry.sol";

/**
 * @title MarketplaceBridge - VERSIÓN CON MAPPING BIDIRECCIONAL
 * @notice ⭐ MEJORA: Agregado mapping loanIdToTxHash para obtener txHash desde loanId
 */
contract MarketplaceBridge is Ownable {
    LoanRegistry public loanRegistry;
    address public relayerAddress;

    struct ApprovalData {
        bool isApproved;
        uint256 askingPrice;
        address lenderAddress;
        uint256 approvalTimestamp;
        bool isMinted;
        bool isCancelled;
    }

    mapping(string => ApprovalData) public loanApprovals;
    mapping(string => uint256) public loanToAvalancheTokenId;
    
    // ⭐ MAPPINGS BIDIRECCIONALES para txHash
    mapping(bytes32 => string) public txHashToLoanId;      // txHash → loanId (ya existía)
    mapping(string => bytes32) public loanIdToTxHash;       // ⭐ NUEVO: loanId → txHash

    // ===== EVENTOS =====
    event LoanApprovedForSale(
        string indexed loanId,
        address indexed lenderAddress,
        uint256 askingPrice,
        uint256 timestamp
    );

    event LoanApprovalCancelled(
        string indexed loanId,
        address indexed lenderAddress,
        uint256 timestamp
    );

    event AvalancheTokenIdSet(
        string indexed loanId,
        uint256 tokenId,
        uint256 timestamp
    );

    event EmergencyUnlockNeedsSync(
        string indexed loanId,
        uint256 indexed tokenId,
        uint256 timestamp
    );

    event OwnershipTransferred(
        string indexed loanId,
        address indexed newOwner,
        uint256 salePrice,
        uint256 timestamp
    );

    event PaymentRecorded(
        string indexed loanId,
        uint256 amount,
        uint256 timestamp
    );

    event LoanPaidOff(string indexed loanId, uint256 timestamp);
    
    event NFTBurnRequired(
        string indexed loanId,
        uint256 indexed tokenId,
        address indexed requester,
        uint256 timestamp
    );
    
    event NFTBurnConfirmed(
        string indexed loanId,
        uint256 indexed tokenId,
        uint256 timestamp
    );

    constructor(
        address initialOwner,
        address _loanRegistry
    ) Ownable(initialOwner) {
        require(_loanRegistry != address(0), "Invalid LoanRegistry");
        loanRegistry = LoanRegistry(_loanRegistry);
    }

    modifier onlyApprover(string memory loanId) {
        ApprovalData storage approval = loanApprovals[loanId];
        require(approval.lenderAddress == msg.sender, "Not the original approver");
        _;
    }

    modifier onlyRelayer() {
        require(msg.sender == relayerAddress, "Not authorized relayer");
        _;
    }

    // ===== FUNCIÓN PRINCIPAL: APROBAR PARA VENTA =====
    function approveLoanForSale(
        string memory loanId,
        uint256 askingPrice
    ) public returns (bool) {
        require(loanRegistry.loanExists(loanId), "Loan does not exist");
        require(!loanRegistry.isLoanLocked(loanId), "Loan already tokenized");
        require(!loanApprovals[loanId].isApproved, "Already approved");
        require(
            !loanApprovals[loanId].isCancelled,
            "Was cancelled, use new approval"
        );
        require(askingPrice > 0, "Invalid price");

        LoanRegistry.Loan memory loan = loanRegistry.readLoan(loanId);
        require(loan.CurrentBalance > 0, "Loan balance must be > 0");
        require(
            keccak256(bytes(loan.Status)) != keccak256(bytes("Paid Off")),
            "Cannot sell paid off loan"
        );

        require(loanRegistry.lockLoan(loanId), "Failed to lock loan");

        loanApprovals[loanId] = ApprovalData({
            isApproved: true,
            askingPrice: askingPrice,
            lenderAddress: msg.sender,
            approvalTimestamp: block.timestamp,
            isMinted: false,
            isCancelled: false
        });

        emit LoanApprovedForSale(
            loanId,
            msg.sender,
            askingPrice,
            block.timestamp
        );

        return true;
    }

    // ⭐ FUNCIÓN MEJORADA: Registrar txHash en AMBOS mappings
    function registerApprovalTxHash(
        string memory loanId,
        bytes32 txHash
    ) external onlyRelayer returns (bool) {
        require(loanApprovals[loanId].isApproved, "Loan not approved");
        require(txHash != bytes32(0), "Invalid txHash");
        
        // ⭐ Guardar en AMBAS direcciones
        txHashToLoanId[txHash] = loanId;     // txHash → loanId
        loanIdToTxHash[loanId] = txHash;     // loanId → txHash
        
        return true;
    }

    // ⭐ NUEVA FUNCIÓN: Obtener txHash desde loanId
    function getApprovalTxHash(
        string memory loanId
    ) public view returns (bytes32) {
        return loanIdToTxHash[loanId];
    }

    // Función existente: Obtener loanId desde txHash
    function getLoanIdByTxHash(
        bytes32 txHash
    ) public view returns (string memory) {
        return txHashToLoanId[txHash];
    }

    // Función existente: Obtener ApprovalData por txHash
    function getApprovalDataByTxHash(
        bytes32 txHash
    ) public view returns (ApprovalData memory, string memory) {
        string memory loanId = txHashToLoanId[txHash];
        require(bytes(loanId).length > 0, "TxHash not found");
        
        return (loanApprovals[loanId], loanId);
    }

    // ===== CANCELAR APROBACIÓN =====
    function cancelSaleListing(
        string memory loanId
    ) public onlyApprover(loanId) returns (bool) {
        ApprovalData storage approval = loanApprovals[loanId];

        require(approval.isApproved, "Not approved for sale");
        require(!approval.isMinted, "NFT already minted, use requestBurnAndCancel()");
        require(!approval.isCancelled, "Already cancelled");

        approval.isCancelled = true;
        approval.isApproved = false;

        require(loanRegistry.unlockLoan(loanId), "Failed to unlock loan");

        emit LoanApprovalCancelled(loanId, msg.sender, block.timestamp);
        return true;
    }

    function requestBurnAndCancel(
        string memory loanId
    ) public onlyApprover(loanId) returns (bool) {
        ApprovalData storage approval = loanApprovals[loanId];

        require(approval.isApproved, "Not approved for sale");
        require(approval.isMinted, "NFT not minted yet, use cancelSaleListing()");
        require(!approval.isCancelled, "Already cancelled");

        uint256 tokenId = loanToAvalancheTokenId[loanId];
        require(tokenId > 0, "Token ID not set");

        emit NFTBurnRequired(loanId, tokenId, msg.sender, block.timestamp);

        return true;
    }

    function confirmBurnAndCancel(
        string memory loanId
    ) external onlyRelayer returns (bool) {
        ApprovalData storage approval = loanApprovals[loanId];

        require(approval.isApproved, "Not approved");
        require(approval.isMinted, "Not minted");
        require(!approval.isCancelled, "Already cancelled");

        uint256 tokenId = loanToAvalancheTokenId[loanId];

        approval.isCancelled = true;
        approval.isApproved = false;
        approval.isMinted = false;

        delete loanToAvalancheTokenId[loanId];

        require(loanRegistry.unlockLoan(loanId), "Failed to unlock");

        emit NFTBurnConfirmed(loanId, tokenId, block.timestamp);
        emit LoanApprovalCancelled(loanId, approval.lenderAddress, block.timestamp);

        return true;
    }

    // ===== FUNCIONES DEL RELAYER =====
    function setAvalancheTokenId(
        string memory loanId,
        uint256 tokenId
    ) public onlyRelayer returns (bool) {
        ApprovalData storage approval = loanApprovals[loanId];

        require(approval.isApproved, "Loan not approved");
        require(!approval.isCancelled, "Approval was cancelled");
        require(!approval.isMinted, "Already minted");
        require(tokenId > 0, "Invalid token ID");
        require(loanRegistry.isLoanLocked(loanId), "Loan is not locked");

        approval.isMinted = true;
        loanToAvalancheTokenId[loanId] = tokenId;

        require(
            loanRegistry.setAvalancheTokenId(loanId, tokenId),
            "Failed to set token ID"
        );

        emit AvalancheTokenIdSet(loanId, tokenId, block.timestamp);
        return true;
    }

    function recordOwnershipTransfer(
        string memory loanId,
        address newOwnerAddress,
        uint256 salePrice
    ) public onlyRelayer returns (bool) {
        require(loanRegistry.loanExists(loanId), "Loan does not exist");
        require(loanApprovals[loanId].isMinted, "NFT not minted yet");
        require(newOwnerAddress != address(0), "Invalid address");

        emit OwnershipTransferred(
            loanId,
            newOwnerAddress,
            salePrice,
            block.timestamp
        );

        return true;
    }

    function recordPayment(
        string memory loanId,
        uint256 amount
    ) public onlyRelayer returns (bool) {
        require(loanRegistry.loanExists(loanId), "Loan does not exist");
        require(amount > 0, "Invalid amount");

        emit PaymentRecorded(loanId, amount, block.timestamp);
        return true;
    }

    function markLoanAsPaidOff(
        string memory loanId
    ) external onlyRelayer returns (bool) {
        require(loanRegistry.loanExists(loanId), "Loan does not exist");
        require(loanApprovals[loanId].isMinted, "Not minted");

        LoanRegistry.Loan memory loan = loanRegistry.readLoan(loanId);
        require(
            keccak256(bytes(loan.Status)) == keccak256(bytes("Paid Off")),
            "Loan not paid off"
        );

        emit LoanPaidOff(loanId, block.timestamp);
        return true;
    }

    // ===== FUNCIONES AUXILIARES =====
    
    function getApprovedLoansByLender(address lenderAddress) 
        public 
        view 
        returns (string[] memory) 
    {
        uint256 count = 0;
        string[] memory allLoanIds = loanRegistry.getAllLoanIds();
        
        for (uint256 i = 0; i < allLoanIds.length; i++) {
            if (loanApprovals[allLoanIds[i]].lenderAddress == lenderAddress &&
                loanApprovals[allLoanIds[i]].isApproved &&
                !loanApprovals[allLoanIds[i]].isCancelled) {
                count++;
            }
        }
        
        string[] memory result = new string[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allLoanIds.length; i++) {
            if (loanApprovals[allLoanIds[i]].lenderAddress == lenderAddress &&
                loanApprovals[allLoanIds[i]].isApproved &&
                !loanApprovals[allLoanIds[i]].isCancelled) {
                result[index] = allLoanIds[i];
                index++;
            }
        }
        
        return result;
    }

    function getTokenizedLoans() 
        public 
        view 
        returns (string[] memory) 
    {
        uint256 count = 0;
        string[] memory allLoanIds = loanRegistry.getAllLoanIds();
        
        for (uint256 i = 0; i < allLoanIds.length; i++) {
            if (loanRegistry.isLoanTokenized(allLoanIds[i])) {
                count++;
            }
        }
        
        string[] memory result = new string[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allLoanIds.length; i++) {
            if (loanRegistry.isLoanTokenized(allLoanIds[i])) {
                result[index] = allLoanIds[i];
                index++;
            }
        }
        
        return result;
    }

    function canApproveLoan(string memory loanId) 
        public 
        view 
        returns (bool canApprove, string memory reason) 
    {
        if (!loanRegistry.loanExists(loanId)) {
            return (false, "Loan does not exist");
        }
        
        if (loanRegistry.isLoanLocked(loanId)) {
            return (false, "Loan already tokenized");
        }
        
        if (loanApprovals[loanId].isApproved) {
            return (false, "Already approved");
        }
        
        if (loanApprovals[loanId].isCancelled) {
            return (false, "Was cancelled");
        }
        
        LoanRegistry.Loan memory loan = loanRegistry.readLoan(loanId);
        
        if (loan.CurrentBalance == 0) {
            return (false, "Loan balance must be > 0");
        }
        
        if (keccak256(bytes(loan.Status)) == keccak256(bytes("Paid Off"))) {
            return (false, "Cannot sell paid off loan");
        }
        
        return (true, "");
    }

    // ===== FUNCIONES DE VISTA =====
    function isLoanApprovedForSale(
        string memory loanId
    ) public view returns (bool) {
        ApprovalData memory approval = loanApprovals[loanId];
        return approval.isApproved && !approval.isCancelled;
    }

    function getApprovalData(
        string memory loanId
    ) public view returns (ApprovalData memory) {
        return loanApprovals[loanId];
    }

    function getAvalancheTokenId(
        string memory loanId
    ) public view returns (uint256) {
        return loanToAvalancheTokenId[loanId];
    }

    function canBeMinted(string memory loanId) public view returns (bool) {
        ApprovalData memory approval = loanApprovals[loanId];
        return
            approval.isApproved && !approval.isMinted && !approval.isCancelled;
    }
    
    function canCancel(string memory loanId) public view returns (bool canCancelNow, bool needsBurn) {
        ApprovalData memory approval = loanApprovals[loanId];
        
        if (!approval.isApproved || approval.isCancelled) {
            return (false, false);
        }
        
        if (!approval.isMinted) {
            return (true, false);
        }
        
        return (true, true);
    }

    // ===== ADMINISTRACIÓN =====
    function setRelayerAddress(address _relayer) public onlyOwner {
        require(_relayer != address(0), "Invalid address");
        relayerAddress = _relayer;
    }

    function updateLoanRegistry(address newLoanRegistry) public onlyOwner {
        require(newLoanRegistry != address(0), "Invalid address");
        loanRegistry = LoanRegistry(newLoanRegistry);
    }

    // ===== FUNCIÓN DE EMERGENCIA =====
    function emergencyUnlock(
        string memory loanId
    ) external onlyOwner returns (bool) {
        ApprovalData storage approval = loanApprovals[loanId];

        require(approval.isApproved, "Not approved");
        require(!approval.isMinted, "NFT already minted");

        uint256 tokenIdBeforeUnlock = loanToAvalancheTokenId[loanId];

        approval.isCancelled = true;
        approval.isApproved = false;

        require(loanRegistry.unlockLoan(loanId), "Failed to unlock");

        emit LoanApprovalCancelled(
            loanId,
            approval.lenderAddress,
            block.timestamp
        );

        if (tokenIdBeforeUnlock > 0) {
            emit EmergencyUnlockNeedsSync(
                loanId,
                tokenIdBeforeUnlock,
                block.timestamp
            );
        }

        return true;
    }

    function forceUnlockPaidOffLoan(string memory loanId) 
        external 
        onlyRelayer 
        returns (bool) 
    {
        require(loanRegistry.loanExists(loanId), "Loan does not exist");
        
        LoanRegistry.Loan memory loan = loanRegistry.readLoan(loanId);
        require(
            keccak256(bytes(loan.Status)) == keccak256(bytes("Paid Off")),
            "Loan not paid off"
        );
        
        if (loanRegistry.isLoanLocked(loanId)) {
            require(loanRegistry.unlockLoan(loanId), "Failed to unlock");
        }
        
        if (loanApprovals[loanId].isApproved) {
            loanApprovals[loanId].isCancelled = true;
            loanApprovals[loanId].isApproved = false;
            
            emit LoanApprovalCancelled(
                loanId,
                loanApprovals[loanId].lenderAddress,
                block.timestamp
            );
        }
        
        return true;
    }

    function getApprover(string memory loanId) public view returns (address) {
        return loanApprovals[loanId].lenderAddress;
    }
}
