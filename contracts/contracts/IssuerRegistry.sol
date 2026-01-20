// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract IssuerRegistry {
    struct Issuer {
        string name;
        string did;
        address walletAddress;
        bool isVerified;
        uint256 registeredAt;
        uint256 verifiedAt;
        string metadataURI;
    }

    // State variables
    address public admin;
    mapping(address => Issuer) public issuers;
    mapping(string => address) public didToIssuer; // DID to wallet address mapping
    address[] public issuerAddresses;
    
    // Events
    event IssuerRegistered(
        address indexed issuerAddress,
        string name,
        string did,
        uint256 timestamp
    );
    
    event IssuerVerified(
        address indexed issuerAddress,
        address verifiedBy,
        uint256 timestamp
    );
    
    event IssuerRemoved(
        address indexed issuerAddress,
        address removedBy,
        uint256 timestamp
    );
    
    event AdminChanged(
        address indexed previousAdmin,
        address indexed newAdmin
    );
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier onlyVerifiedIssuer() {
        require(
            issuers[msg.sender].isVerified,
            "Only verified issuers can perform this action"
        );
        _;
    }
    
    // Constructor
    constructor() {
        admin = msg.sender;
    }
    
    // Register a new issuer
    function registerIssuer(
        string memory _name,
        string memory _did,
        string memory _metadataURI
    ) external {
        require(
            issuers[msg.sender].walletAddress == address(0),
            "Issuer already registered"
        );
        require(
            didToIssuer[_did] == address(0),
            "DID already registered"
        );
        
        issuers[msg.sender] = Issuer({
            name: _name,
            did: _did,
            walletAddress: msg.sender,
            isVerified: false,
            registeredAt: block.timestamp,
            verifiedAt: 0,
            metadataURI: _metadataURI
        });
        
        didToIssuer[_did] = msg.sender;
        issuerAddresses.push(msg.sender);
        
        emit IssuerRegistered(
            msg.sender,
            _name,
            _did,
            block.timestamp
        );
    }
    
    // Verify an issuer (admin only)
    function verifyIssuer(address _issuerAddress) external onlyAdmin {
        require(
            issuers[_issuerAddress].walletAddress != address(0),
            "Issuer not registered"
        );
        require(
            !issuers[_issuerAddress].isVerified,
            "Issuer already verified"
        );
        
        issuers[_issuerAddress].isVerified = true;
        issuers[_issuerAddress].verifiedAt = block.timestamp;
        
        emit IssuerVerified(
            _issuerAddress,
            msg.sender,
            block.timestamp
        );
    }
    
    // Remove an issuer (admin only)
    function removeIssuer(address _issuerAddress) external onlyAdmin {
        require(
            issuers[_issuerAddress].walletAddress != address(0),
            "Issuer not registered"
        );
        
        // Remove DID mapping
        string memory did = issuers[_issuerAddress].did;
        delete didToIssuer[did];
        
        // Remove from addresses array
        for (uint256 i = 0; i < issuerAddresses.length; i++) {
            if (issuerAddresses[i] == _issuerAddress) {
                issuerAddresses[i] = issuerAddresses[issuerAddresses.length - 1];
                issuerAddresses.pop();
                break;
            }
        }
        
        // Remove issuer
        delete issuers[_issuerAddress];
        
        emit IssuerRemoved(
            _issuerAddress,
            msg.sender,
            block.timestamp
        );
    }
    
    // Check if an address is a verified issuer
    function isVerifiedIssuer(address _issuerAddress) external view returns (bool) {
        return issuers[_issuerAddress].isVerified;
    }
    
    // Get issuer by DID
    function getIssuerByDID(string memory _did) external view returns (Issuer memory) {
        address issuerAddress = didToIssuer[_did];
        require(issuerAddress != address(0), "No issuer found for this DID");
        return issuers[issuerAddress];
    }
    
    // Get all verified issuers
    function getAllVerifiedIssuers() external view returns (Issuer[] memory) {
        uint256 count = 0;
        
        // Count verified issuers
        for (uint256 i = 0; i < issuerAddresses.length; i++) {
            if (issuers[issuerAddresses[i]].isVerified) {
                count++;
            }
        }
        
        // Create array
        Issuer[] memory verifiedIssuers = new Issuer[](count);
        uint256 index = 0;
        
        // Populate array
        for (uint256 i = 0; i < issuerAddresses.length; i++) {
            address issuerAddr = issuerAddresses[i];
            if (issuers[issuerAddr].isVerified) {
                verifiedIssuers[index] = issuers[issuerAddr];
                index++;
            }
        }
        
        return verifiedIssuers;
    }
    
    // Get total issuer count
    function getIssuerCount() external view returns (uint256) {
        return issuerAddresses.length;
    }
    
    // Update issuer metadata
    function updateIssuerMetadata(string memory _metadataURI) external onlyVerifiedIssuer {
        issuers[msg.sender].metadataURI = _metadataURI;
    }
    
    // Transfer admin rights
    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid address");
        emit AdminChanged(admin, _newAdmin);
        admin = _newAdmin;
    }
    
    // Get issuer details
    function getIssuerDetails(address _issuerAddress) external view returns (
        string memory name,
        string memory did,
        bool isVerified,
        uint256 registeredAt,
        uint256 verifiedAt,
        string memory metadataURI
    ) {
        Issuer memory issuer = issuers[_issuerAddress];
        require(issuer.walletAddress != address(0), "Issuer not found");
        
        return (
            issuer.name,
            issuer.did,
            issuer.isVerified,
            issuer.registeredAt,
            issuer.verifiedAt,
            issuer.metadataURI
        );
    }
}