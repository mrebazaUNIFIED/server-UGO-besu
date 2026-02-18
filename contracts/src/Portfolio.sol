// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title Portfolio - UPGRADEABLE (UUPS)
 * @notice Versión upgradeable de Portfolio usando patrón UUPS.
 *         El storage es idéntico al contrato original para permitir migración.
 * @dev Para upgradear: upgrades.upgradeProxy(PROXY_ADDRESS, PortfolioV2)
 */
contract Portfolio is Initializable, OwnableUpgradeable, UUPSUpgradeable {

    struct PortfolioCertificate {
        string id;
        string userId;
        address userAddress;
        string txId;
        string[] loanIds;
        uint256 loansCount;
        uint256 totalPrincipal;
        uint256 createdAt;
        uint256 lastUpdatedAt;
        uint256 version;
        bool exists;
    }

    // ⚠️ IMPORTANTE: El orden de estas variables NUNCA debe cambiar en upgrades futuros.
    // Solo se pueden AGREGAR nuevas variables al FINAL.
    mapping(string => PortfolioCertificate) private certificates;
    mapping(address => string) private addressToUserId;
    mapping(string => bool) private certificateExists;
    string[] private allUserIds;

    // ===== EVENTOS =====
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

    // ===== CONSTRUCTOR (deshabilitado para proxies) =====
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ===== INICIALIZADOR =====
    function initialize(address initialOwner) public initializer {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
    }

    // ===== REQUERIDO POR UUPS =====
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ===== FUNCIONES (idénticas al original) =====

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

        emit CertificateCreated(userId, userAddress, loanIds.length, totalPrincipal, currentTime);
        return true;
    }

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

        emit CertificateUpdated(userId, cert.userAddress, loanIds.length, totalPrincipal, cert.version, currentTime);
        return true;
    }

    function getPortfolioCertificate(string memory userId) public view returns (PortfolioCertificate memory) {
        require(certificateExists[userId], "Certificate does not exist");
        return certificates[userId];
    }

    function getPortfolioCertificateByAddress(address userAddress) public view returns (PortfolioCertificate memory) {
        string memory userId = addressToUserId[userAddress];
        require(bytes(userId).length > 0, "No certificate for this address");
        require(certificateExists[userId], "Certificate does not exist");
        return certificates[userId];
    }

    function getPortfolioCertificateTxId(string memory userId) public view returns (string memory) {
        require(certificateExists[userId], "Certificate does not exist");
        return certificates[userId].txId;
    }

    function getAllCertificates() public view returns (PortfolioCertificate[] memory) {
        PortfolioCertificate[] memory certs = new PortfolioCertificate[](allUserIds.length);
        for (uint256 i = 0; i < allUserIds.length; i++) {
            certs[i] = certificates[allUserIds[i]];
        }
        return certs;
    }

    function portfolioCertificateExists(string memory userId) public view returns (bool) {
        return certificateExists[userId];
    }

    function getCertificateStats(string memory userId)
        public
        view
        returns (
            uint256 loansCount,
            uint256 totalPrincipal,
            uint256 version_,
            uint256 lastUpdated
        )
    {
        require(certificateExists[userId], "Certificate does not exist");
        PortfolioCertificate memory cert = certificates[userId];
        return (cert.loansCount, cert.totalPrincipal, cert.version, cert.lastUpdatedAt);
    }

    function _toHexString(uint256 value, uint256 length) private pure returns (string memory) {
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

    // ===== FUNCIÓN DE VERSIÓN =====
    function version() public pure returns (string memory) {
        return "1.0.0";
    }
}
