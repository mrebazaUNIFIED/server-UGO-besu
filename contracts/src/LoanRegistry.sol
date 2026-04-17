// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./UserRegistry.sol";
import "./LoanStructs.sol";
import "./LoanLib.sol";

// ===== CUSTOM ERRORS =====
error Unauthorized();
error InvalidParameters();
error LoanNotFound();
error LoanAlreadyLocked();
error LoanNotLocked();
error InvalidBalance();
error CannotTokenizePaidOff();
error InvalidTokenId();
error TokenIdAlreadySet();
error CannotUpdateLockedLoan();
error NFTNotMinted();
error CannotDeleteLockedLoan();
error CannotDeleteTokenizedLoan();
error TransactionNotFound();
error OutOfBounds();

/**
 * @title LoanRegistry - UPGRADEABLE (UUPS)
 * @notice Versión upgradeable de LoanRegistry usando patrón UUPS.
 *         El storage es idéntico al contrato original para permitir migración.
 * @dev Para upgradear: upgrades.upgradeProxy(PROXY_ADDRESS, LoanRegistryV2)
 */
contract LoanRegistry is Initializable, OwnableUpgradeable, UUPSUpgradeable {

    UserRegistry public userRegistry;
    address public marketplaceBridge;

    // ⚠️ IMPORTANTE: El orden de estas variables NUNCA debe cambiar en upgrades futuros.
    // Solo se pueden AGREGAR nuevas variables al FINAL.
    mapping(string => Loan) private loans;
    mapping(string => string[]) private loanHistoryIds;
    mapping(string => Loan) private loanHistory;
    mapping(bytes32 => LoanActivity) private activities;
    mapping(string => bytes32[]) private loanTransactions;
    mapping(string => string[]) private lenderUidToLoanIds;
    mapping(string => string) private loanUidToId;
    mapping(bytes32 => string) private txIdToLoanId;
    string[] private allLoanIds;

    // ===== EVENTOS =====
    event LoanCreated(string indexed loanId, bytes32 txId, uint256 timestamp);
    event LoanUpdated(string indexed loanId, bytes32 txId, uint256 changeCount);
    event LoanDeleted(string indexed loanId, bytes32 txId);
    event LoanLocked(string indexed loanId, uint256 timestamp);
    event LoanUnlocked(string indexed loanId, uint256 timestamp);
    event AvalancheTokenIdSet(string indexed loanId, uint256 tokenId, uint256 timestamp);
    event LockedLoanUpdated(string indexed loanId, uint256 newBalance, string newStatus, uint256 timestamp);

    // ===== CONSTRUCTOR (deshabilitado para proxies) =====
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ===== INICIALIZADOR =====
    function initialize(address initialOwner, address userRegistryAddress) public initializer {
        require(userRegistryAddress != address(0), "UserRegistry address required");
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        userRegistry = UserRegistry(userRegistryAddress);
    }

    // ===== REQUERIDO POR UUPS =====
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ===== MODIFIERS =====
    modifier onlyAuthorized() {
        if (msg.sender != owner()) {
            UserRegistry.User memory user = userRegistry.getUser(msg.sender);
            if (!user.isActive) revert Unauthorized();
            bytes32 roleHash = keccak256(bytes(user.role));
            if (roleHash != keccak256(bytes("operator")) && roleHash != keccak256(bytes("admin"))) revert Unauthorized();
        }
        _;
    }

    modifier onlyBridge() {
        if (msg.sender != marketplaceBridge) revert Unauthorized();
        _;
    }

    // ===== FUNCIONES DE GENERACIÓN DE ID =====

    function _toHexString(bytes32 _bytes32) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(64);
        for (uint256 i = 0; i < 32; i++) {
            str[i * 2] = alphabet[uint8(_bytes32[i] >> 4)];
            str[i * 2 + 1] = alphabet[uint8(_bytes32[i] & 0x0f)];
        }
        return string(str);
    }

    function generateLoanId(string memory lenderUid, string memory loanUid)
        public
        pure
        returns (string memory)
    {
        if (bytes(lenderUid).length == 0) revert InvalidParameters();
        if (bytes(loanUid).length == 0) revert InvalidParameters();
        bytes32 hash = keccak256(abi.encodePacked(lenderUid, loanUid));
        return _toHexString(hash);
    }

    function bytes32ToString(bytes32 _bytes32) internal pure returns (string memory) {
        return _toHexString(_bytes32);
    }

    function loanExistsByLenderAndUid(string memory lenderUid, string memory loanUid)
        public
        view
        returns (bool)
    {
        string memory loanId = generateLoanId(lenderUid, loanUid);
        return loans[loanId].exists;
    }

    function getLoanByLenderAndUid(string memory lenderUid, string memory loanUid)
        public
        view
        returns (Loan memory)
    {
        string memory loanId = generateLoanId(lenderUid, loanUid);
        if (!loans[loanId].exists) revert LoanNotFound();
        return loans[loanId];
    }

    // ===== FUNCIONES PRINCIPALES =====

    function setMarketplaceBridge(address _bridge) external onlyOwner {
        if (_bridge == address(0)) revert InvalidParameters();
        marketplaceBridge = _bridge;
    }

    function lockLoan(string memory loanId) external onlyBridge returns (bool) {
        if (!loans[loanId].exists) revert LoanNotFound();
        if (loans[loanId].isLocked) revert LoanAlreadyLocked();
        if (loans[loanId].CurrentBalance == 0) revert InvalidBalance();
        if (keccak256(bytes(loans[loanId].Status)) == keccak256(bytes("Paid Off"))) revert CannotTokenizePaidOff();
        loans[loanId].isLocked = true;
        emit LoanLocked(loanId, block.timestamp);
        return true;
    }

    function unlockLoan(string memory loanId) external onlyBridge returns (bool) {
        if (!loans[loanId].exists) revert LoanNotFound();
        if (!loans[loanId].isLocked) revert LoanNotLocked();
        loans[loanId].isLocked = false;
        loans[loanId].avalancheTokenId = 0;
        emit LoanUnlocked(loanId, block.timestamp);
        return true;
    }

    function setAvalancheTokenId(string memory loanId, uint256 tokenId) external onlyBridge returns (bool) {
        if (!loans[loanId].exists) revert LoanNotFound();
        if (!loans[loanId].isLocked) revert LoanNotLocked();
        if (tokenId == 0) revert InvalidTokenId();
        if (loans[loanId].avalancheTokenId != 0) revert TokenIdAlreadySet();
        loans[loanId].avalancheTokenId = tokenId;
        loans[loanId].lastSyncTimestamp = block.timestamp;
        emit AvalancheTokenIdSet(loanId, tokenId, block.timestamp);
        return true;
    }

    function updateSyncTimestamp(string memory loanId) external onlyBridge returns (bool) {
        if (!loans[loanId].exists) revert LoanNotFound();
        loans[loanId].lastSyncTimestamp = block.timestamp;
        return true;
    }

    // ===== FUNCIONES DE CREACIÓN/ACTUALIZACIÓN =====

    function createLoan(LoanInput calldata data) public onlyAuthorized returns (bytes32, string memory) {
        if (bytes(data.LenderUid).length == 0) revert InvalidParameters();
        if (bytes(data.LoanUid).length == 0) revert InvalidParameters();

        string memory loanId = generateLoanId(data.LenderUid, data.LoanUid);

        if (loans[loanId].exists) {
            if (loans[loanId].isLocked) revert CannotUpdateLockedLoan();
        }

        bytes32 txId = keccak256(abi.encodePacked(block.timestamp, block.number, loanId, msg.sender));
        uint256 creationTimestamp = block.timestamp;
        bool isUpdate = loans[loanId].exists;

        string memory oldLenderUid;
        if (isUpdate) {
            creationTimestamp = loans[loanId].BLOCKAUDITCreationAt;
            oldLenderUid = loans[loanId].LenderUid;
        }

        LoanLib.populateLoan(loans[loanId], data, txId, creationTimestamp, isUpdate);
        loans[loanId].ID = loanId;

        // El Snapshot on-chain está desactivado por límites EVM de memoria y costo excesivo de Gas.
        // El historial en arquitecturas Blockchain empresariales SIEMPRE se deriva Off-Chain
        // usando los block receipts generados por el evento LoanUpdated/LoanCreated.

        LoanActivity storage activity = activities[txId];
        activity.TxId = txId;
        activity.LoanInformationId = loanId;
        activity.Timestamp = block.timestamp;

        if (isUpdate) {
            if (keccak256(bytes(oldLenderUid)) != keccak256(bytes(data.LenderUid))) {
                _removeFromLenderIndex(oldLenderUid, loanId);
                if (bytes(data.LenderUid).length > 0) {
                    lenderUidToLoanIds[data.LenderUid].push(loanId);
                }
            }
            emit LoanUpdated(loanId, txId, activity.Changes.length);
        } else {
            allLoanIds.push(loanId);
            if (bytes(data.LenderUid).length > 0) {
                lenderUidToLoanIds[data.LenderUid].push(loanId);
            }
            loanUidToId[data.LoanUid] = loanId;
            emit LoanCreated(loanId, txId, block.timestamp);
        }

        loanTransactions[loanId].push(txId);
        txIdToLoanId[txId] = loanId;

        return (txId, loanId);
    }

    function updateLoanPartial(
        string memory loanId,
        LoanUpdateFields memory fields
    ) public onlyAuthorized returns (bytes32) {
        if (!loans[loanId].exists) revert LoanNotFound();
        if (loans[loanId].isLocked) revert CannotUpdateLockedLoan();

        bytes32 txId = keccak256(
            abi.encodePacked(block.timestamp, block.number, loanId, "PARTIAL_UPDATE")
        );

        LoanLib.updateLoanPartial(loans[loanId], fields, txId);

        // El Snapshot on-chain fue desactivado para liberar memoria EVM.
        
        LoanActivity storage activity = activities[txId];
        activity.TxId = txId;
        activity.LoanInformationId = loanId;
        activity.Timestamp = block.timestamp;

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
        if (!loans[loanId].exists) revert LoanNotFound();
        if (!loans[loanId].isLocked) revert LoanNotLocked();
        if (loans[loanId].avalancheTokenId == 0) revert NFTNotMinted();

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
        if (!loans[loanId].exists) revert LoanNotFound();
        return loans[loanId];
    }

    function findLoanByLoanUid(string memory loanUid) public view returns (Loan memory) {
        string memory loanId = loanUidToId[loanUid];
        if (bytes(loanId).length == 0) revert LoanNotFound();
        if (!loans[loanId].exists) revert LoanNotFound();
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

    function findLoansByLenderUid(string memory lenderUid) public view returns (Loan[] memory) {
        string[] memory loanIds = lenderUidToLoanIds[lenderUid];
        uint256 activeCount = 0;
        for (uint256 i = 0; i < loanIds.length; i++) {
            if (loans[loanIds[i]].exists) activeCount++;
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

    function countLoansByLenderUid(string memory lenderUid) public view returns (uint256) {
        string[] memory loanIds = lenderUidToLoanIds[lenderUid];
        uint256 activeCount = 0;
        for (uint256 i = 0; i < loanIds.length; i++) {
            if (loans[loanIds[i]].exists) activeCount++;
        }
        return activeCount;
    }

    function deleteLoan(string memory loanId) public onlyAuthorized returns (bytes32) {
        if (!loans[loanId].exists) revert LoanNotFound();
        if (loans[loanId].isLocked) revert CannotDeleteLockedLoan();
        if (loans[loanId].avalancheTokenId != 0) revert CannotDeleteTokenizedLoan();

        bytes32 txId = keccak256(abi.encodePacked(block.timestamp, block.number, loanId, "DELETE"));
        
        string memory loanUid = loans[loanId].LoanUid;
        string memory lenderUid = loans[loanId].LenderUid;

        LoanActivity storage activity = activities[txId];
        activity.TxId = txId;
        activity.LoanInformationId = loanId;
        activity.Timestamp = block.timestamp;

        if (bytes(loanUid).length > 0) delete loanUidToId[loanUid];
        if (bytes(lenderUid).length > 0) _removeFromLenderIndex(lenderUid, loanId);

        _removeFromAllLoans(loanId);

        loans[loanId].exists = false;
        loanTransactions[loanId].push(txId);
        txIdToLoanId[txId] = loanId;

        emit LoanDeleted(loanId, txId);
        return txId;
    }

    // ===== FUNCIONES DE HISTORIAL =====

    function getLoanHistory(string memory /* loanId */) public pure returns (LoanHistoryEntry[] memory) {
        revert("Historial trackeado Off-Chain usando Eventos (LoanUpdated)");
    }

    function getLoanHistoryWithChanges(string memory /* loanId */)
        public
        pure
        returns (
            bytes32[] memory /* txIds */,
            uint256[] memory /* timestamps */,
            bool[] memory /* isDeletes */,
            uint256[] memory /* changeCounts */
        )
    {
        revert("Historial trackeado Off-Chain usando Eventos (LoanUpdated)");
    }

    function getActivityChanges(bytes32 /* txId */) public pure returns (Change[] memory) {
        revert("Cambios trackeados Off-Chain");
    }

    function getLoanByTxId(bytes32 /* txId */) public pure returns (Loan memory /* loan */, Change[] memory /* changes */) {
        revert("Historial trackeado Off-Chain");
    }

    function getCurrentTransactionByLoan(string memory loanId) public view returns (bytes32) {
        bytes32[] memory txIds = loanTransactions[loanId];
        if (txIds.length == 0) revert TransactionNotFound();
        return txIds[txIds.length - 1];
    }

    function queryAllLoans() public view returns (Loan[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < allLoanIds.length; i++) {
            if (loans[allLoanIds[i]].exists) activeCount++;
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
        if (offset >= total) revert OutOfBounds();
        uint256 end = offset + limit;
        if (end > total) end = total;

        uint256 activeCount = 0;
        for (uint256 i = offset; i < end; i++) {
            if (loans[allLoanIds[i]].exists) activeCount++;
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

    function getTotalLoansCount() public view returns (uint256) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < allLoanIds.length; i++) {
            if (loans[allLoanIds[i]].exists) activeCount++;
        }
        return activeCount;
    }

    function getAllLoanIds() public view returns (string[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < allLoanIds.length; i++) {
            if (loans[allLoanIds[i]].exists) activeCount++;
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

    // ===== FUNCIONES AUXILIARES PRIVADAS =====

    // The _compareLoans logic was effectively moved to Event Logs previously to bypass memory limits.

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

    function _removeFromAllLoans(string memory loanId) private {
        for (uint256 i = 0; i < allLoanIds.length; i++) {
            if (keccak256(bytes(allLoanIds[i])) == keccak256(bytes(loanId))) {
                allLoanIds[i] = allLoanIds[allLoanIds.length - 1];
                allLoanIds.pop();
                break;
            }
        }
    }

    // uint2str removed. Using Strings.toString().

    // ===== FUNCIÓN DE VERSIÓN =====
    function version() public pure returns (string memory) {
        return "1.0.0";
    }
}