// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LoanNFT is ERC721, Ownable {
    uint256 private _tokenIdCounter;

    // Solo BridgeReceiver puede mintear/actualizar
    address public bridgeReceiver;

    // Mappings bidireccionales
    mapping(string => uint256) public loanIdToTokenId;
    mapping(uint256 => string) public tokenIdToLoanId;

    // ✅ FIX: Tracking histórico de mints para prevenir duplicados
    mapping(string => bool) public hasBeenMinted;

    // Metadata completa del NFT
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

    mapping(uint256 => LoanMetadata) public loanMetadata;

    event LoanNFTMinted(
        uint256 indexed tokenId,
        string loanId,
        address indexed lender,
        uint256 timestamp
    );

    event MetadataUpdated(
        uint256 indexed tokenId,
        string loanId,
        uint256 newBalance,
        string newStatus,
        uint256 timestamp
    );

    // ✅ NUEVO: Evento para tracking de askingPrice
    event AskingPriceUpdated(
        uint256 indexed tokenId,
        string loanId,
        uint256 oldPrice,
        uint256 newPrice,
        uint256 timestamp
    );

    constructor(address initialOwner) 
        ERC721("FCI Loan", "FCILOAN") 
        Ownable(initialOwner) 
    {}

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

    // ===== MINT (Solo BridgeReceiver) =====
    function mint(
        string memory loanId,
        address lenderAddress,
        uint256 currentBalance,
        uint256 monthlyPayment,
        uint256 interestRate,
        string memory status,
        string memory location,
        uint256 askingPrice
    ) external onlyBridge returns (uint256) {
        // ✅ FIX: Validar que el loan nunca haya sido minteado
        require(!hasBeenMinted[loanId], "Loan was already minted before");
        require(loanIdToTokenId[loanId] == 0, "Loan already has active token");
        require(lenderAddress != address(0), "Invalid lender address");
        require(currentBalance > 0, "Balance must be > 0");
        require(bytes(loanId).length > 0, "LoanId is required");

        _tokenIdCounter++;
        uint256 newTokenId = _tokenIdCounter;

        _safeMint(lenderAddress, newTokenId);

        loanIdToTokenId[loanId] = newTokenId;
        tokenIdToLoanId[newTokenId] = loanId;
        hasBeenMinted[loanId] = true; // Marcar como minteado permanentemente

        loanMetadata[newTokenId] = LoanMetadata({
            loanId: loanId,
            currentBalance: currentBalance,
            monthlyPayment: monthlyPayment,
            interestRate: interestRate,
            status: status,
            location: location,
            askingPrice: askingPrice,
            mintedAt: block.timestamp,
            lastUpdated: block.timestamp
        });

        emit LoanNFTMinted(newTokenId, loanId, lenderAddress, block.timestamp);

        return newTokenId;
    }

    // ===== UPDATE METADATA (Solo BridgeReceiver) =====
    function updateMetadata(
        uint256 tokenId,
        uint256 newBalance,
        string memory newStatus
    ) external onlyBridge {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        loanMetadata[tokenId].currentBalance = newBalance;
        loanMetadata[tokenId].status = newStatus;
        loanMetadata[tokenId].lastUpdated = block.timestamp;

        emit MetadataUpdated(
            tokenId,
            tokenIdToLoanId[tokenId],
            newBalance,
            newStatus,
            block.timestamp
        );
    }

    // ✅ NUEVO: Actualizar asking price (para cancelaciones de venta)
    function updateAskingPrice(
        uint256 tokenId,
        uint256 newAskingPrice
    ) external onlyBridge {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        uint256 oldPrice = loanMetadata[tokenId].askingPrice;
        loanMetadata[tokenId].askingPrice = newAskingPrice;
        loanMetadata[tokenId].lastUpdated = block.timestamp;

        emit AskingPriceUpdated(
            tokenId,
            tokenIdToLoanId[tokenId],
            oldPrice,
            newAskingPrice,
            block.timestamp
        );
    }

    // ✅ NUEVO: Actualizar metadata completa (más flexible)
    function updateFullMetadata(
        uint256 tokenId,
        uint256 newBalance,
        uint256 newMonthlyPayment,
        uint256 newInterestRate,
        string memory newStatus,
        string memory newLocation,
        uint256 newAskingPrice
    ) external onlyBridge {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        LoanMetadata storage metadata = loanMetadata[tokenId];
        
        metadata.currentBalance = newBalance;
        metadata.monthlyPayment = newMonthlyPayment;
        metadata.interestRate = newInterestRate;
        metadata.status = newStatus;
        metadata.location = newLocation;
        metadata.askingPrice = newAskingPrice;
        metadata.lastUpdated = block.timestamp;

        emit MetadataUpdated(
            tokenId,
            tokenIdToLoanId[tokenId],
            newBalance,
            newStatus,
            block.timestamp
        );
    }

    // ===== FUNCIONES DE VISTA =====
    function getLoanMetadata(uint256 tokenId)
        external
        view
        returns (LoanMetadata memory)
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return loanMetadata[tokenId];
    }

    function exists(uint256 tokenId) external view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    function getTotalMinted() external view returns (uint256) {
        return _tokenIdCounter;
    }

    function wasEverMinted(string memory loanId) external view returns (bool) {
        return hasBeenMinted[loanId];
    }

    // ===== TOKEN URI =====
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        // Aquí puedes implementar metadata dinámica
        // Por ahora retorna URL básica
        return
            string(
                abi.encodePacked(
                    "https://api.fci-loans.com/metadata/",
                    tokenIdToLoanId[tokenId]
                )
            );
    }

    // ===== OVERRIDE PARA SEGURIDAD =====
    // Solo el owner puede transferir ANTES de listar en marketplace
    // Una vez aprobado al marketplace, funciona normal
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        
        // Permitir mint (from == address(0))
        if (from == address(0)) {
            return super._update(to, tokenId, auth);
        }

        // Permitir transfers normales (el marketplace ya valida aprobaciones)
        return super._update(to, tokenId, auth);
    }

    // ===== FUNCIÓN DE EMERGENCIA =====
    /**
     * @dev Owner puede actualizar URI base en caso necesario
     */
    string private _baseTokenURI;

    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return bytes(_baseTokenURI).length > 0 
            ? _baseTokenURI 
            : "https://api.fci-loans.com/metadata/";
    }
}
