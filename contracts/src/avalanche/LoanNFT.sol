// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LoanNFT - VERSIÓN MEJORADA CON CAMPOS DEL LOANREGISTRY
 * @notice NFT de préstamos con metadata completa del LoanRegistry
 * 
 * CAMBIOS PRINCIPALES:
 * 1. Agregados campos del LoanRegistry: OriginalBalance, CurrentBalance, LenderOwnerPct, NoteRate
 * 2. Removido monthlyPayment (no existe en LoanRegistry)
 * 3. Removido interestRate y askingPrice (redundantes)
 * 4. Mantenidos campos de control: loanId, status, location, mintedAt, lastUpdated
 * 5. Funciones burn() y burnByLoanId() para cancelaciones
 */
contract LoanNFT is ERC721, Ownable {
    uint256 private _tokenIdCounter;

    // Solo BridgeReceiver puede mintear/actualizar/quemar
    address public bridgeReceiver;

    // Mappings bidireccionales
    mapping(string => uint256) public loanIdToTokenId;
    mapping(uint256 => string) public tokenIdToLoanId;

    // Permite re-mint después de burn
    mapping(string => bool) public isCurrentlyMinted;
    
    // Tracking histórico opcional (para estadísticas)
    mapping(string => uint256) public totalMintsPerLoan;

    // ⭐ METADATA MEJORADA - Alineada con LoanRegistry
    struct LoanMetadata {
        // Identificación
        string loanId;
        
        // Campos financieros del LoanRegistry
        uint256 originalBalance;      // OriginalBalance
        uint256 currentBalance;       // CurrentBalance
        uint256 noteRate;             // NoteRate (tasa de interés)
        uint256 lenderOwnerPct;       // LenderOwnerPct (porcentaje del lender)
        
        // Campos de estado
        string status;                // Status (ForSale, Sold, etc.)
        string location;              // City + State
        
        // Campos de control
        uint256 mintedAt;             // Timestamp de mint
        uint256 lastUpdated;          // Última actualización
    }

    mapping(uint256 => LoanMetadata) public loanMetadata;

    // ===== EVENTOS =====
    event LoanNFTMinted(
        uint256 indexed tokenId,
        string loanId,
        address indexed lender,
        uint256 originalBalance,
        uint256 currentBalance,
        uint256 timestamp
    );

    event MetadataUpdated(
        uint256 indexed tokenId,
        string loanId,
        uint256 newBalance,
        string newStatus,
        uint256 timestamp
    );

    event LoanNFTBurned(
        uint256 indexed tokenId,
        string loanId,
        address indexed owner,
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
    /**
     * @notice Mintea un nuevo NFT de loan
     * @param loanId ID del loan
     * @param lenderAddress Dirección del lender
     * @param originalBalance Balance original del loan
     * @param currentBalance Balance actual del loan
     * @param noteRate Tasa de interés (NoteRate del LoanRegistry)
     * @param lenderOwnerPct Porcentaje del lender
     * @param status Estado del loan (ForSale, Sold, etc.)
     * @param location Ciudad + Estado
     */
    function mint(
        string memory loanId,
        address lenderAddress,
        uint256 originalBalance,
        uint256 currentBalance,
        uint256 noteRate,
        uint256 lenderOwnerPct,
        string memory status,
        string memory location
    ) external onlyBridge returns (uint256) {
        require(!isCurrentlyMinted[loanId], "Loan currently has active NFT");
        require(loanIdToTokenId[loanId] == 0, "Loan already has active token");
        require(lenderAddress != address(0), "Invalid lender address");
        require(currentBalance > 0, "Balance must be > 0");
        require(bytes(loanId).length > 0, "LoanId is required");

        _tokenIdCounter++;
        uint256 newTokenId = _tokenIdCounter;

        _safeMint(lenderAddress, newTokenId);

        loanIdToTokenId[loanId] = newTokenId;
        tokenIdToLoanId[newTokenId] = loanId;
        isCurrentlyMinted[loanId] = true;
        totalMintsPerLoan[loanId]++;

        loanMetadata[newTokenId] = LoanMetadata({
            loanId: loanId,
            originalBalance: originalBalance,
            currentBalance: currentBalance,
            noteRate: noteRate,
            lenderOwnerPct: lenderOwnerPct,
            status: status,
            location: location,
            mintedAt: block.timestamp,
            lastUpdated: block.timestamp
        });

        emit LoanNFTMinted(
            newTokenId, 
            loanId, 
            lenderAddress, 
            originalBalance,
            currentBalance,
            block.timestamp
        );

        return newTokenId;
    }

    // ===== BURN FUNCTIONS =====
    /**
     * @notice Quema un NFT de loan por tokenId
     * @param tokenId ID del token a quemar
     */
    function burn(uint256 tokenId) external onlyBridge {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        string memory loanId = tokenIdToLoanId[tokenId];
        address owner = _ownerOf(tokenId);
        
        // Limpiar mappings
        delete loanIdToTokenId[loanId];
        delete tokenIdToLoanId[tokenId];
        delete loanMetadata[tokenId];
        isCurrentlyMinted[loanId] = false;
        
        // Quemar el NFT
        _burn(tokenId);
        
        emit LoanNFTBurned(tokenId, loanId, owner, block.timestamp);
    }

    /**
     * @notice Quema un NFT de loan por loanId
     * @param loanId ID del loan cuyo NFT se quemará
     */
    function burnByLoanId(string memory loanId) external onlyBridge {
        uint256 tokenId = loanIdToTokenId[loanId];
        require(tokenId != 0, "No active token for this loan");
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        address owner = _ownerOf(tokenId);
        
        // Limpiar mappings
        delete loanIdToTokenId[loanId];
        delete tokenIdToLoanId[tokenId];
        delete loanMetadata[tokenId];
        isCurrentlyMinted[loanId] = false;
        
        // Quemar el NFT
        _burn(tokenId);
        
        emit LoanNFTBurned(tokenId, loanId, owner, block.timestamp);
    }

    // ===== UPDATE METADATA =====
    /**
     * @notice Actualiza balance y estado del loan
     * @param tokenId ID del token
     * @param newBalance Nuevo balance
     * @param newStatus Nuevo estado
     */
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

    /**
     * @notice Actualiza toda la metadata del NFT
     * @param tokenId ID del token
     * @param newCurrentBalance Nuevo balance actual
     * @param newNoteRate Nueva tasa de interés
     * @param newLenderOwnerPct Nuevo porcentaje del lender
     * @param newStatus Nuevo estado
     * @param newLocation Nueva ubicación
     */
    function updateFullMetadata(
        uint256 tokenId,
        uint256 newCurrentBalance,
        uint256 newNoteRate,
        uint256 newLenderOwnerPct,
        string memory newStatus,
        string memory newLocation
    ) external onlyBridge {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        LoanMetadata storage metadata = loanMetadata[tokenId];
        
        metadata.currentBalance = newCurrentBalance;
        metadata.noteRate = newNoteRate;
        metadata.lenderOwnerPct = newLenderOwnerPct;
        metadata.status = newStatus;
        metadata.location = newLocation;
        metadata.lastUpdated = block.timestamp;

        emit MetadataUpdated(
            tokenId,
            tokenIdToLoanId[tokenId],
            newCurrentBalance,
            newStatus,
            block.timestamp
        );
    }

    // ===== FUNCIONES DE VISTA =====
    /**
     * @notice Obtiene la metadata completa de un token
     * @param tokenId ID del token
     */
    function getLoanMetadata(uint256 tokenId)
        external
        view
        returns (LoanMetadata memory)
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return loanMetadata[tokenId];
    }

    /**
     * @notice Verifica si un token existe
     * @param tokenId ID del token
     */
    function exists(uint256 tokenId) external view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    /**
     * @notice Obtiene el total de tokens minteados
     */
    function getTotalMinted() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @notice Verifica si un loan está actualmente minteado
     * @param loanId ID del loan
     */
    function isLoanMinted(string memory loanId) external view returns (bool) {
        return isCurrentlyMinted[loanId];
    }
    
    /**
     * @notice Obtiene cuántas veces se ha minteado un loan
     * @param loanId ID del loan
     */
    function getMintCount(string memory loanId) external view returns (uint256) {
        return totalMintsPerLoan[loanId];
    }
    
    /**
     * @notice Verifica si un loan puede ser minteado
     * @param loanId ID del loan
     */
    function canMint(string memory loanId) external view returns (bool) {
        return !isCurrentlyMinted[loanId];
    }

    /**
     * @notice Obtiene el balance actual de un loan por loanId
     * @param loanId ID del loan
     */
    function getCurrentBalance(string memory loanId) external view returns (uint256) {
        uint256 tokenId = loanIdToTokenId[loanId];
        require(tokenId != 0, "Loan not minted");
        return loanMetadata[tokenId].currentBalance;
    }

    /**
     * @notice Obtiene el balance original de un loan por loanId
     * @param loanId ID del loan
     */
    function getOriginalBalance(string memory loanId) external view returns (uint256) {
        uint256 tokenId = loanIdToTokenId[loanId];
        require(tokenId != 0, "Loan not minted");
        return loanMetadata[tokenId].originalBalance;
    }

    // ===== TOKEN URI =====
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        return
            string(
                abi.encodePacked(
                    _baseURI(),
                    tokenIdToLoanId[tokenId]
                )
            );
    }

    // ===== OVERRIDE PARA SEGURIDAD =====
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

        // Permitir transfers normales
        return super._update(to, tokenId, auth);
    }

    // ===== CONFIGURACIÓN DE BASE URI =====
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
