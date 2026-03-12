// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title USFCI_Avalanche
 * @notice Stablecoin pública de FCI para Avalanche C-Chain.
 *         1 USFCI = 1 USD, respaldado por Sunwest Bank.
 *
 * @dev Diferencias clave vs USFCI de Besu:
 *      - Sin registro de wallets obligatorio (cualquiera puede recibir/transferir)
 *      - Compatible con Trader Joe DEX (transferFrom sin restricciones)
 *      - Compatible con LoanMarketplace y PaymentDistributor
 *      - Mantiene registros de mint/burn para auditoría de reservas
 *      - UUPS upgradeable
 *
 * @dev Roles:
 *      - DEFAULT_ADMIN_ROLE : puede upgradear, pausar, y gestionar roles
 *      - MINTER_ROLE        : solo el Relayer de FCI (mintea cuando Sunwest confirma depósito)
 *      - BURNER_ROLE        : solo el Relayer de FCI (quema cuando se retira USD)
 *      - COMPLIANCE_ROLE    : puede congelar wallets en caso de fraude/cumplimiento
 */
contract USFCI_Avalanche is
    Initializable,
    ERC20Upgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    // ===== ROLES =====
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    // ===== ESTRUCTURAS =====

    /// @notice Registro de cada mint — prueba de respaldo bancario
    struct MintRecord {
        address recipient;
        uint256 amount;
        string reserveProof; // referencia bancaria de Sunwest Bank
        uint256 timestamp;
        address minter;
    }

    /// @notice Registro de cada burn — prueba de retiro de reservas
    struct BurnRecord {
        address wallet;
        uint256 amount;
        string reason;
        uint256 timestamp;
    }

    /// @notice Wallets con balance congelado por compliance
    /// @dev No impide recibir tokens, solo bloquea transferencias salientes
    mapping(address => uint256) public frozenBalance;

    /// @notice Historial completo de mints para auditoría de reservas
    MintRecord[] private _mintRecords;

    /// @notice Historial completo de burns para auditoría de reservas
    BurnRecord[] private _burnRecords;

    /// @notice Información del banco de respaldo
    string public reserveBank;

    // ===== EVENTOS =====
    event TokensMinted(
        address indexed recipient,
        uint256 amount,
        string reserveProof,
        uint256 timestamp
    );
    event TokensBurned(
        address indexed wallet,
        uint256 amount,
        string reason,
        uint256 timestamp
    );
    event BalanceFrozen(
        address indexed wallet,
        uint256 amount,
        uint256 timestamp
    );
    event BalanceUnfrozen(
        address indexed wallet,
        uint256 amount,
        uint256 timestamp
    );

    // ===== CONSTRUCTOR (deshabilitado para proxies UUPS) =====
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ===== INICIALIZADOR =====
    /**
     * @param initialOwner  Wallet que recibe todos los roles al inicio.
     *                      Luego se le puede transferir MINTER_ROLE al Relayer.
     * @param _reserveBank  Nombre del banco de respaldo (ej: "Sunwest Bank")
     */
    function initialize(
        address initialOwner,
        string memory _reserveBank
    ) public initializer {
        __ERC20_init("USFCI", "USFCI");
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(MINTER_ROLE, initialOwner);
        _grantRole(BURNER_ROLE, initialOwner);
        _grantRole(COMPLIANCE_ROLE, initialOwner);

        reserveBank = _reserveBank;
    }

    // ===== REQUERIDO POR UUPS =====
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // =========================================================
    // MINT — Solo el Relayer (MINTER_ROLE)
    // Se llama cuando Sunwest Bank confirma que recibió USD real
    // =========================================================

    /**
     * @notice Mintea USFCI a una wallet.
     *         Cualquier wallet puede recibir tokens — sin registro previo.
     * @param recipient     Wallet que recibirá el USFCI
     * @param amount        Cantidad en wei (18 decimales). 1 USFCI = 1e18
     * @param reserveProof  Referencia bancaria de Sunwest Bank (ej: "TXN-2024-001")
     */
    function mintTokens(
        address recipient,
        uint256 amount,
        string calldata reserveProof
    ) external onlyRole(MINTER_ROLE) whenNotPaused nonReentrant returns (bool) {
        require(recipient != address(0), "USFCI: recipient is zero address");
        require(amount > 0, "USFCI: amount must be positive");
        require(
            bytes(reserveProof).length > 0,
            "USFCI: reserve proof required"
        );

        _mint(recipient, amount);

        _mintRecords.push(
            MintRecord({
                recipient: recipient,
                amount: amount,
                reserveProof: reserveProof,
                timestamp: block.timestamp,
                minter: msg.sender
            })
        );

        emit TokensMinted(recipient, amount, reserveProof, block.timestamp);
        return true;
    }

    // =========================================================
    // BURN — Solo el Relayer (BURNER_ROLE)
    // Se llama cuando el usuario retira USD de Sunwest Bank
    // =========================================================

    /**
     * @notice Quema USFCI de una wallet.
     *         El Relayer llama esto cuando el usuario retira USD del banco.
     * @param wallet  Wallet de la que se quemarán tokens
     * @param amount  Cantidad a quemar en wei
     * @param reason  Motivo del burn (ej: "withdrawal", "compliance")
     */
    function burnTokens(
        address wallet,
        uint256 amount,
        string calldata reason
    ) external onlyRole(BURNER_ROLE) whenNotPaused nonReentrant returns (bool) {
        require(wallet != address(0), "USFCI: wallet is zero address");
        require(amount > 0, "USFCI: amount must be positive");
        require(balanceOf(wallet) >= amount, "USFCI: insufficient balance");

        _burn(wallet, amount);

        _burnRecords.push(
            BurnRecord({
                wallet: wallet,
                amount: amount,
                reason: reason,
                timestamp: block.timestamp
            })
        );

        emit TokensBurned(wallet, amount, reason, block.timestamp);
        return true;
    }

    // =========================================================
    // TRANSFER — Override para respetar balances congelados
    // Compatible con Trader Joe, LoanMarketplace, y cualquier contrato
    // =========================================================

    /**
     * @notice Transferencia estándar ERC20.
     *         NO requiere registro previo — cualquier wallet puede transferir.
     *         Solo verifica que no se transfiera balance congelado por compliance.
     */
    function transfer(
        address to,
        uint256 amount
    ) public virtual override whenNotPaused returns (bool) {
        require(to != address(0), "USFCI: transfer to zero address");
        _requireUnfrozenBalance(msg.sender, amount);
        return super.transfer(to, amount);
    }

    /**
     * @notice TransferFrom estándar ERC20.
     *         Usado por Trader Joe DEX, LoanMarketplace y PaymentDistributor.
     *         NO requiere registro previo.
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual override whenNotPaused returns (bool) {
        require(to != address(0), "USFCI: transfer to zero address");
        _requireUnfrozenBalance(from, amount);
        return super.transferFrom(from, to, amount);
    }

    // =========================================================
    // COMPLIANCE — Congelar/descongelar balances
    // =========================================================

    /**
     * @notice Congela una cantidad de balance de una wallet.
     *         La wallet sigue pudiendo recibir tokens pero no puede
     *         transferir el monto congelado.
     */
    function freezeBalance(
        address wallet,
        uint256 amount
    ) external onlyRole(COMPLIANCE_ROLE) {
        require(balanceOf(wallet) >= amount, "USFCI: freeze exceeds balance");
        frozenBalance[wallet] += amount;
        emit BalanceFrozen(wallet, amount, block.timestamp);
    }

    /**
     * @notice Descongela balance previamente congelado.
     */
    function unfreezeBalance(
        address wallet,
        uint256 amount
    ) external onlyRole(COMPLIANCE_ROLE) {
        require(
            frozenBalance[wallet] >= amount,
            "USFCI: unfreeze exceeds frozen"
        );
        frozenBalance[wallet] -= amount;
        emit BalanceUnfrozen(wallet, amount, block.timestamp);
    }

    // =========================================================
    // ADMIN
    // =========================================================

    /// @notice Pausa todas las transferencias y mints. Solo admin.
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /// @notice Reanuda el contrato. Solo admin.
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /// @notice Actualiza el nombre del banco de respaldo.
    function setReserveBank(
        string calldata _reserveBank
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        reserveBank = _reserveBank;
    }

    // =========================================================
    // VISTAS — Auditoría y estadísticas
    // =========================================================

    /// @notice Balance disponible (total - congelado)
    function availableBalance(address wallet) external view returns (uint256) {
        uint256 total = balanceOf(wallet);
        uint256 frozen = frozenBalance[wallet];
        return total > frozen ? total - frozen : 0;
    }

    /// @notice Todos los registros de mint para auditoría de reservas
    function getAllMintRecords() external view returns (MintRecord[] memory) {
        return _mintRecords;
    }

    /// @notice Todos los registros de burn
    function getAllBurnRecords() external view returns (BurnRecord[] memory) {
        return _burnRecords;
    }

    /// @notice Historial de mints de una wallet específica
    function getMintHistory(
        address wallet
    ) external view returns (MintRecord[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < _mintRecords.length; i++) {
            if (_mintRecords[i].recipient == wallet) count++;
        }
        MintRecord[] memory result = new MintRecord[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < _mintRecords.length; i++) {
            if (_mintRecords[i].recipient == wallet) {
                result[idx++] = _mintRecords[i];
            }
        }
        return result;
    }

    /// @notice Estadísticas generales del token
    function getStatistics()
        external
        view
        returns (uint256 totalMints, uint256 totalBurns, uint256 currentSupply)
    {
        return (_mintRecords.length, _burnRecords.length, totalSupply());
    }

    /// @notice Versión del contrato
    function version() external pure returns (string memory) {
        return "1.0.0-avalanche";
    }

    // =========================================================
    // INTERNO
    // =========================================================

    /// @dev Verifica que el sender tenga suficiente balance descongelado
    function _requireUnfrozenBalance(
        address wallet,
        uint256 amount
    ) internal view {
        uint256 available = balanceOf(wallet) - frozenBalance[wallet];
        require(
            available >= amount,
            "USFCI: transfer amount exceeds unfrozen balance"
        );
    }
}
