// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Portfolio
 * @dev Gestiona certificados de portafolio de loans
 * 
 * Funcionalidad:
 * - Un certificado agrupa loans de un usuario
 * - Calcula valor total del portafolio
 * - Mantiene versiones del certificado
 * - Solo el owner puede generar/actualizar certificados
 */
contract Portfolio is Ownable {
    
    struct PortfolioCertificate {
        string id;                   // ID del certificado (ej: "cert-mike_001")
        string userId;               // UserID del dueño
        address userAddress;         // Address del dueño
        string txId;                 // Transaction ID (hash)
        string[] loanIds;            // Array de IDs de loans
        uint256 loansCount;          // Cantidad de loans
        uint256 totalPrincipal;      // Suma total de principal (en Wei)
        uint256 createdAt;           // Timestamp de creación
        uint256 lastUpdatedAt;       // Timestamp de última actualización
        uint256 version;             // Versión del certificado
        bool exists;                 // Flag de existencia
    }
    
    // Mappings
    mapping(string => PortfolioCertificate) private certificates;  // userId → Certificate
    mapping(address => string) private addressToUserId;            // address → userId
    mapping(string => bool) private certificateExists;             // userId → exists
    
    string[] private allUserIds;
    
    // Events
    event CertificateCreated(
        string indexed userId,
        address indexed userAddress,
        uint256 loansCount,
        uint256 totalPrincipal,
        uint256 timestamp
    );
    
    event CertificateUpdated(
        string indexed userId,
        address indexed userAddress,
        uint256 loansCount,
        uint256 totalPrincipal,
        uint256 version,
        uint256 timestamp
    );
    
    constructor(address initialOwner) Ownable(initialOwner) {}
    
    /**
     * @dev Crea un nuevo certificado de portafolio
     * @param userId UserID del dueño
     * @param userAddress Address del dueño
     * @param loanIds Array de IDs de loans
     * @param totalPrincipal Suma total del principal (en Wei)
     */
    function createPortfolioCertificate(
        string memory userId,
        address userAddress,
        string[] memory loanIds,
        uint256 totalPrincipal
    ) public onlyOwner returns (bool) {
        require(bytes(userId).length > 0, "UserId required");
        require(userAddress != address(0), "Valid address required");
        require(loanIds.length > 0, "At least one loan required");
        require(!certificateExists[userId], "Certificate already exists");
        
        uint256 currentTime = block.timestamp;
        string memory certId = string(abi.encodePacked("cert-", userId));
        
        PortfolioCertificate storage cert = certificates[userId];
        cert.id = certId;
        cert.userId = userId;
        cert.userAddress = userAddress;
        cert.txId = _toHexString(uint256(uint160(msg.sender)), 20);
        cert.loanIds = loanIds;
        cert.loansCount = loanIds.length;
        cert.totalPrincipal = totalPrincipal;
        cert.createdAt = currentTime;
        cert.lastUpdatedAt = currentTime;
        cert.version = 1;
        cert.exists = true;
        
        certificateExists[userId] = true;
        addressToUserId[userAddress] = userId;
        allUserIds.push(userId);
        
        emit CertificateCreated(
            userId,
            userAddress,
            loanIds.length,
            totalPrincipal,
            currentTime
        );
        
        return true;
    }
    
    /**
     * @dev Actualiza un certificado existente
     * @param userId UserID del dueño
     * @param loanIds Nuevos IDs de loans
     * @param totalPrincipal Nuevo total del principal
     */
    function updatePortfolioCertificate(
        string memory userId,
        string[] memory loanIds,
        uint256 totalPrincipal
    ) public onlyOwner returns (bool) {
        require(bytes(userId).length > 0, "UserId required");
        require(loanIds.length > 0, "At least one loan required");
        require(certificateExists[userId], "Certificate does not exist");
        
        PortfolioCertificate storage cert = certificates[userId];
        
        uint256 currentTime = block.timestamp;
        
        cert.txId = _toHexString(uint256(uint160(msg.sender)), 20);
        cert.loanIds = loanIds;
        cert.loansCount = loanIds.length;
        cert.totalPrincipal = totalPrincipal;
        cert.lastUpdatedAt = currentTime;
        cert.version += 1;
        
        emit CertificateUpdated(
            userId,
            cert.userAddress,
            loanIds.length,
            totalPrincipal,
            cert.version,
            currentTime
        );
        
        return true;
    }
    
    /**
     * @dev Obtiene un certificado por userId
     */
    function getPortfolioCertificate(string memory userId) 
        public 
        view 
        returns (PortfolioCertificate memory) 
    {
        require(certificateExists[userId], "Certificate does not exist");
        return certificates[userId];
    }
    
    /**
     * @dev Obtiene un certificado por address
     */
    function getPortfolioCertificateByAddress(address userAddress) 
        public 
        view 
        returns (PortfolioCertificate memory) 
    {
        string memory userId = addressToUserId[userAddress];
        require(bytes(userId).length > 0, "No certificate for this address");
        require(certificateExists[userId], "Certificate does not exist");
        return certificates[userId];
    }
    
    /**
     * @dev Obtiene solo el TxId de un certificado
     */
    function getPortfolioCertificateTxId(string memory userId) 
        public 
        view 
        returns (string memory) 
    {
        require(certificateExists[userId], "Certificate does not exist");
        return certificates[userId].txId;
    }
    
    /**
     * @dev Obtiene todos los certificados
     */
    function getAllCertificates() 
        public 
        view 
        returns (PortfolioCertificate[] memory) 
    {
        PortfolioCertificate[] memory certs = new PortfolioCertificate[](allUserIds.length);
        
        for (uint256 i = 0; i < allUserIds.length; i++) {
            certs[i] = certificates[allUserIds[i]];
        }
        
        return certs;
    }
    
    /**
     * @dev Verifica si existe un certificado para un userId
     */
    function portfolioCertificateExists(string memory userId) 
        public 
        view 
        returns (bool) 
    {
        return certificateExists[userId];
    }
    
    /**
     * @dev Obtiene estadísticas de un certificado
     */
    function getCertificateStats(string memory userId) 
        public 
        view 
        returns (
            uint256 loansCount,
            uint256 totalPrincipal,
            uint256 version,
            uint256 lastUpdated
        ) 
    {
        require(certificateExists[userId], "Certificate does not exist");
        
        PortfolioCertificate memory cert = certificates[userId];
        return (
            cert.loansCount,
            cert.totalPrincipal,
            cert.version,
            cert.lastUpdatedAt
        );
    }
    
    /**
     * @dev Helper para convertir address a string hex
     */
    function _toHexString(uint256 value, uint256 length) 
        private 
        pure 
        returns (string memory) 
    {
        bytes memory buffer = new bytes(2 * length + 2);
        buffer[0] = "0";
        buffer[1] = "x";
        for (uint256 i = 2 * length + 1; i > 1; --i) {
            uint256 digit = value & 0xf;
            buffer[i] = bytes1(uint8(digit < 10 ? 48 + digit : 87 + digit));
            value >>= 4;
        }
        return string(buffer);
    }
}