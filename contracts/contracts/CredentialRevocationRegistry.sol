// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CredentialRevocationRegistry {
    struct Revocation {
        bytes32 credentialHash;
        address revokedBy;
        uint256 revokedAt;
        string reason;
        bytes32 revocationProof;
    }
    
    // State variables
    address public admin;
    address public credentialRegistry;
    
    // Mappings
    mapping(bytes32 => Revocation) public revocations;
    mapping(address => bytes32[]) public issuerRevocations;
    bytes32[] public allRevocationHashes;
    
    // Events
    event CredentialRevoked(
        bytes32 indexed credentialHash,
        address indexed revokedBy,
        uint256 revokedAt,
        string reason,
        bytes32 revocationProof
    );
    
    event RevocationUpdated(
        bytes32 indexed credentialHash,
        address indexed updatedBy,
        uint256 updatedAt,
        string newReason
    );
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier onlyCredentialRegistry() {
        require(msg.sender == credentialRegistry, "Only credential registry can perform this action");
        _;
    }
    
    // Constructor
    constructor(address _credentialRegistry) {
        admin = msg.sender;
        credentialRegistry = _credentialRegistry;
    }
    
    // Revoke a credential
    function revokeCredential(
        bytes32 _credentialHash,
        string memory _reason,
        bytes32 _revocationProof
    ) external returns (bool) {
        // Check if already revoked
        require(
            revocations[_credentialHash].credentialHash == bytes32(0),
            "Credential already revoked"
        );
        
        // Create revocation record
        revocations[_credentialHash] = Revocation({
            credentialHash: _credentialHash,
            revokedBy: msg.sender,
            revokedAt: block.timestamp,
            reason: _reason,
            revocationProof: _revocationProof
        });
        
        // Update mappings
        issuerRevocations[msg.sender].push(_credentialHash);
        allRevocationHashes.push(_credentialHash);
        
        emit CredentialRevoked(
            _credentialHash,
            msg.sender,
            block.timestamp,
            _reason,
            _revocationProof
        );
        
        return true;
    }
    
    // Update revocation reason
    function updateRevocationReason(
        bytes32 _credentialHash,
        string memory _newReason
    ) external {
        Revocation storage revocation = revocations[_credentialHash];
        
        require(
            revocation.credentialHash != bytes32(0),
            "Revocation not found"
        );
        
        require(
            msg.sender == revocation.revokedBy || msg.sender == admin,
            "Not authorized to update revocation"
        );
        
        revocation.reason = _newReason;
        
        emit RevocationUpdated(
            _credentialHash,
            msg.sender,
            block.timestamp,
            _newReason
        );
    }
    
    // Check if credential is revoked
    function isRevoked(bytes32 _credentialHash) external view returns (bool) {
        return revocations[_credentialHash].credentialHash != bytes32(0);
    }
    
    // Get revocation details
    function getRevocationDetails(bytes32 _credentialHash) external view returns (
        bytes32 credentialHash,
        address revokedBy,
        uint256 revokedAt,
        string memory reason,
        bytes32 revocationProof
    ) {
        Revocation memory revocation = revocations[_credentialHash];
        
        require(
            revocation.credentialHash != bytes32(0),
            "Revocation not found"
        );
        
        return (
            revocation.credentialHash,
            revocation.revokedBy,
            revocation.revokedAt,
            revocation.reason,
            revocation.revocationProof
        );
    }
    
    // Get issuer's revocations
    function getIssuerRevocations(address _issuer) external view returns (bytes32[] memory) {
        return issuerRevocations[_issuer];
    }
    
    // Get all revocations
    function getAllRevocations() external view returns (Revocation[] memory) {
        Revocation[] memory allRevocations = new Revocation[](allRevocationHashes.length);
        
        for (uint256 i = 0; i < allRevocationHashes.length; i++) {
            allRevocations[i] = revocations[allRevocationHashes[i]];
        }
        
        return allRevocations;
    }
    
    // Get total revocation count
    function getTotalRevocations() external view returns (uint256) {
        return allRevocationHashes.length;
    }
    
    // Update credential registry address
    function updateCredentialRegistry(address _newCredentialRegistry) external onlyAdmin {
        require(_newCredentialRegistry != address(0), "Invalid address");
        credentialRegistry = _newCredentialRegistry;
    }
    
    // Transfer admin rights
    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid address");
        admin = _newAdmin;
    }
}