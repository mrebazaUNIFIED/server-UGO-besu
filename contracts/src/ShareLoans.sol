// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ShareLoans
 * @dev Gestiona el compartir acceso a accounts (loans) entre usuarios
 * 
 * Funcionalidad:
 * - Un usuario puede compartir acceso de lectura a sus accounts (loans)
 * - Múltiples usuarios pueden tener acceso
 * - Se puede activar/desactivar el compartir
 * - Se mantiene un registro de quién comparte qué con quién
 */
contract ShareLoans is Ownable {
    
    struct ShareAsset {
        string key;                  // ID único del share (ej: "share_mike_001")
        address ownerAddress;        // Dueño del account (quien comparte)
        string ownerUserId;          // UserID del dueño
        string[] accounts;           // IDs de los loans/accounts compartidos
        string name;                 // Nombre del share
        address[] sharedWith;        // Addresses con acceso
        string[] sharedWithUserIds;  // UserIDs con acceso (para búsqueda)
        bool isActive;               // Estado del share
        uint256 createdAt;           // Timestamp de creación
        uint256 updatedAt;           // Timestamp de última actualización
    }
    
    // Mappings
    mapping(string => ShareAsset) private shareAssets;          
    mapping(address => string[]) private userShares;             
    mapping(address => string[]) private sharedWithMe;          
    mapping(string => mapping(address => bool)) private hasAccess; 
    
    string[] private allShareKeys;
    
    // Events
    event ShareCreated(
        string indexed key,
        address indexed owner,
        uint256 accountsLength,
        uint256 timestamp
    );
    
    event ShareUpdated(
        string indexed key,
        address indexed owner,
        uint256 sharedWithCount,
        uint256 timestamp
    );
    
    event ShareDisabled(
        string indexed key,
        address indexed owner,
        uint256 timestamp
    );
    
    event ShareEnabled(
        string indexed key,
        address indexed owner,
        uint256 timestamp
    );
    
    event AccessGranted(
        string indexed key,
        address indexed grantedTo,
        string grantedToUserId,
        uint256 timestamp
    );
    
    event AccessRevoked(
        string indexed key,
        address indexed revokedFrom,
        uint256 timestamp
    );
    
    constructor(address initialOwner) Ownable(initialOwner) {}
    
    /**
     * @dev Crea un nuevo share asset
     * @param key ID único del share
     * @param ownerUserId UserID del dueño
     * @param accounts IDs de los loans/accounts a compartir
     * @param name Nombre del share
     * @param sharedWithAddresses Addresses con acceso
     * @param sharedWithUserIds UserIDs con acceso (mismo orden que addresses)
     */
    function createShareAsset(
        string memory key,
        string memory ownerUserId,
        string[] memory accounts,
        string memory name,
        address[] memory sharedWithAddresses,
        string[] memory sharedWithUserIds
    ) public returns (bool) {
        require(bytes(key).length > 0, "Key required");
        require(bytes(ownerUserId).length > 0, "Owner UserID required");
        require(accounts.length > 0, "Accounts required");
        require(bytes(shareAssets[key].key).length == 0, "Share key already exists");
        require(
            sharedWithAddresses.length == sharedWithUserIds.length,
            "Addresses and UserIDs length mismatch"
        );
        
        uint256 currentTime = block.timestamp;
        
        ShareAsset storage newShare = shareAssets[key];
        newShare.key = key;
        newShare.ownerAddress = msg.sender;
        newShare.ownerUserId = ownerUserId;
        newShare.accounts = accounts;
        newShare.name = name;
        newShare.sharedWith = sharedWithAddresses;
        newShare.sharedWithUserIds = sharedWithUserIds;
        newShare.isActive = true;
        newShare.createdAt = currentTime;
        newShare.updatedAt = currentTime;
        
        // Actualizar índices
        userShares[msg.sender].push(key);
        allShareKeys.push(key);
        
        // Crear índice de acceso
        for (uint256 i = 0; i < sharedWithAddresses.length; i++) {
            hasAccess[key][sharedWithAddresses[i]] = true;
            sharedWithMe[sharedWithAddresses[i]].push(key);
            
            emit AccessGranted(key, sharedWithAddresses[i], sharedWithUserIds[i], currentTime);
        }
        
        emit ShareCreated(key, msg.sender, accounts.length, currentTime);
        return true;
    }
    
    /**
     * @dev Actualiza las cuentas con acceso a un share
     * @param key ID del share
     * @param newSharedWithAddresses Nuevas addresses con acceso
     * @param newSharedWithUserIds Nuevos UserIDs con acceso
     */
    function updateShareAssetAccounts(
        string memory key,
        address[] memory newSharedWithAddresses,
        string[] memory newSharedWithUserIds
    ) public returns (bool) {
        require(bytes(shareAssets[key].key).length > 0, "Share does not exist");
        require(shareAssets[key].ownerAddress == msg.sender, "Not the owner");
        require(
            newSharedWithAddresses.length == newSharedWithUserIds.length,
            "Addresses and UserIDs length mismatch"
        );
        
        ShareAsset storage share = shareAssets[key];
        
        // Remover accesos antiguos
        for (uint256 i = 0; i < share.sharedWith.length; i++) {
            hasAccess[key][share.sharedWith[i]] = false;
            _removeFromSharedWithMe(share.sharedWith[i], key);
            
            emit AccessRevoked(key, share.sharedWith[i], block.timestamp);
        }
        
        // Agregar nuevos accesos
        share.sharedWith = newSharedWithAddresses;
        share.sharedWithUserIds = newSharedWithUserIds;
        share.updatedAt = block.timestamp;
        
        for (uint256 i = 0; i < newSharedWithAddresses.length; i++) {
            hasAccess[key][newSharedWithAddresses[i]] = true;
            sharedWithMe[newSharedWithAddresses[i]].push(key);
            
            emit AccessGranted(key, newSharedWithAddresses[i], newSharedWithUserIds[i], block.timestamp);
        }
        
        emit ShareUpdated(key, msg.sender, newSharedWithAddresses.length, block.timestamp);
        return true;
    }
    
    /**
     * @dev Deshabilita un share (no lo elimina)
     */
    function disableShareAsset(string memory key) public returns (bool) {
        require(bytes(shareAssets[key].key).length > 0, "Share does not exist");
        require(shareAssets[key].ownerAddress == msg.sender, "Not the owner");
        require(shareAssets[key].isActive, "Already disabled");
        
        shareAssets[key].isActive = false;
        shareAssets[key].updatedAt = block.timestamp;
        
        emit ShareDisabled(key, msg.sender, block.timestamp);
        return true;
    }
    
    /**
     * @dev Re-habilita un share
     */
    function enableShareAsset(string memory key) public returns (bool) {
        require(bytes(shareAssets[key].key).length > 0, "Share does not exist");
        require(shareAssets[key].ownerAddress == msg.sender, "Not the owner");
        require(!shareAssets[key].isActive, "Already enabled");
        
        shareAssets[key].isActive = true;
        shareAssets[key].updatedAt = block.timestamp;
        
        emit ShareEnabled(key, msg.sender, block.timestamp);
        return true;
    }
    
    /**
     * @dev Obtiene un share asset por key
     */
    function readShareAsset(string memory key) public view returns (ShareAsset memory) {
        require(bytes(shareAssets[key].key).length > 0, "Share does not exist");
        return shareAssets[key];
    }
    
    /**
     * @dev Verifica si un usuario tiene acceso a un share
     */
    function checkUserAccess(string memory key, address userAddress) 
        public 
        view 
        returns (bool hasAccessValue, string memory reason) 
    {
        if (bytes(shareAssets[key].key).length == 0) {
            return (false, "Share does not exist");
        }
        
        if (!shareAssets[key].isActive) {
            return (false, "Share is disabled");
        }
        
        if (shareAssets[key].ownerAddress == userAddress) {
            return (true, "Owner has full access");
        }
        
        if (hasAccess[key][userAddress]) {
            return (true, "Access granted");
        }
        
        return (false, "No access");
    }
    
    /**
     * @dev Obtiene todos los shares creados por un usuario
     */
    function querySharedByUser(address userAddress) 
        public 
        view 
        returns (ShareAsset[] memory) 
    {
        string[] memory keys = userShares[userAddress];
        ShareAsset[] memory shares = new ShareAsset[](keys.length);
        
        for (uint256 i = 0; i < keys.length; i++) {
            shares[i] = shareAssets[keys[i]];
        }
        
        return shares;
    }
    
    /**
     * @dev Obtiene todos los shares compartidos CON un usuario
     */
    function querySharedWithMe(address userAddress) 
        public 
        view 
        returns (ShareAsset[] memory) 
    {
        string[] memory keys = sharedWithMe[userAddress];
        uint256 activeCount = 0;
        
        // Contar activos
        for (uint256 i = 0; i < keys.length; i++) {
            if (shareAssets[keys[i]].isActive) {
                activeCount++;
            }
        }
        
        ShareAsset[] memory shares = new ShareAsset[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < keys.length; i++) {
            if (shareAssets[keys[i]].isActive) {
                shares[index] = shareAssets[keys[i]];
                index++;
            }
        }
        
        return shares;
    }
    
    /**
     * @dev Obtiene todos los share assets (admin)
     */
    function queryAllShareAssets() public view onlyOwner returns (ShareAsset[] memory) {
        ShareAsset[] memory shares = new ShareAsset[](allShareKeys.length);
        
        for (uint256 i = 0; i < allShareKeys.length; i++) {
            shares[i] = shareAssets[allShareKeys[i]];
        }
        
        return shares;
    }
    
    /**
     * @dev Verifica si un share existe
     */
    function shareAssetExists(string memory key) public view returns (bool) {
        return bytes(shareAssets[key].key).length > 0;
    }
    
    /**
     * @dev Helper para remover de sharedWithMe array
     */
    function _removeFromSharedWithMe(address user, string memory key) private {
        string[] storage keys = sharedWithMe[user];
        for (uint256 i = 0; i < keys.length; i++) {
            if (keccak256(bytes(keys[i])) == keccak256(bytes(key))) {
                keys[i] = keys[keys.length - 1];
                keys.pop();
                break;
            }
        }
    }
}