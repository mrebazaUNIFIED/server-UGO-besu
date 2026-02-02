// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract UserRegistry is Ownable {
    
    struct User {
        string userId;
        string name;
        string organization;
        string role;
        address walletAddress;
        uint256 registeredAt;
        bool isActive;
    }
    
    mapping(address => User) public users;
    mapping(string => address) public userIdToAddress;
    mapping(string => address[]) private organizationUsers;
    address[] public allUsers;
    
    uint256 public activeUsersCount;
    
    event UserRegistered(address indexed walletAddress, string userId, string name, string organization, uint256 timestamp);
    event UserUpdated(address indexed walletAddress, string userId, uint256 timestamp);
    event UserDeactivated(address indexed walletAddress, string userId, uint256 timestamp);
    event UserReactivated(address indexed walletAddress, string userId, uint256 timestamp);
    
    constructor(address initialOwner) Ownable(initialOwner) {}
    
    function registerUser(
        address walletAddress,
        string memory userId,
        string memory name,
        string memory organization,
        string memory role
    ) public onlyOwner returns (bool) {
        require(bytes(users[walletAddress].userId).length == 0, "Wallet already registered");
        require(userIdToAddress[userId] == address(0), "User ID already taken");
        require(bytes(userId).length > 0 && bytes(userId).length <= 100, "User ID invalid length");
        require(bytes(name).length > 0 && bytes(name).length <= 100, "Name invalid length");
        require(bytes(organization).length <= 100, "Organization invalid length");
        require(bytes(role).length <= 50, "Role invalid length");
        
        users[walletAddress] = User({
            userId: userId,
            name: name,
            organization: organization,
            role: role,
            walletAddress: walletAddress,
            registeredAt: block.timestamp,
            isActive: true
        });
        
        userIdToAddress[userId] = walletAddress;
        organizationUsers[organization].push(walletAddress);
        allUsers.push(walletAddress);
        activeUsersCount++;
        
        emit UserRegistered(walletAddress, userId, name, organization, block.timestamp);
        return true;
    }
    
    function updateUser(address walletAddress, string memory name, string memory role) public onlyOwner returns (bool) {
        require(users[walletAddress].isActive, "User does not exist");
        require(bytes(name).length > 0 && bytes(name).length <= 100, "Name invalid length");
        require(bytes(role).length <= 50, "Role invalid length");
        users[walletAddress].name = name;
        users[walletAddress].role = role;
        emit UserUpdated(walletAddress, users[walletAddress].userId, block.timestamp);
        return true;
    }
    
    function deactivateUser(address walletAddress) public onlyOwner returns (bool) {
        require(users[walletAddress].isActive, "User already inactive");
        users[walletAddress].isActive = false;
        activeUsersCount--;
        emit UserDeactivated(walletAddress, users[walletAddress].userId, block.timestamp);
        return true;
    }
    
    function reactivateUser(address walletAddress) public onlyOwner returns (bool) {
        require(!users[walletAddress].isActive, "User already active");
        users[walletAddress].isActive = true;
        activeUsersCount++;
        emit UserReactivated(walletAddress, users[walletAddress].userId, block.timestamp);
        return true;
    }
    
    function getUser(address walletAddress) public view returns (User memory) {
        require(users[walletAddress].isActive, "User not found");
        return users[walletAddress];
    }
    
    function getUserByUserId(string memory userId) public view returns (User memory) {
        address userAddress = userIdToAddress[userId];
        require(userAddress != address(0) && users[userAddress].isActive, "User not found");
        return users[userAddress];
    }
    
    function getUsersByOrganization(string memory organization, uint256 start, uint256 limit) public view returns (User[] memory) {
        address[] memory orgAddresses = organizationUsers[organization];
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < orgAddresses.length; i++) {
            if (users[orgAddresses[i]].isActive) activeCount++;
        }
        
        uint256 end = start + limit;
        if (end > activeCount) end = activeCount;
        if (start >= activeCount) return new User[](0);
        
        User[] memory orgUsers = new User[](end - start);
        uint256 index = 0;
        uint256 collected = 0;
        
        for (uint256 i = 0; i < orgAddresses.length && collected < end; i++) {
            if (users[orgAddresses[i]].isActive) {
                if (index >= start) {
                    orgUsers[collected - start] = users[orgAddresses[i]];
                    collected++;
                }
                index++;
            }
        }
        
        return orgUsers;
    }
    
    function isUserActive(address walletAddress) public view returns (bool) {
        return users[walletAddress].isActive;
    }
    
    function userRegistered(address walletAddress) public view returns (bool) {
        return bytes(users[walletAddress].userId).length > 0;
    }
    
    function getTotalUsers() public view returns (uint256) {
        return allUsers.length;
    }
    
    function getActiveUsersCount() public view returns (uint256) {
        return activeUsersCount;
    }
}