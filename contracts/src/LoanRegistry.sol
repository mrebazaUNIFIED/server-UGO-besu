// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./UserRegistry.sol";

contract LoanRegistry is Ownable {
    UserRegistry public userRegistry;
    address public marketplaceBridge;

    struct Loan {
        string ID; // ← MANTENEMOS COMO STRING
        string LoanUid;
        string Account;
        string LenderUid;
        uint256 OriginalBalance;
        uint256 CurrentBalance;
        uint256 VendorFeePct;
        uint256 NoteRate;
        uint256 SoldRate;
        uint256 CalcInterestRate;
        string CoBorrower;
        uint256 ActiveDefaultInterestRate;
        uint256 ReserveBalanceRestricted;
        uint256 DefaultInterestRate;
        uint256 DeferredPrinBal;
        uint256 DeferredUnpaidInt;
        uint256 DeferredLateCharges;
        uint256 DeferredUnpaidCharges;
        uint256 MaximumDraw;
        string CloseDate;
        string DrawStatus;
        string LenderFundDate;
        uint256 LenderOwnerPct;
        string LenderName;
        string LenderAccount;
        bool IsForeclosure;
        string Status;
        string PaidOffDate;
        string PaidToDate;
        string MaturityDate;
        string NextDueDate;
        string City;
        string State;
        string PropertyZip;
        bytes32 TxId;
        uint256 BLOCKAUDITCreationAt;
        uint256 BLOCKAUDITUpdatedAt;
        bool exists;
        uint256 avalancheTokenId;
        uint256 lastSyncTimestamp;
        bool isLocked;
    }

    struct Change {
        string PropertyName;
        string OldValue;
        string NewValue;
    }

    struct LoanActivity {
        bytes32 TxId;
        string LoanInformationId;
        Change[] Changes;
        uint256 Timestamp;
    }

    struct LoanHistoryEntry {
        bytes32 TxId;
        uint256 Timestamp;
        bool IsDelete;
    }

    struct LoanUpdateFields {
        bool updateCurrentBalance;
        uint256 CurrentBalance;
        
        bool updateNoteRate;
        uint256 NoteRate;
        
        bool updateStatus;
        string Status;
        
        bool updateNextDueDate;
        string NextDueDate;
        
        bool updatePaidToDate;
        string PaidToDate;
        
        bool updatePaidOffDate;
        string PaidOffDate;
        
        bool updateDeferredUnpaidInt;
        uint256 DeferredUnpaidInt;
        
        bool updateDeferredLateCharges;
        uint256 DeferredLateCharges;
        
        bool updateDeferredUnpaidCharges;
        uint256 DeferredUnpaidCharges;
        
        bool updateLenderOwnerPct;
        uint256 LenderOwnerPct;
        
        bool updateIsForeclosure;
        bool IsForeclosure;
        
        bool updateCoBorrower;
        string CoBorrower;
        
        bool updateLenderName;
        string LenderName;
        
        bool updateCity;
        string City;
        
        bool updateState;
        string State;
        
        bool updatePropertyZip;
        string PropertyZip;
    }

    // Mappings principales
    mapping(string => Loan) private loans; // ID -> Loan
    mapping(string => string[]) private loanHistoryIds;
    mapping(string => Loan) private loanHistory;
    mapping(bytes32 => LoanActivity) private activities;
    mapping(string => bytes32[]) private loanTransactions;
    mapping(string => string[]) private lenderUidToLoanIds;
    mapping(string => string) private loanUidToId;
    mapping(bytes32 => string) private txIdToLoanId;
    string[] private allLoanIds;

    event LoanCreated(string indexed loanId, bytes32 txId, uint256 timestamp);
    event LoanUpdated(string indexed loanId, bytes32 txId, uint256 changeCount);
    event LoanDeleted(string indexed loanId, bytes32 txId);
    event LoanLocked(string indexed loanId, uint256 timestamp);
    event LoanUnlocked(string indexed loanId, uint256 timestamp);
    event AvalancheTokenIdSet(string indexed loanId, uint256 tokenId, uint256 timestamp);
    event LockedLoanUpdated(string indexed loanId, uint256 newBalance, string newStatus, uint256 timestamp);

    constructor(address initialOwner, address userRegistryAddress) Ownable(initialOwner) {
        require(userRegistryAddress != address(0), "UserRegistry address required");
        userRegistry = UserRegistry(userRegistryAddress);
    }

    modifier onlyAuthorized() {
        if (msg.sender != owner()) {
            UserRegistry.User memory user = userRegistry.getUser(msg.sender);
            require(user.isActive, "User not active");
            bytes32 roleHash = keccak256(bytes(user.role));
            require(
                roleHash == keccak256(bytes("operator")) || roleHash == keccak256(bytes("admin")),
                "Not authorized: must be operator or admin"
            );
        }
        _;
    }

    modifier onlyBridge() {
        require(msg.sender == marketplaceBridge, "Only MarketplaceBridge");
        _;
    }

    // ===== FUNCIONES DE GENERACIÓN DE ID =====
    
    // Función auxiliar para convertir bytes32 a string hexadecimal (SIN "0x")
    function _toHexString(bytes32 _bytes32) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(64); // 32 bytes * 2 caracteres
        
        for (uint256 i = 0; i < 32; i++) {
            str[i * 2] = alphabet[uint8(_bytes32[i] >> 4)];
            str[i * 2 + 1] = alphabet[uint8(_bytes32[i] & 0x0f)];
        }
        
        return string(str);
    }
    
    // Genera el ID del loan como hash(LenderUid + LoanUid)
    function generateLoanId(string memory lenderUid, string memory loanUid) 
        public 
        pure 
        returns (string memory) 
    {
        require(bytes(lenderUid).length > 0, "LenderUid is required");
        require(bytes(loanUid).length > 0, "LoanUid is required");
        
        bytes32 hash = keccak256(abi.encodePacked(lenderUid, loanUid));
        return _toHexString(hash); // ← CORREGIDO: Usa _toHexString
    }
    
    // Función auxiliar para convertir bytes32 a string (mantenida para compatibilidad)
    function bytes32ToString(bytes32 _bytes32) internal pure returns (string memory) {
        return _toHexString(_bytes32); // ← Usa la misma función
    }
    
    // Función auxiliar para verificar si un loan ya existe por LenderUid y LoanUid
    function loanExistsByLenderAndUid(string memory lenderUid, string memory loanUid) 
        public 
        view 
        returns (bool) 
    {
        string memory loanId = generateLoanId(lenderUid, loanUid);
        return loans[loanId].exists;
    }
    
    // Obtener loan por LenderUid y LoanUid
    function getLoanByLenderAndUid(string memory lenderUid, string memory loanUid) 
        public 
        view 
        returns (Loan memory) 
    {
        string memory loanId = generateLoanId(lenderUid, loanUid);
        require(loans[loanId].exists, "The loan does not exist");
        return loans[loanId];
    }

    // ===== FUNCIONES PRINCIPALES =====

    function setMarketplaceBridge(address _bridge) external onlyOwner {
        require(_bridge != address(0), "Invalid bridge address");
        marketplaceBridge = _bridge;
    }

    function lockLoan(string memory loanId) external onlyBridge returns (bool) {
        require(loans[loanId].exists, "Loan does not exist");
        require(!loans[loanId].isLocked, "Already locked");
        require(loans[loanId].CurrentBalance > 0, "Loan balance must be > 0");
        require(keccak256(bytes(loans[loanId].Status)) != keccak256(bytes("Paid Off")), "Cannot tokenize paid off loan");

        loans[loanId].isLocked = true;
        emit LoanLocked(loanId, block.timestamp);
        return true;
    }

    function unlockLoan(string memory loanId) external onlyBridge returns (bool) {
        require(loans[loanId].exists, "Loan does not exist");
        require(loans[loanId].isLocked, "Not locked");

        loans[loanId].isLocked = false;
        loans[loanId].avalancheTokenId = 0;

        emit LoanUnlocked(loanId, block.timestamp);
        return true;
    }

    function setAvalancheTokenId(string memory loanId, uint256 tokenId) external onlyBridge returns (bool) {
        require(loans[loanId].exists, "Loan does not exist");
        require(loans[loanId].isLocked, "Loan must be locked first");
        require(tokenId > 0, "Invalid token ID");
        require(loans[loanId].avalancheTokenId == 0, "Token ID already set");

        loans[loanId].avalancheTokenId = tokenId;
        loans[loanId].lastSyncTimestamp = block.timestamp;

        emit AvalancheTokenIdSet(loanId, tokenId, block.timestamp);
        return true;
    }

    function updateSyncTimestamp(string memory loanId) external onlyBridge returns (bool) {
        require(loans[loanId].exists, "Loan does not exist");
        loans[loanId].lastSyncTimestamp = block.timestamp;
        return true;
    }

    // ===== FUNCIONES DE CREACIÓN/ACTUALIZACIÓN =====

    function createLoan(
        string memory _LoanUid,
        string memory _Account,
        string memory _LenderUid,
        uint256 _OriginalBalance,
        uint256 _CurrentBalance,
        uint256 _VendorFeePct,
        uint256 _NoteRate,
        uint256 _SoldRate,
        uint256 _CalcInterestRate,
        string memory _CoBorrower,
        uint256 _ActiveDefaultInterestRate,
        uint256 _ReserveBalanceRestricted,
        uint256 _DefaultInterestRate,
        uint256 _DeferredPrinBal,
        uint256 _DeferredUnpaidInt,
        uint256 _DeferredLateCharges,
        uint256 _DeferredUnpaidCharges,
        uint256 _MaximumDraw,
        string memory _CloseDate,
        string memory _DrawStatus,
        string memory _LenderFundDate,
        uint256 _LenderOwnerPct,
        string memory _LenderName,
        string memory _LenderAccount,
        bool _IsForeclosure,
        string memory _Status,
        string memory _PaidOffDate,
        string memory _PaidToDate,
        string memory _MaturityDate,
        string memory _NextDueDate,
        string memory _City,
        string memory _State,
        string memory _PropertyZip
    ) public onlyAuthorized returns (bytes32, string memory) {
        require(bytes(_LenderUid).length > 0, "LenderUid is required");
        require(bytes(_LoanUid).length > 0, "LoanUid is required");
        
        // Generar ID automáticamente (CORREGIDO: ahora usa _toHexString)
        string memory loanId = generateLoanId(_LenderUid, _LoanUid);
        
        if (loans[loanId].exists) {
            require(!loans[loanId].isLocked, "Cannot update locked loan via createLoan");
        }

        bytes32 txId = keccak256(abi.encodePacked(block.timestamp, block.number, loanId, msg.sender));
        uint256 creationTimestamp = block.timestamp;
        bool isUpdate = loans[loanId].exists;

        if (isUpdate) {
            creationTimestamp = loans[loanId].BLOCKAUDITCreationAt;
        }

        Loan memory oldLoan = loans[loanId];

        Loan memory newLoan = Loan({
            ID: loanId, // ← Aquí se asigna el ID generado (string hexadecimal)
            LoanUid: _LoanUid,
            Account: _Account,
            LenderUid: _LenderUid,
            OriginalBalance: _OriginalBalance,
            CurrentBalance: _CurrentBalance,
            VendorFeePct: _VendorFeePct,
            NoteRate: _NoteRate,
            SoldRate: _SoldRate,
            CalcInterestRate: _CalcInterestRate,
            CoBorrower: _CoBorrower,
            ActiveDefaultInterestRate: _ActiveDefaultInterestRate,
            ReserveBalanceRestricted: _ReserveBalanceRestricted,
            DefaultInterestRate: _DefaultInterestRate,
            DeferredPrinBal: _DeferredPrinBal,
            DeferredUnpaidInt: _DeferredUnpaidInt,
            DeferredLateCharges: _DeferredLateCharges,
            DeferredUnpaidCharges: _DeferredUnpaidCharges,
            MaximumDraw: _MaximumDraw,
            CloseDate: _CloseDate,
            DrawStatus: _DrawStatus,
            LenderFundDate: _LenderFundDate,
            LenderOwnerPct: _LenderOwnerPct,
            LenderName: _LenderName,
            LenderAccount: _LenderAccount,
            IsForeclosure: _IsForeclosure,
            Status: _Status,
            PaidOffDate: _PaidOffDate,
            PaidToDate: _PaidToDate,
            MaturityDate: _MaturityDate,
            NextDueDate: _NextDueDate,
            City: _City,
            State: _State,
            PropertyZip: _PropertyZip,
            TxId: txId,
            BLOCKAUDITCreationAt: creationTimestamp,
            BLOCKAUDITUpdatedAt: block.timestamp,
            exists: true,
            avalancheTokenId: isUpdate ? oldLoan.avalancheTokenId : 0,
            lastSyncTimestamp: isUpdate ? oldLoan.lastSyncTimestamp : 0,
            isLocked: isUpdate ? oldLoan.isLocked : false
        });

        string memory historicalId = string(abi.encodePacked(loanId, "_", uint2str(block.timestamp)));
        loanHistory[historicalId] = newLoan;
        loanHistoryIds[loanId].push(historicalId);

        LoanActivity storage activity = activities[txId];
        activity.TxId = txId;
        activity.LoanInformationId = loanId;
        activity.Timestamp = block.timestamp;

        if (isUpdate) {
            _compareLoans(oldLoan, newLoan, activity);
            
            // Actualizar índice de LenderUid si cambió
            if (keccak256(bytes(oldLoan.LenderUid)) != keccak256(bytes(_LenderUid))) {
                _removeFromLenderIndex(oldLoan.LenderUid, loanId);
                if (bytes(_LenderUid).length > 0) {
                    lenderUidToLoanIds[_LenderUid].push(loanId);
                }
            }
            
            emit LoanUpdated(loanId, txId, activity.Changes.length);
        } else {
            allLoanIds.push(loanId);
            
            // Agregar al índice de LenderUid
            if (bytes(_LenderUid).length > 0) {
                lenderUidToLoanIds[_LenderUid].push(loanId);
            }
            
            // Agregar al índice de LoanUid -> ID
            loanUidToId[_LoanUid] = loanId;
            
            emit LoanCreated(loanId, txId, block.timestamp);
        }

        loans[loanId] = newLoan;
        loanTransactions[loanId].push(txId);
        txIdToLoanId[txId] = loanId;

        return (txId, loanId);
    }

    function updateLoanPartial(
        string memory loanId,
        LoanUpdateFields memory fields
    ) public onlyAuthorized returns (bytes32) {
        require(loans[loanId].exists, "Loan does not exist");
        require(!loans[loanId].isLocked, "Cannot update locked loan");

        bytes32 txId = keccak256(
            abi.encodePacked(block.timestamp, block.number, loanId, "PARTIAL_UPDATE")
        );

        Loan memory oldLoan = loans[loanId];
        Loan storage currentLoan = loans[loanId];

        // Aplicar solo los campos que se marcaron para actualizar
        if (fields.updateCurrentBalance) {
            currentLoan.CurrentBalance = fields.CurrentBalance;
        }
        if (fields.updateNoteRate) {
            currentLoan.NoteRate = fields.NoteRate;
        }
        if (fields.updateStatus) {
            currentLoan.Status = fields.Status;
        }
        if (fields.updateNextDueDate) {
            currentLoan.NextDueDate = fields.NextDueDate;
        }
        if (fields.updatePaidToDate) {
            currentLoan.PaidToDate = fields.PaidToDate;
        }
        if (fields.updatePaidOffDate) {
            currentLoan.PaidOffDate = fields.PaidOffDate;
        }
        if (fields.updateDeferredUnpaidInt) {
            currentLoan.DeferredUnpaidInt = fields.DeferredUnpaidInt;
        }
        if (fields.updateDeferredLateCharges) {
            currentLoan.DeferredLateCharges = fields.DeferredLateCharges;
        }
        if (fields.updateDeferredUnpaidCharges) {
            currentLoan.DeferredUnpaidCharges = fields.DeferredUnpaidCharges;
        }
        if (fields.updateLenderOwnerPct) {
            currentLoan.LenderOwnerPct = fields.LenderOwnerPct;
        }
        if (fields.updateIsForeclosure) {
            currentLoan.IsForeclosure = fields.IsForeclosure;
        }
        if (fields.updateCoBorrower) {
            currentLoan.CoBorrower = fields.CoBorrower;
        }
        if (fields.updateLenderName) {
            currentLoan.LenderName = fields.LenderName;
        }
        if (fields.updateCity) {
            currentLoan.City = fields.City;
        }
        if (fields.updateState) {
            currentLoan.State = fields.State;
        }
        if (fields.updatePropertyZip) {
            currentLoan.PropertyZip = fields.PropertyZip;
        }

        // Actualizar metadata
        currentLoan.BLOCKAUDITUpdatedAt = block.timestamp;
        currentLoan.TxId = txId;

        // Guardar en historial
        string memory historicalId = string(
            abi.encodePacked(loanId, "_", uint2str(block.timestamp))
        );
        loanHistory[historicalId] = currentLoan;
        loanHistoryIds[loanId].push(historicalId);

        // Registrar cambios
        LoanActivity storage activity = activities[txId];
        activity.TxId = txId;
        activity.LoanInformationId = loanId;
        activity.Timestamp = block.timestamp;

        _compareLoans(oldLoan, currentLoan, activity);

        loanTransactions[loanId].push(txId);
        txIdToLoanId[txId] = loanId;

        emit LoanUpdated(loanId, txId, activity.Changes.length);
        return txId;
    }

    function updateLockedLoan(
        string memory loanId,
        uint256 newBalance,
        string memory newStatus,
        string memory newPaidToDate
    ) external onlyAuthorized returns (bytes32) {
        require(loans[loanId].exists, "Loan does not exist");
        require(loans[loanId].isLocked, "Only for locked loans");
        require(loans[loanId].avalancheTokenId > 0, "NFT not minted yet");

        bytes32 txId = keccak256(
            abi.encodePacked(block.timestamp, block.number, loanId, "LOCKED_UPDATE")
        );

        Loan storage loan = loans[loanId];
        loan.CurrentBalance = newBalance;
        loan.Status = newStatus;
        loan.PaidToDate = newPaidToDate;
        loan.BLOCKAUDITUpdatedAt = block.timestamp;
        loan.TxId = txId;

        loanTransactions[loanId].push(txId);
        txIdToLoanId[txId] = loanId;

        emit LockedLoanUpdated(loanId, newBalance, newStatus, block.timestamp);
        return txId;
    }

    // ===== FUNCIONES DE CONSULTA =====

    function readLoan(string memory loanId) public view returns (Loan memory) {
        require(loans[loanId].exists, "The loan does not exist");
        return loans[loanId];
    }

    // Obtener loan por LoanUid
    function findLoanByLoanUid(string memory loanUid) public view returns (Loan memory) {
        string memory loanId = loanUidToId[loanUid];
        require(bytes(loanId).length > 0, "No loan found with this LoanUid");
        require(loans[loanId].exists, "Loan has been deleted");
        return loans[loanId];
    }

    function loanExists(string memory loanId) public view returns (bool) {
        return loans[loanId].exists;
    }

    function isLoanLocked(string memory loanId) public view returns (bool) {
        return loans[loanId].isLocked;
    }

    function isLoanTokenized(string memory loanId) public view returns (bool) {
        return loans[loanId].avalancheTokenId > 0;
    }

    function getAvalancheTokenId(string memory loanId) public view returns (uint256) {
        return loans[loanId].avalancheTokenId;
    }

    // Buscar préstamos por LenderUid
    function findLoansByLenderUid(string memory lenderUid) public view returns (Loan[] memory) {
        string[] memory loanIds = lenderUidToLoanIds[lenderUid];

        uint256 activeCount = 0;
        for (uint256 i = 0; i < loanIds.length; i++) {
            if (loans[loanIds[i]].exists) {
                activeCount++;
            }
        }

        Loan[] memory result = new Loan[](activeCount);
        uint256 index = 0;

        for (uint256 i = 0; i < loanIds.length; i++) {
            if (loans[loanIds[i]].exists) {
                result[index] = loans[loanIds[i]];
                index++;
            }
        }

        return result;
    }

    // Contar préstamos por LenderUid
    function countLoansByLenderUid(string memory lenderUid) public view returns (uint256) {
        string[] memory loanIds = lenderUidToLoanIds[lenderUid];
        
        uint256 activeCount = 0;
        for (uint256 i = 0; i < loanIds.length; i++) {
            if (loans[loanIds[i]].exists) {
                activeCount++;
            }
        }
        
        return activeCount;
    }

    function deleteLoan(string memory loanId) public onlyAuthorized returns (bytes32) {
        require(loans[loanId].exists, "Loan does not exist");
        require(!loans[loanId].isLocked, "Cannot delete locked loan");
        require(loans[loanId].avalancheTokenId == 0, "Cannot delete tokenized loan");

        bytes32 txId = keccak256(abi.encodePacked(block.timestamp, block.number, loanId, "DELETE"));
        Loan memory loan = loans[loanId];

        LoanActivity storage activity = activities[txId];
        activity.TxId = txId;
        activity.LoanInformationId = loanId;
        activity.Timestamp = block.timestamp;

        // Remover de los índices
        if (bytes(loan.LoanUid).length > 0) {
            delete loanUidToId[loan.LoanUid];
        }
        
        if (bytes(loan.LenderUid).length > 0) {
            _removeFromLenderIndex(loan.LenderUid, loanId);
        }

        // Remover de la lista de todos los loans
        _removeFromAllLoans(loanId);

        loans[loanId].exists = false;
        loanTransactions[loanId].push(txId);
        txIdToLoanId[txId] = loanId;

        emit LoanDeleted(loanId, txId);
        return txId;
    }

    // ===== FUNCIONES DE HISTORIAL =====

    function getLoanHistory(string memory loanId) public view returns (LoanHistoryEntry[] memory) {
        require(bytes(loanId).length > 0, "Loan ID required");
        bytes32[] memory txIds = loanTransactions[loanId];
        LoanHistoryEntry[] memory history = new LoanHistoryEntry[](txIds.length);

        for (uint256 i = 0; i < txIds.length; i++) {
            LoanActivity memory activity = activities[txIds[i]];
            history[i] = LoanHistoryEntry({
                TxId: txIds[i],
                Timestamp: activity.Timestamp,
                IsDelete: !loans[loanId].exists && i == txIds.length - 1
            });
        }

        return history;
    }

    function getLoanHistoryWithChanges(string memory loanId)
        public
        view
        returns (
            bytes32[] memory txIds,
            uint256[] memory timestamps,
            bool[] memory isDeletes,
            uint256[] memory changeCounts
        )
    {
        require(bytes(loanId).length > 0, "Loan ID required");
        bytes32[] memory transactions = loanTransactions[loanId];
        txIds = new bytes32[](transactions.length);
        timestamps = new uint256[](transactions.length);
        isDeletes = new bool[](transactions.length);
        changeCounts = new uint256[](transactions.length);

        for (uint256 i = 0; i < transactions.length; i++) {
            LoanActivity memory activity = activities[transactions[i]];
            txIds[i] = transactions[i];
            timestamps[i] = activity.Timestamp;
            isDeletes[i] = !loans[loanId].exists && i == transactions.length - 1;
            changeCounts[i] = activity.Changes.length;
        }

        return (txIds, timestamps, isDeletes, changeCounts);
    }

    function getActivityChanges(bytes32 txId) public view returns (Change[] memory) {
        return activities[txId].Changes;
    }

    function getLoanByTxId(bytes32 txId) public view returns (Loan memory loan, Change[] memory changes) {
        string memory loanId = txIdToLoanId[txId];
        require(bytes(loanId).length > 0, "Transaction not found");

        string[] memory historicalIds = loanHistoryIds[loanId];

        for (uint256 i = 0; i < historicalIds.length; i++) {
            Loan memory historicalLoan = loanHistory[historicalIds[i]];
            if (historicalLoan.TxId == txId) {
                return (historicalLoan, activities[txId].Changes);
            }
        }

        revert("Loan state not found for this TxId");
    }

    function getCurrentTransactionByLoan(string memory loanId) public view returns (bytes32) {
        bytes32[] memory txIds = loanTransactions[loanId];
        require(txIds.length > 0, "No transactions found");
        return txIds[txIds.length - 1];
    }

    function queryAllLoans() public view returns (Loan[] memory) {
        uint256 activeCount = 0;

        for (uint256 i = 0; i < allLoanIds.length; i++) {
            if (loans[allLoanIds[i]].exists) {
                activeCount++;
            }
        }

        Loan[] memory result = new Loan[](activeCount);
        uint256 index = 0;

        for (uint256 i = 0; i < allLoanIds.length; i++) {
            if (loans[allLoanIds[i]].exists) {
                result[index] = loans[allLoanIds[i]];
                index++;
            }
        }

        return result;
    }

    function queryLoansPaginated(uint256 offset, uint256 limit)
        public
        view
        returns (Loan[] memory loans_, uint256 total, uint256 returned)
    {
        total = allLoanIds.length;
        require(offset < total, "Offset out of bounds");

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        uint256 activeCount = 0;
        for (uint256 i = offset; i < end; i++) {
            if (loans[allLoanIds[i]].exists) {
                activeCount++;
            }
        }

        loans_ = new Loan[](activeCount);
        uint256 index = 0;

        for (uint256 i = offset; i < end; i++) {
            if (loans[allLoanIds[i]].exists) {
                loans_[index] = loans[allLoanIds[i]];
                index++;
            }
        }

        returned = activeCount;
        return (loans_, total, returned);
    }

    // ===== FUNCIONES AUXILIARES PRIVADAS =====

    function _compareLoans(Loan memory oldLoan, Loan memory newLoan, LoanActivity storage activity) private {
        // Comparar campos numéricos
        if (oldLoan.CurrentBalance != newLoan.CurrentBalance) {
            activity.Changes.push(
                Change("CurrentBalance", uint2str(oldLoan.CurrentBalance), uint2str(newLoan.CurrentBalance))
            );
        }
        
        if (oldLoan.OriginalBalance != newLoan.OriginalBalance) {
            activity.Changes.push(
                Change("OriginalBalance", uint2str(oldLoan.OriginalBalance), uint2str(newLoan.OriginalBalance))
            );
        }
        
        if (oldLoan.NoteRate != newLoan.NoteRate) {
            activity.Changes.push(Change("NoteRate", uint2str(oldLoan.NoteRate), uint2str(newLoan.NoteRate)));
        }
        
        if (oldLoan.SoldRate != newLoan.SoldRate) {
            activity.Changes.push(Change("SoldRate", uint2str(oldLoan.SoldRate), uint2str(newLoan.SoldRate)));
        }
        
        if (oldLoan.DeferredUnpaidInt != newLoan.DeferredUnpaidInt) {
            activity.Changes.push(
                Change("DeferredUnpaidInt", uint2str(oldLoan.DeferredUnpaidInt), uint2str(newLoan.DeferredUnpaidInt))
            );
        }
        
        if (oldLoan.LenderOwnerPct != newLoan.LenderOwnerPct) {
            activity.Changes.push(
                Change("LenderOwnerPct", uint2str(oldLoan.LenderOwnerPct), uint2str(newLoan.LenderOwnerPct))
            );
        }

        // Comparar campos string
        if (keccak256(bytes(oldLoan.Status)) != keccak256(bytes(newLoan.Status))) {
            activity.Changes.push(Change("Status", oldLoan.Status, newLoan.Status));
        }
        
        if (keccak256(bytes(oldLoan.LenderUid)) != keccak256(bytes(newLoan.LenderUid))) {
            activity.Changes.push(Change("LenderUid", oldLoan.LenderUid, newLoan.LenderUid));
        }
        
        if (keccak256(bytes(oldLoan.NextDueDate)) != keccak256(bytes(newLoan.NextDueDate))) {
            activity.Changes.push(Change("NextDueDate", oldLoan.NextDueDate, newLoan.NextDueDate));
        }
        
        if (keccak256(bytes(oldLoan.PaidToDate)) != keccak256(bytes(newLoan.PaidToDate))) {
            activity.Changes.push(Change("PaidToDate", oldLoan.PaidToDate, newLoan.PaidToDate));
        }
        
        if (keccak256(bytes(oldLoan.PaidOffDate)) != keccak256(bytes(newLoan.PaidOffDate))) {
            activity.Changes.push(Change("PaidOffDate", oldLoan.PaidOffDate, newLoan.PaidOffDate));
        }
        
        if (keccak256(bytes(oldLoan.CoBorrower)) != keccak256(bytes(newLoan.CoBorrower))) {
            activity.Changes.push(Change("CoBorrower", oldLoan.CoBorrower, newLoan.CoBorrower));
        }
        
        if (keccak256(bytes(oldLoan.LenderName)) != keccak256(bytes(newLoan.LenderName)) && bytes(oldLoan.LenderName).length > 0) {
            activity.Changes.push(Change("LenderName", oldLoan.LenderName, newLoan.LenderName));
        }
        
        if (keccak256(bytes(oldLoan.City)) != keccak256(bytes(newLoan.City))) {
            activity.Changes.push(Change("City", oldLoan.City, newLoan.City));
        }
        
        if (keccak256(bytes(oldLoan.State)) != keccak256(bytes(newLoan.State))) {
            activity.Changes.push(Change("State", oldLoan.State, newLoan.State));
        }
        
        if (keccak256(bytes(oldLoan.PropertyZip)) != keccak256(bytes(newLoan.PropertyZip))) {
            activity.Changes.push(Change("PropertyZip", oldLoan.PropertyZip, newLoan.PropertyZip));
        }

        // Comparar campos booleanos
        if (oldLoan.IsForeclosure != newLoan.IsForeclosure) {
            activity.Changes.push(
                Change("IsForeclosure", oldLoan.IsForeclosure ? "true" : "false", newLoan.IsForeclosure ? "true" : "false")
            );
        }
    }

    // Función auxiliar para remover loan del índice de LenderUid
    function _removeFromLenderIndex(string memory lenderUid, string memory loanId) private {
        string[] storage lenderLoans = lenderUidToLoanIds[lenderUid];
        for (uint256 i = 0; i < lenderLoans.length; i++) {
            if (keccak256(bytes(lenderLoans[i])) == keccak256(bytes(loanId))) {
                lenderLoans[i] = lenderLoans[lenderLoans.length - 1];
                lenderLoans.pop();
                break;
            }
        }
    }

    // Función auxiliar para remover loan de la lista general
    function _removeFromAllLoans(string memory loanId) private {
        for (uint256 i = 0; i < allLoanIds.length; i++) {
            if (keccak256(bytes(allLoanIds[i])) == keccak256(bytes(loanId))) {
                allLoanIds[i] = allLoanIds[allLoanIds.length - 1];
                allLoanIds.pop();
                break;
            }
        }
    }

    function uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) return "0";
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            bstr[k] = bytes1(uint8(48 + (_i % 10)));
            _i /= 10;
        }
        return string(bstr);
    }

    function getTotalLoansCount() public view returns (uint256) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < allLoanIds.length; i++) {
            if (loans[allLoanIds[i]].exists) {
                activeCount++;
            }
        }
        return activeCount;
    }

    function getAllLoanIds() public view returns (string[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < allLoanIds.length; i++) {
            if (loans[allLoanIds[i]].exists) {
                activeCount++;
            }
        }

        string[] memory activeIds = new string[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allLoanIds.length; i++) {
            if (loans[allLoanIds[i]].exists) {
                activeIds[index] = allLoanIds[i];
                index++;
            }
        }

        return activeIds;
    }
}