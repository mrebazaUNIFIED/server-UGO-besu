// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title ShareLoans - UPGRADEABLE (UUPS)
 * @notice Versión upgradeable de ShareLoans usando patrón UUPS.
 *         El storage es idéntico al contrato original para permitir migración.
 * @dev Para upgradear: upgrades.upgradeProxy(PROXY_ADDRESS, ShareLoansV2)
 */
contract ShareLoans is Initializable, OwnableUpgradeable, UUPSUpgradeable {

    struct ShareAsset {
        string key;
        address ownerAddress;
        string ownerUserId;
        string[] accounts;
        string name;
        address[] sharedWith;
        string[] sharedWithUserIds;
        bool isActive;
        uint256 createdAt;
        uint256 updatedAt;
    }

    // ⚠️ IMPORTANTE: El orden de estas variables NUNCA debe cambiar en upgrades futuros.
    // Solo se pueden AGREGAR nuevas variables al FINAL.
    mapping(string => ShareAsset) private shareAssets;
    mapping(address => string[]) private userShares;
    mapping(address => string[]) private sharedWithMe;
    mapping(string => mapping(address => bool)) private hasAccess;
    string[] private allShareKeys;

    // ===== EVENTOS =====
    event ShareCreated(string indexed key, address indexed owner, uint256 accountsLength, uint256 timestamp);
    event ShareUpdated(string indexed key, address indexed owner, uint256 sharedWithCount, uint256 timestamp);
    event ShareDisabled(string indexed key, address indexed owner, uint256 timestamp);
    event ShareEnabled(string indexed key, address indexed owner, uint256 timestamp);
    event AccessGranted(string indexed key, address indexed grantedTo, string grantedToUserId, uint256 timestamp);
    event AccessRevoked(string indexed key, address indexed revokedFrom, uint256 timestamp);

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
        require(sharedWithAddresses.length == sharedWithUserIds.length, "Addresses and UserIDs length mismatch");

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

        userShares[msg.sender].push(key);
        allShareKeys.push(key);

        for (uint256 i = 0; i < sharedWithAddresses.length; i++) {
            hasAccess[key][sharedWithAddresses[i]] = true;
            sharedWithMe[sharedWithAddresses[i]].push(key);
            emit AccessGranted(key, sharedWithAddresses[i], sharedWithUserIds[i], currentTime);
        }

        emit ShareCreated(key, msg.sender, accounts.length, currentTime);
        return true;
    }

    function updateShareAssetAccounts(
        string memory key,
        address[] memory newSharedWithAddresses,
        string[] memory newSharedWithUserIds
    ) public returns (bool) {
        require(bytes(shareAssets[key].key).length > 0, "Share does not exist");
        require(shareAssets[key].ownerAddress == msg.sender, "Not the owner");
        require(newSharedWithAddresses.length == newSharedWithUserIds.length, "Addresses and UserIDs length mismatch");

        ShareAsset storage share = shareAssets[key];

        for (uint256 i = 0; i < share.sharedWith.length; i++) {
            hasAccess[key][share.sharedWith[i]] = false;
            _removeFromSharedWithMe(share.sharedWith[i], key);
            emit AccessRevoked(key, share.sharedWith[i], block.timestamp);
        }

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

    function disableShareAsset(string memory key) public returns (bool) {
        require(bytes(shareAssets[key].key).length > 0, "Share does not exist");
        require(shareAssets[key].ownerAddress == msg.sender, "Not the owner");
        require(shareAssets[key].isActive, "Already disabled");
        shareAssets[key].isActive = false;
        shareAssets[key].updatedAt = block.timestamp;
        emit ShareDisabled(key, msg.sender, block.timestamp);
        return true;
    }

    function enableShareAsset(string memory key) public returns (bool) {
        require(bytes(shareAssets[key].key).length > 0, "Share does not exist");
        require(shareAssets[key].ownerAddress == msg.sender, "Not the owner");
        require(!shareAssets[key].isActive, "Already enabled");
        shareAssets[key].isActive = true;
        shareAssets[key].updatedAt = block.timestamp;
        emit ShareEnabled(key, msg.sender, block.timestamp);
        return true;
    }

    function readShareAsset(string memory key) public view returns (ShareAsset memory) {
        require(bytes(shareAssets[key].key).length > 0, "Share does not exist");
        return shareAssets[key];
    }

    function checkUserAccess(string memory key, address userAddress)
        public
        view
        returns (bool hasAccessValue, string memory reason)
    {
        if (bytes(shareAssets[key].key).length == 0) return (false, "Share does not exist");
        if (!shareAssets[key].isActive) return (false, "Share is disabled");
        if (shareAssets[key].ownerAddress == userAddress) return (true, "Owner has full access");
        if (hasAccess[key][userAddress]) return (true, "Access granted");
        return (false, "No access");
    }

    function querySharedByUser(address userAddress) public view returns (ShareAsset[] memory) {
        string[] memory keys = userShares[userAddress];
        ShareAsset[] memory shares = new ShareAsset[](keys.length);
        for (uint256 i = 0; i < keys.length; i++) {
            shares[i] = shareAssets[keys[i]];
        }
        return shares;
    }

    function querySharedWithMe(address userAddress) public view returns (ShareAsset[] memory) {
        string[] memory keys = sharedWithMe[userAddress];
        uint256 activeCount = 0;
        for (uint256 i = 0; i < keys.length; i++) {
            if (shareAssets[keys[i]].isActive) activeCount++;
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

    function queryAllShareAssets() public view onlyOwner returns (ShareAsset[] memory) {
        ShareAsset[] memory shares = new ShareAsset[](allShareKeys.length);
        for (uint256 i = 0; i < allShareKeys.length; i++) {
            shares[i] = shareAssets[allShareKeys[i]];
        }
        return shares;
    }

    function shareAssetExists(string memory key) public view returns (bool) {
        return bytes(shareAssets[key].key).length > 0;
    }

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

    // ===== FUNCIÓN DE VERSIÓN =====
    function version() public pure returns (string memory) {
        return "1.0.0";
    }
}
