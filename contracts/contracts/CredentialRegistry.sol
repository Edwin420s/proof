// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract CredentialRegistry {
    using ECDSA for bytes32;
    
    struct Credential {
        bytes32 credentialHash;
        address holder;
        address issuer;
        string credentialType;
        uint256 issuedAt;
        uint256 expiresAt;
        bool revoked;
        uint256 revokedAt;
        string revocationReason;
        string metadataURI;
    }
    
    struct Proof {
        bytes32 proofHash;
        bytes32 credentialHash;
        address verifier;
        uint256 verifiedAt;
        bool isValid;
        string verificationData;
    }
    
    // State variables
    address public admin;
    IssuerRegistry public issuerRegistry;
    
    // Mappings
    mapping(bytes32 => Credential) public credentials;
    mapping(bytes32 => Proof) public proofs;
    mapping(address => bytes32[]) public holderCredentials;
    mapping(address => bytes32[]) public issuerCredentials;
    mapping(address => bytes32[]) public verifierProofs;
    
    bytes32[] public allCredentialHashes;
    bytes32[] public allProofHashes;
    
    // Events
    event CredentialIssued(
        bytes32 indexed credentialHash,
        address indexed holder,
        address indexed issuer,
        string credentialType,
        uint256 issuedAt,
        uint256 expiresAt,
        string metadataURI
    );
    
    event CredentialRevoked(
        bytes32 indexed credentialHash,
        address indexed revokedBy,
        uint256 revokedAt,
        string reason
    );
    
    event ProofVerified(
        bytes32 indexed proofHash,
        bytes32 indexed credentialHash,
        address indexed verifier,
        uint256 verifiedAt,
        bool isValid
    );
    
    event CredentialExpired(
        bytes32 indexed credentialHash,
        uint256 expiredAt
    );
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier onlyVerifiedIssuer() {
        require(
            issuerRegistry.isVerifiedIssuer(msg.sender),
            "Only verified issuers can perform this action"
        );
        _;
    }
    
    // Constructor
    constructor(address _issuerRegistryAddress) {
        admin = msg.sender;
        issuerRegistry = IssuerRegistry(_issuerRegistryAddress);
    }
    
    // Issue a new credential
    function issueCredential(
        address _holder,
        string memory _credentialType,
        uint256 _expiresAt,
        string memory _metadataURI
    ) external onlyVerifiedIssuer returns (bytes32) {
        require(_holder != address(0), "Invalid holder address");
        
        // Generate credential hash
        bytes32 credentialHash = keccak256(
            abi.encodePacked(
                _holder,
                msg.sender,
                _credentialType,
                block.timestamp,
                block.prevrandao
            )
        );
        
        require(
            credentials[credentialHash].holder == address(0),
            "Credential already exists"
        );
        
        // Create credential
        credentials[credentialHash] = Credential({
            credentialHash: credentialHash,
            holder: _holder,
            issuer: msg.sender,
            credentialType: _credentialType,
            issuedAt: block.timestamp,
            expiresAt: _expiresAt,
            revoked: false,
            revokedAt: 0,
            revocationReason: "",
            metadataURI: _metadataURI
        });
        
        // Update mappings
        holderCredentials[_holder].push(credentialHash);
        issuerCredentials[msg.sender].push(credentialHash);
        allCredentialHashes.push(credentialHash);
        
        emit CredentialIssued(
            credentialHash,
            _holder,
            msg.sender,
            _credentialType,
            block.timestamp,
            _expiresAt,
            _metadataURI
        );
        
        return credentialHash;
    }
    
    // Revoke a credential
    function revokeCredential(
        bytes32 _credentialHash,
        string memory _reason
    ) external {
        Credential storage credential = credentials[_credentialHash];
        
        require(
            credential.holder != address(0),
            "Credential does not exist"
        );
        
        require(
            !credential.revoked,
            "Credential already revoked"
        );
        
        // Check authorization
        require(
            msg.sender == credential.issuer || msg.sender == admin,
            "Not authorized to revoke this credential"
        );
        
        // Revoke credential
        credential.revoked = true;
        credential.revokedAt = block.timestamp;
        credential.revocationReason = _reason;
        
        emit CredentialRevoked(
            _credentialHash,
            msg.sender,
            block.timestamp,
            _reason
        );
    }
    
    // Verify a credential proof
    function verifyProof(
        bytes32 _credentialHash,
        bytes32 _proofHash,
        string memory _verificationData
    ) external returns (bool) {
        Credential memory credential = credentials[_credentialHash];
        
        require(
            credential.holder != address(0),
            "Credential does not exist"
        );
        
        // Check if credential is valid
        bool isValid = true;
        
        if (credential.revoked) {
            isValid = false;
        } else if (credential.expiresAt > 0 && credential.expiresAt < block.timestamp) {
            isValid = false;
            emit CredentialExpired(_credentialHash, block.timestamp);
        }
        
        // Check if proof already exists
        require(
            proofs[_proofHash].verifier == address(0),
            "Proof already exists"
        );
        
        // Create proof record
        proofs[_proofHash] = Proof({
            proofHash: _proofHash,
            credentialHash: _credentialHash,
            verifier: msg.sender,
            verifiedAt: block.timestamp,
            isValid: isValid,
            verificationData: _verificationData
        });
        
        // Update mappings
        verifierProofs[msg.sender].push(_proofHash);
        allProofHashes.push(_proofHash);
        
        emit ProofVerified(
            _proofHash,
            _credentialHash,
            msg.sender,
            block.timestamp,
            isValid
        );
        
        return isValid;
    }
    
    // Check credential validity
    function checkCredentialValidity(bytes32 _credentialHash) external view returns (
        bool exists,
        bool valid,
        bool revoked,
        bool expired,
        uint256 issuedAt,
        uint256 expiresAt
    ) {
        Credential memory credential = credentials[_credentialHash];
        
        if (credential.holder == address(0)) {
            return (false, false, false, false, 0, 0);
        }
        
        bool isExpired = credential.expiresAt > 0 && 
                        credential.expiresAt < block.timestamp;
        
        bool isValid = !credential.revoked && !isExpired;
        
        return (
            true,
            isValid,
            credential.revoked,
            isExpired,
            credential.issuedAt,
            credential.expiresAt
        );
    }
    
    // Get credential details
    function getCredentialDetails(bytes32 _credentialHash) external view returns (
        address holder,
        address issuer,
        string memory credentialType,
        uint256 issuedAt,
        uint256 expiresAt,
        bool revoked,
        uint256 revokedAt,
        string memory revocationReason,
        string memory metadataURI
    ) {
        Credential memory credential = credentials[_credentialHash];
        require(credential.holder != address(0), "Credential does not exist");
        
        return (
            credential.holder,
            credential.issuer,
            credential.credentialType,
            credential.issuedAt,
            credential.expiresAt,
            credential.revoked,
            credential.revokedAt,
            credential.revocationReason,
            credential.metadataURI
        );
    }
    
    // Get holder's credentials
    function getHolderCredentials(address _holder) external view returns (bytes32[] memory) {
        return holderCredentials[_holder];
    }
    
    // Get issuer's credentials
    function getIssuerCredentials(address _issuer) external view returns (bytes32[] memory) {
        return issuerCredentials[_issuer];
    }
    
    // Get verifier's proofs
    function getVerifierProofs(address _verifier) external view returns (bytes32[] memory) {
        return verifierProofs[_verifier];
    }
    
    // Get all credentials count
    function getTotalCredentials() external view returns (uint256) {
        return allCredentialHashes.length;
    }
    
    // Get all proofs count
    function getTotalProofs() external view returns (uint256) {
        return allProofHashes.length;
    }
    
    // Generate proof hash
    function generateProofHash(
        bytes32 _credentialHash,
        address _verifier,
        string memory _nonce
    ) public pure returns (bytes32) {
        return keccak256(
            abi.encodePacked(_credentialHash, _verifier, _nonce)
        );
    }
    
    // Update issuer registry address
    function updateIssuerRegistry(address _newIssuerRegistry) external onlyAdmin {
        require(_newIssuerRegistry != address(0), "Invalid address");
        issuerRegistry = IssuerRegistry(_newIssuerRegistry);
    }
    
    // Transfer admin rights
    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid address");
        admin = _newAdmin;
    }
}

// Minimal IssuerRegistry interface for compilation
abstract contract IssuerRegistry {
    function isVerifiedIssuer(address) external virtual view returns (bool);
}