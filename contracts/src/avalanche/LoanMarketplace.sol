// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ILoanNFT {
    struct LoanMetadata {
        string loanId;
        uint256 currentBalance;
        uint256 monthlyPayment;
        uint256 interestRate;
        string status;
        string location;
        uint256 askingPrice;
        uint256 mintedAt;
        uint256 lastUpdated;
    }

    function getLoanMetadata(
        uint256 tokenId
    ) external view returns (LoanMetadata memory);
    function ownerOf(uint256 tokenId) external view returns (address);
    function getApproved(uint256 tokenId) external view returns (address);
    function isApprovedForAll(
        address owner,
        address operator
    ) external view returns (bool);
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external;
}

contract LoanMarketplace is Ownable, ReentrancyGuard {
    ILoanNFT public loanNFT;
    IERC20 public paymentToken; // USDC

    // Fee del marketplace (basis points: 250 = 2.5%)
    uint256 public marketplaceFee = 250;
    uint256 public constant MAX_FEE = 1000; // 10% máximo
    address public feeRecipient;

    struct Listing {
        address seller;
        uint256 price;
        bool isActive;
        uint256 listedAt;
    }

    mapping(uint256 => Listing) public listings;

    // Estadísticas
    uint256 public totalSales;
    uint256 public totalVolume;

    event LoanListed(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price,
        uint256 timestamp
    );

    event LoanSold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 price,
        uint256 fee,
        uint256 timestamp
    );

    event ListingCancelled(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 timestamp
    );

    event ListingPriceUpdated(
        uint256 indexed tokenId,
        uint256 oldPrice,
        uint256 newPrice,
        uint256 timestamp
    );

    event MarketplaceFeeUpdated(
        uint256 oldFee,
        uint256 newFee,
        uint256 timestamp
    );

    constructor(
        address initialOwner,
        address _loanNFT,
        address _paymentToken,
        address _feeRecipient
    ) Ownable(initialOwner) {
        require(_loanNFT != address(0), "Invalid NFT address");
        require(_paymentToken != address(0), "Invalid token address");
        require(_feeRecipient != address(0), "Invalid fee recipient");

        loanNFT = ILoanNFT(_loanNFT);
        paymentToken = IERC20(_paymentToken);
        feeRecipient = _feeRecipient;
    }

    // ===== HELPER PRIVADO: Validar status del loan =====
    /**
     * @dev ✅ FIX BUG #3: Validación centralizada de estados inválidos
     */
    function _isValidForSale(
        ILoanNFT.LoanMetadata memory meta
    ) private pure returns (bool) {
        // Loan debe tener balance > 0
        if (meta.currentBalance == 0) return false;

        // Validar status no vendible
        bytes32 statusHash = keccak256(bytes(meta.status));

        if (statusHash == keccak256(bytes("Paid Off"))) return false;
        if (statusHash == keccak256(bytes("Foreclosed"))) return false;
        if (statusHash == keccak256(bytes("Unlocked"))) return false;

        return true;
    }

    // ===== LISTING =====
    function listForSale(uint256 tokenId, uint256 price) external nonReentrant {
        require(price > 0, "Price must be > 0");
        require(loanNFT.ownerOf(tokenId) == msg.sender, "Not token owner");
        require(!listings[tokenId].isActive, "Already listed");

        // ✅ FIX BUG #3: VALIDAR METADATA antes de listar
        ILoanNFT.LoanMetadata memory meta = loanNFT.getLoanMetadata(tokenId);
        require(
            _isValidForSale(meta),
            "Loan cannot be listed (paid off, foreclosed, or unlocked)"
        );

        // Verificar que el marketplace está aprobado
        require(
            loanNFT.getApproved(tokenId) == address(this) ||
                loanNFT.isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved for this NFT"
        );

        listings[tokenId] = Listing({
            seller: msg.sender,
            price: price,
            isActive: true,
            listedAt: block.timestamp
        });

        emit LoanListed(tokenId, msg.sender, price, block.timestamp);
    }

    function cancelListing(uint256 tokenId) external nonReentrant {
        Listing memory listing = listings[tokenId];

        require(listing.isActive, "Not listed");
        require(
            listing.seller == msg.sender || msg.sender == owner(),
            "Not authorized"
        );

        listings[tokenId].isActive = false;

        emit ListingCancelled(tokenId, listing.seller, block.timestamp);
    }

    function updateListingPrice(
        uint256 tokenId,
        uint256 newPrice
    ) external nonReentrant {
        Listing storage listing = listings[tokenId];

        require(listing.isActive, "Not listed");
        require(listing.seller == msg.sender, "Not seller");
        require(newPrice > 0, "Price must be > 0");

        uint256 oldPrice = listing.price;
        listing.price = newPrice;

        emit ListingPriceUpdated(tokenId, oldPrice, newPrice, block.timestamp);
    }

    // ===== COMPRA =====
    function buyLoan(uint256 tokenId) external nonReentrant {
        Listing memory listing = listings[tokenId];

        require(listing.isActive, "Not for sale");
        require(msg.sender != listing.seller, "Cannot buy own listing");

        address currentOwner = loanNFT.ownerOf(tokenId);
        require(currentOwner == listing.seller, "Seller no longer owns NFT");

        // ✅ FIX BUG #3: Validar metadata actualizada ANTES de vender
        ILoanNFT.LoanMetadata memory meta = loanNFT.getLoanMetadata(tokenId);
        require(
            _isValidForSale(meta),
            "Loan cannot be sold (paid off, foreclosed, or unlocked)"
        );

        uint256 price = listing.price;
        uint256 fee = calculateFee(price);
        uint256 sellerAmount = price - fee;

        // Marcar como vendido ANTES de transferencias
        listings[tokenId].isActive = false;

        // Transferir USDC del comprador al vendedor
        require(
            paymentToken.transferFrom(msg.sender, listing.seller, sellerAmount),
            "Payment to seller failed"
        );

        // Transferir fee a FCI
        if (fee > 0) {
            require(
                paymentToken.transferFrom(msg.sender, feeRecipient, fee),
                "Fee payment failed"
            );
        }

        // Transferir NFT al comprador
        loanNFT.safeTransferFrom(listing.seller, msg.sender, tokenId);

        // Actualizar estadísticas
        totalSales++;
        totalVolume += price;

        emit LoanSold(
            tokenId,
            listing.seller,
            msg.sender,
            price,
            fee,
            block.timestamp
        );
    }

    // ===== VISTAS =====
    function getListing(
        uint256 tokenId
    ) external view returns (Listing memory) {
        return listings[tokenId];
    }

    function isListed(uint256 tokenId) external view returns (bool) {
        return listings[tokenId].isActive;
    }

    function getListingPrice(uint256 tokenId) external view returns (uint256) {
        require(listings[tokenId].isActive, "Not listed");
        return listings[tokenId].price;
    }

    function calculateFee(uint256 price) public view returns (uint256) {
        return (price * marketplaceFee) / 10000;
    }

    function getSellerAmount(uint256 price) public view returns (uint256) {
        uint256 fee = calculateFee(price);
        return price - fee;
    }

    /**
     * @dev ✅ FIX (BUG #4): Validar si un loan puede ser listado (helper para frontend)
     */
    function canBeListed(uint256 tokenId) external view returns (bool) {
        try loanNFT.getLoanMetadata(tokenId) returns (
            ILoanNFT.LoanMetadata memory meta
        ) {
            return _isValidForSale(meta);
        } catch {
            return false;
        }
    }

    /**
     * @dev ✅ NUEVO: Obtener razón específica por la que un loan no puede venderse
     */
    function getInvalidReason(
        uint256 tokenId
    ) external view returns (string memory) {
        try loanNFT.getLoanMetadata(tokenId) returns (
            ILoanNFT.LoanMetadata memory meta
        ) {
            if (meta.currentBalance == 0) return "Zero balance";

            bytes32 statusHash = keccak256(bytes(meta.status));
            if (statusHash == keccak256(bytes("Paid Off"))) return "Paid Off";
            if (statusHash == keccak256(bytes("Foreclosed")))
                return "Foreclosed";
            if (statusHash == keccak256(bytes("Unlocked")))
                return "Unlocked in Besu";

            return "Valid";
        } catch {
            return "Token does not exist";
        }
    }

    // ===== ADMINISTRACIÓN =====
    function setMarketplaceFee(uint256 newFee) external onlyOwner {
        require(newFee <= MAX_FEE, "Fee too high (max 10%)");

        uint256 oldFee = marketplaceFee;
        marketplaceFee = newFee;

        emit MarketplaceFeeUpdated(oldFee, newFee, block.timestamp);
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid address");
        feeRecipient = newRecipient;
    }

    function setLoanNFT(address _loanNFT) external onlyOwner {
        require(_loanNFT != address(0), "Invalid address");
        loanNFT = ILoanNFT(_loanNFT);
    }

    function setPaymentToken(address _token) external onlyOwner {
        require(_token != address(0), "Invalid address");
        paymentToken = IERC20(_token);
    }

    // ===== EMERGENCIA =====
    /**
     * @dev ✅ FIX: Owner puede forzar cancelación si detecta estado inválido
     */
    function emergencyCancelListing(uint256 tokenId) external onlyOwner {
        require(listings[tokenId].isActive, "Not listed");

        address seller = listings[tokenId].seller;
        listings[tokenId].isActive = false;

        emit ListingCancelled(tokenId, seller, block.timestamp);
    }

    /**
     * @dev ✅ NUEVO: Cancelar múltiples listings de golpe (batch emergency)
     */
    function emergencyCancelMultiple(
        uint256[] calldata tokenIds
    ) external onlyOwner {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (listings[tokenIds[i]].isActive) {
                address seller = listings[tokenIds[i]].seller;
                listings[tokenIds[i]].isActive = false;
                emit ListingCancelled(tokenIds[i], seller, block.timestamp);
            }
        }
    }

    function emergencyWithdraw(
        address token,
        uint256 amount
    ) external onlyOwner {
        require(IERC20(token).transfer(owner(), amount), "Withdraw failed");
    }
}
