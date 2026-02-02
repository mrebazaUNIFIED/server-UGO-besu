// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PaymentDistributor is Ownable, ReentrancyGuard {
    IERC721 public loanNFT;
    IERC20 public paymentToken; // USDC

    address public bridgeReceiver; // Solo BridgeReceiver puede registrar pagos

    // ✅ Límite para batch claims (previene DoS)
    uint256 public constant MAX_BATCH_CLAIM = 50;

    struct Payment {
        uint256 amount;
        uint256 timestamp;
        address recipient; // Quien ERA el owner cuando se registró el pago
        bool claimed;
    }

    // tokenId => array de pagos históricos
    mapping(uint256 => Payment[]) public paymentHistory;

    // tokenId => monto pendiente de reclamar
    mapping(uint256 => uint256) public pendingPayments;

    // Estadísticas
    uint256 public totalPaymentsRecorded;
    uint256 public totalPaymentsClaimed;
    uint256 public totalAmountDistributed;

    event PaymentRecorded(
        uint256 indexed tokenId,
        uint256 amount,
        address indexed currentOwner,
        uint256 timestamp
    );

    event PaymentClaimed(
        uint256 indexed tokenId,
        address indexed claimer,
        uint256 amount,
        uint256 timestamp
    );

    event FundsDeposited(
        address indexed depositor,
        uint256 amount,
        uint256 timestamp
    );

    constructor(
        address initialOwner,
        address _loanNFT,
        address _paymentToken
    ) Ownable(initialOwner) {
        require(_loanNFT != address(0), "Invalid NFT address");
        require(_paymentToken != address(0), "Invalid token address");

        loanNFT = IERC721(_loanNFT);
        paymentToken = IERC20(_paymentToken);
    }

    modifier onlyBridge() {
        require(
            msg.sender == bridgeReceiver,
            "Only BridgeReceiver can call this"
        );
        _;
    }

    // ===== CONFIGURACIÓN =====
    function setBridgeReceiver(address _bridge) external onlyOwner {
        require(_bridge != address(0), "Invalid bridge address");
        bridgeReceiver = _bridge;
    }

    // ===== REGISTRO DE PAGOS (Solo BridgeReceiver) =====
    /**
     * @dev BridgeReceiver llama esta función cuando detecta un pago
     * Los pagos se ACUMULAN y el owner actual los reclama manualmente
     */
    function recordPendingPayment(
        uint256 tokenId,
        uint256 amount
    ) external onlyBridge {
        require(amount > 0, "Amount must be > 0");

        address currentOwner = loanNFT.ownerOf(tokenId);
        require(currentOwner != address(0), "Token does not exist");

        // Acumular el pago
        pendingPayments[tokenId] += amount;

        // Registrar en historial
        paymentHistory[tokenId].push(
            Payment({
                amount: amount,
                timestamp: block.timestamp,
                recipient: currentOwner,
                claimed: false
            })
        );

        totalPaymentsRecorded++;

        emit PaymentRecorded(tokenId, amount, currentOwner, block.timestamp);
    }

    // ===== RECLAMAR PAGOS (Owner del NFT) =====
    /**
     * @dev El owner actual del NFT reclama TODOS los pagos pendientes
     */
    function claimPendingPayments(uint256 tokenId) external nonReentrant {
        require(loanNFT.ownerOf(tokenId) == msg.sender, "Not token owner");

        uint256 amount = pendingPayments[tokenId];
        require(amount > 0, "No pending payments");

        // ✅ FIX: Validar solvencia del contrato ANTES de resetear estado
        uint256 contractBalance = paymentToken.balanceOf(address(this));
        require(contractBalance >= amount, "Insufficient contract balance");

        // Resetear pendientes ANTES de transferir
        pendingPayments[tokenId] = 0;

        // Marcar pagos como reclamados
        _markPaymentsAsClaimed(tokenId);

        // Transferir USDC
        require(
            paymentToken.transfer(msg.sender, amount),
            "Claim transfer failed"
        );

        totalPaymentsClaimed++;
        totalAmountDistributed += amount;

        emit PaymentClaimed(tokenId, msg.sender, amount, block.timestamp);
    }

    /**
     * @dev Reclamar pagos de múltiples NFTs a la vez (gas-efficient)
     * ✅ FIX: Agregado límite MAX_BATCH_CLAIM para prevenir DoS
     */
    function claimMultiple(uint256[] calldata tokenIds) external nonReentrant {
        require(tokenIds.length > 0, "Empty array");
        require(tokenIds.length <= MAX_BATCH_CLAIM, "Batch too large");

        uint256 totalToClaim = 0;
        uint256[] memory amounts = new uint256[](tokenIds.length);

        // Pre-calcular y validar ownership
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(
                loanNFT.ownerOf(tokenIds[i]) == msg.sender,
                "Not owner of all tokens"
            );
            amounts[i] = pendingPayments[tokenIds[i]];
            totalToClaim += amounts[i];
        }

        require(totalToClaim > 0, "No pending payments");

        // ✅ FIX: Validar solvencia del contrato
        uint256 contractBalance = paymentToken.balanceOf(address(this));
        require(
            contractBalance >= totalToClaim,
            "Insufficient contract balance"
        );

        // Actualizar estado
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (amounts[i] > 0) {
                pendingPayments[tokenIds[i]] = 0;
                _markPaymentsAsClaimed(tokenIds[i]);

                emit PaymentClaimed(
                    tokenIds[i],
                    msg.sender,
                    amounts[i],
                    block.timestamp
                );
            }
        }

        // Una sola transferencia
        require(
            paymentToken.transfer(msg.sender, totalToClaim),
            "Claim transfer failed"
        );

        totalPaymentsClaimed += tokenIds.length;
        totalAmountDistributed += totalToClaim;
    }

    /**
     * @dev Helper privado para marcar pagos como claimed
     * ✅ Optimizado para evitar loops innecesarios
     */
    function _markPaymentsAsClaimed(uint256 tokenId) private {
        Payment[] storage history = paymentHistory[tokenId];
        uint256 len = history.length;

        // Iterar desde el final (pagos más recientes primero)
        for (uint256 i = len; i > 0; i--) {
            uint256 index = i - 1;
            if (!history[index].claimed) {
                history[index].claimed = true;
            } else {
                // Si encontramos uno claimed, los anteriores también lo están
                break;
            }
        }
    }

    // ===== DEPOSITAR FONDOS (FCI convierte fiat → USDC) =====
    /**
     * @dev FCI deposita USDC al contrato para distribuir pagos
     */
    function depositFunds(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");

        require(
            paymentToken.transferFrom(msg.sender, address(this), amount),
            "Deposit failed"
        );

        emit FundsDeposited(msg.sender, amount, block.timestamp);
    }

    // ===== VISTAS =====
    function getPaymentHistory(
        uint256 tokenId
    ) external view returns (Payment[] memory) {
        return paymentHistory[tokenId];
    }

    function getPaymentCount(uint256 tokenId) external view returns (uint256) {
        return paymentHistory[tokenId].length;
    }

    function getPendingAmount(uint256 tokenId) external view returns (uint256) {
        return pendingPayments[tokenId];
    }

    function getTotalPaymentsForToken(
        uint256 tokenId
    ) external view returns (uint256 total) {
        Payment[] memory history = paymentHistory[tokenId];
        for (uint256 i = 0; i < history.length; i++) {
            total += history[i].amount;
        }
        return total;
    }

    function getUnclaimedPaymentsForToken(
        uint256 tokenId
    ) external view returns (uint256 unclaimed) {
        Payment[] memory history = paymentHistory[tokenId];
        for (uint256 i = 0; i < history.length; i++) {
            if (!history[i].claimed) {
                unclaimed += history[i].amount;
            }
        }
        return unclaimed;
    }

    function getContractBalance() external view returns (uint256) {
        return paymentToken.balanceOf(address(this));
    }

    // ===== BATCH QUERIES (Gas-efficient para frontend) =====
    /**
     * @dev Obtener pagos pendientes para múltiples tokens
     * ✅ También con límite para prevenir DoS
     */
    function getPendingForMultiple(
        uint256[] calldata tokenIds
    ) external view returns (uint256[] memory) {
        require(tokenIds.length <= MAX_BATCH_CLAIM, "Query too large");

        uint256[] memory amounts = new uint256[](tokenIds.length);
        for (uint256 i = 0; i < tokenIds.length; i++) {
            amounts[i] = pendingPayments[tokenIds[i]];
        }
        return amounts;
    }

    /**
     * @dev Obtener pagos históricos (últimos N) para un token
     */
    function getRecentPayments(
        uint256 tokenId,
        uint256 count
    ) external view returns (Payment[] memory) {
        Payment[] memory history = paymentHistory[tokenId];
        uint256 total = history.length;

        if (count > total) {
            count = total;
        }

        Payment[] memory recent = new Payment[](count);
        for (uint256 i = 0; i < count; i++) {
            recent[i] = history[total - count + i];
        }

        return recent;
    }

    // ===== ADMINISTRACIÓN =====
    function setLoanNFT(address _loanNFT) external onlyOwner {
        require(_loanNFT != address(0), "Invalid address");
        loanNFT = IERC721(_loanNFT);
    }

    function setPaymentToken(address _token) external onlyOwner {
        require(_token != address(0), "Invalid address");
        paymentToken = IERC20(_token);
    }

    // ===== EMERGENCIA =====
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(paymentToken.transfer(owner(), amount), "Withdraw failed");
    }

    /**
     * @dev Pausar depósitos en caso de emergencia
     */
    bool public depositsEnabled = true;

    function toggleDeposits() external onlyOwner {
        depositsEnabled = !depositsEnabled;
    }

    modifier whenDepositsEnabled() {
        require(depositsEnabled, "Deposits are paused");
        _;
    }
}
