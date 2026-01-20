// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract VerifierRegistry {
    struct Verifier {
        string name;
        string did;
        address walletAddress;
        bool isVerified;
        uint256 registeredAt;
        uint256 verifiedAt;
        string metadataURI;
        string[] allowedCredentialTypes;
        uint256 verificationLimit;
        uint256 verificationCount;
    }
    
    // State variables
    address public admin;
    
    // Mappings
    mapping(address => Verifier) public verifiers;
    mapping(string => address) public didToVerifier;
    address[] public verifierAddresses;
    
    // Events
    event VerifierRegistered(
        address indexed verifierAddress,
        string name,
        string did,
        uint256 timestamp
    );
    
    event VerifierVerified(
        address indexed verifierAddress,
        address verifiedBy,
        uint256 timestamp
    );
    
    event VerifierRemoved(
        address indexed verifierAddress,
        address removedBy,
        uint256 timestamp
    );
    
    event VerificationLimitUpdated(
        address indexed verifierAddress,
        uint256 oldLimit,
        uint256 newLimit
    );
    
    event CredentialTypesUpdated(
        address indexed verifierAddress,
        string[] credentialTypes
    );
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier onlyVerifiedVerifier() {
        require(
            verifiers[msg.sender].isVerified,
            "Only verified verifiers can perform this action"
        );
        _;
    }
    
    // Constructor
    constructor() {
        admin = msg.sender;
    }
    
    // Register a new verifier
    function registerVerifier(
        string memory _name,
        string memory _did,
        string memory _metadataURI,
        string[] memory _allowedCredentialTypes,
        uint256 _verificationLimit
    ) external {
        require(
            verifiers[msg.sender].walletAddress == address(0),
            "Verifier already registered"
        );
        require(
            didToVerifier[_did] == address(0),
            "DID already registered"
        );
        
        verifiers[msg.sender] = Verifier({
            name: _name,
            did: _did,
            walletAddress: msg.sender,
            isVerified: false,
            registeredAt: block.timestamp,
            verifiedAt: 0,
            metadataURI: _metadataURI,
            allowedCredentialTypes: _allowedCredentialTypes,
            verificationLimit: _verificationLimit,
            verificationCount: 0
        });
        
        didToVerifier[_did] = msg.sender;
        verifierAddresses.push(msg.sender);
        
        emit VerifierRegistered(
            msg.sender,
            _name,
            _did,
            block.timestamp
        );
    }
    
    // Verify a verifier
    function verifyVerifier(address _verifierAddress) external onlyAdmin {
        require(
            verifiers[_verifierAddress].walletAddress != address(0),
            "Verifier not registered"
        );
        require(
            !verifiers[_verifierAddress].isVerified,
            "Verifier already verified"
        );
        
        verifiers[_verifierAddress].isVerified = true;
        verifiers[_verifierAddress].verifiedAt = block.timestamp;
        
        emit VerifierVerified(
            _verifierAddress,
            msg.sender,
            block.timestamp
        );
    }
    
    // Remove a verifier
    function removeVerifier(address _verifierAddress) external onlyAdmin {
        require(
            verifiers[_verifierAddress].walletAddress != address(0),
            "Verifier not registered"
        );
        
        // Remove DID mapping
        string memory did = verifiers[_verifierAddress].did;
        delete didToVerifier[did];
        
        // Remove from addresses array
        for (uint256 i = 0; i < verifierAddresses.length; i++) {
            if (verifierAddresses[i] == _verifierAddress) {
                verifierAddresses[i] = verifierAddresses[verifierAddresses.length - 1];
                verifierAddresses.pop();
                break;
            }
        }
        
        // Remove verifier
        delete verifiers[_verifierAddress];
        
        emit VerifierRemoved(
            _verifierAddress,
            msg.sender,
            block.timestamp
        );
    }
    
    // Update verification limit
    function updateVerificationLimit(
        address _verifierAddress,
        uint256 _newLimit
    ) external onlyAdmin {
        require(
            verifiers[_verifierAddress].walletAddress != address(0),
            "Verifier not registered"
        );
        
        uint256 oldLimit = verifiers[_verifierAddress].verificationLimit;
        verifiers[_verifierAddress].verificationLimit = _newLimit;
        
        emit VerificationLimitUpdated(
            _verifierAddress,
            oldLimit,
            _newLimit
        );
    }
    
    // Update allowed credential types
    function updateAllowedCredentialTypes(
        string[] memory _credentialTypes
    ) external onlyVerifiedVerifier {
        verifiers[msg.sender].allowedCredentialTypes = _credentialTypes;
        
        emit CredentialTypesUpdated(
            msg.sender,
            _credentialTypes
        );
    }
    
    // Increment verification count (called by credential registry)
    function incrementVerificationCount(address _verifierAddress) external {
        // In production, restrict this to credential registry contract
        require(
            verifiers[_verifierAddress].walletAddress != address(0),
            "Verifier not registered"
        );
        
        verifiers[_verifierAddress].verificationCount++;
    }
    
    // Check if verifier can verify credential type
    function canVerifyCredentialType(
        address _verifierAddress,
        string memory _credentialType
    ) external view returns (bool) {
        Verifier memory verifier = verifiers[_verifierAddress];
        
        if (verifier.walletAddress == address(0)) {
            return false;
        }
        
        if (!verifier.isVerified) {
            return false;
        }
        
        // Check verification limit
        if (verifier.verificationLimit > 0 && 
            verifier.verificationCount >= verifier.verificationLimit) {
            return false;
        }
        
        // Check if credential type is in allowed list
        for (uint256 i = 0; i < verifier.allowedCredentialTypes.length; i++) {
            if (keccak256(bytes(verifier.allowedCredentialTypes[i])) == 
                keccak256(bytes(_credentialType))) {
                return true;
            }
        }
        
        return false;
    }
    
    // Get verifier details
    function getVerifierDetails(address _verifierAddress) external view returns (
        string memory name,
        string memory did,
        bool isVerified,
        uint256 registeredAt,
        uint256 verifiedAt,
        string memory metadataURI,
        string[] memory allowedCredentialTypes,
        uint256 verificationLimit,
        uint256 verificationCount
    ) {
        Verifier memory verifier = verifiers[_verifierAddress];
        require(verifier.walletAddress != address(0), "Verifier not found");
        
        return (
            verifier.name,
            verifier.did,
            verifier.isVerified,
            verifier.registeredAt,
            verifier.verifiedAt,
            verifier.metadataURI,
            verifier.allowedCredentialTypes,
            verifier.verificationLimit,
            verifier.verificationCount
        );
    }
    
    // Get all verified verifiers
    function getAllVerifiedVerifiers() external view returns (Verifier[] memory) {
        uint256 count = 0;
        
        // Count verified verifiers
        for (uint256 i = 0; i < verifierAddresses.length; i++) {
            if (verifiers[verifierAddresses[i]].isVerified) {
                count++;
            }
        }
        
        // Create array
        Verifier[] memory verifiedVerifiers = new Verifier[](count);
        uint256 index = 0;
        
        // Populate array
        for (uint256 i = 0; i < verifierAddresses.length; i++) {
            address verifierAddr = verifierAddresses[i];
            if (verifiers[verifierAddr].isVerified) {
                verifiedVerifiers[index] = verifiers[verifierAddr];
                index++;
            }
        }
        
        return verifiedVerifiers;
    }
    
    // Get total verifier count
    function getVerifierCount() external view returns (uint256) {
        return verifierAddresses.length;
    }
    
    // Transfer admin rights
    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid address");
        admin = _newAdmin;
    }
}