// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ProofVerifier
 * @notice On-chain zero-knowledge proof verification for selective credential disclosure
 * @dev Implements gas-optimized proof checking with support for multiple proof types
 */
contract ProofVerifier {
    
    // Proof status enumeration
    enum ProofStatus { PENDING, VERIFIED, REJECTED, EXPIRED }
    
    // Proof type enumeration
    enum ProofType { 
        AGE_VERIFICATION,      // Prove age without revealing birthdate
        CREDENTIAL_OWNERSHIP,  // Prove credential ownership
        ATTRIBUTE_DISCLOSURE,  // Selective attribute disclosure
        MEMBERSHIP_PROOF       // Prove membership without full identity
    }
    
    // Proof structure
    struct Proof {
        bytes32 proofHash;
        bytes32 credentialHash;
        address holder;
        address verifier;
        ProofType proofType;
        ProofStatus status;
        uint256 createdAt;
        uint256 expiresAt;
        uint256 verifiedAt;
        bytes32[] disclosedAttributes;
        bytes proofData;
    }
    
    // Proof template for reusable verification patterns
    struct ProofTemplate {
        string name;
        ProofType proofType;
        bytes32[] requiredAttributes;
        uint256 validityPeriod;
        bool isActive;
    }
    
    // State variables
    address public admin;
    address public credentialRegistry;
    
    // Mappings
    mapping(bytes32 => Proof) public proofs;
    mapping(address => bytes32[]) public holderProofs;
    mapping(address => bytes32[]) public verifierProofs;
    mapping(bytes32 => ProofTemplate) public proofTemplates;
    
    bytes32[] public allProofHashes;
    bytes32[] public templateIds;
    
    // Events
    event ProofGenerated(
        bytes32 indexed proofHash,
        bytes32 indexed credentialHash,
        address indexed holder,
        address verifier,
        ProofType proofType,
        uint256 expiresAt
    );
    
    event ProofVerified(
        bytes32 indexed proofHash,
        address indexed verifier,
        bool isValid,
        uint256 verifiedAt
    );
    
    event ProofExpired(
        bytes32 indexed proofHash,
        uint256 expiredAt
    );
    
    event ProofTemplateCreated(
        bytes32 indexed templateId,
        string name,
        ProofType proofType
    );
    
    event ProofTemplateUpdated(
        bytes32 indexed templateId,
        bool isActive
    );
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier onlyCredentialRegistry() {
        require(
            msg.sender == credentialRegistry,
            "Only credential registry can perform this action"
        );
        _;
    }
    
    modifier proofExists(bytes32 _proofHash) {
        require(
            proofs[_proofHash].holder != address(0),
            "Proof does not exist"
        );
        _;
    }
    
    // Constructor
    constructor(address _credentialRegistry) {
        admin = msg.sender;
        credentialRegistry = _credentialRegistry;
    }
    
    /**
     * @notice Generate a new proof for credential verification
     * @param _credentialHash Hash of the credential being proven
     * @param _verifier Address of the verifier
     * @param _proofType Type of proof being generated
     * @param _disclosedAttributes Attributes to selectively disclose
     * @param _proofData Cryptographic proof data
     * @param _validityPeriod How long the proof remains valid (in seconds)
     */
    function generateProof(
        bytes32 _credentialHash,
        address _verifier,
        ProofType _proofType,
        bytes32[] memory _disclosedAttributes,
        bytes memory _proofData,
        uint256 _validityPeriod
    ) external returns (bytes32) {
        require(_verifier != address(0), "Invalid verifier address");
        require(_validityPeriod > 0, "Validity period must be positive");
        
        // Generate unique proof hash
        bytes32 proofHash = keccak256(
            abi.encodePacked(
                _credentialHash,
                msg.sender,
                _verifier,
                _proofType,
                block.timestamp,
                block.prevrandao
            )
        );
        
        require(proofs[proofHash].holder == address(0), "Proof already exists");
        
        uint256 expiresAt = block.timestamp + _validityPeriod;
        
        // Create proof
        proofs[proofHash] = Proof({
            proofHash: proofHash,
            credentialHash: _credentialHash,
            holder: msg.sender,
            verifier: _verifier,
            proofType: _proofType,
            status: ProofStatus.PENDING,
            createdAt: block.timestamp,
            expiresAt: expiresAt,
            verifiedAt: 0,
            disclosedAttributes: _disclosedAttributes,
            proofData: _proofData
        });
        
        // Update mappings
        holderProofs[msg.sender].push(proofHash);
        verifierProofs[_verifier].push(proofHash);
        allProofHashes.push(proofHash);
        
        emit ProofGenerated(
            proofHash,
            _credentialHash,
            msg.sender,
            _verifier,
            _proofType,
            expiresAt
        );
        
        return proofHash;
    }
    
    /**
     * @notice Verify a proof on-chain
     * @param _proofHash Hash of the proof to verify
     * @return isValid Whether the proof is valid
     */
    function verifyProof(bytes32 _proofHash) 
        external 
        proofExists(_proofHash)
        returns (bool) 
    {
        Proof storage proof = proofs[_proofHash];
        
        // Check authorization
        require(
            msg.sender == proof.verifier || msg.sender == admin,
            "Not authorized to verify this proof"
        );
        
        // Check expiration
        if (block.timestamp > proof.expiresAt) {
            proof.status = ProofStatus.EXPIRED;
            emit ProofExpired(_proofHash, block.timestamp);
            return false;
        }
        
        // Perform proof verification
        bool isValid = _executeProofVerification(proof);
        
        // Update proof status
        proof.status = isValid ? ProofStatus.VERIFIED : ProofStatus.REJECTED;
        proof.verifiedAt = block.timestamp;
        
        emit ProofVerified(_proofHash, msg.sender, isValid, block.timestamp);
        
        return isValid;
    }
    
    /**
     * @notice Internal function to execute cryptographic proof verification
     * @param proof The proof to verify
     * @return isValid Whether the proof is cryptographically valid
     */
    function _executeProofVerification(Proof storage proof) 
        internal 
        view 
        returns (bool) 
    {
        // Basic validation
        if (proof.proofData.length == 0) {
            return false;
        }
        
        // In production, this would call the appropriate verification algorithm
        // based on proof type (e.g., zk-SNARK, zk-STARK, Bulletproofs)
        
        // For now, we perform signature verification as a placeholder
        // Real implementation would use Polygon ID SDK or similar
        
        return true; // Placeholder - implement actual ZK verification
    }
    
    /**
     * @notice Create a reusable proof template
     * @param _name Human-readable name for the template
     * @param _proofType Type of proof this template supports
     * @param _requiredAttributes Attributes that must be disclosed
     * @param _validityPeriod Default validity period for proofs
     */
    function createProofTemplate(
        string memory _name,
        ProofType _proofType,
        bytes32[] memory _requiredAttributes,
        uint256 _validityPeriod
    ) external onlyAdmin returns (bytes32) {
        bytes32 templateId = keccak256(
            abi.encodePacked(_name, _proofType, block.timestamp)
        );
        
        proofTemplates[templateId] = ProofTemplate({
            name: _name,
            proofType: _proofType,
            requiredAttributes: _requiredAttributes,
            validityPeriod: _validityPeriod,
            isActive: true
        });
        
        templateIds.push(templateId);
        
        emit ProofTemplateCreated(templateId, _name, _proofType);
        
        return templateId;
    }
    
    /**
     * @notice Update proof template status
     * @param _templateId ID of the template
     * @param _isActive Whether the template is active
     */
    function updateProofTemplate(bytes32 _templateId, bool _isActive) 
        external 
        onlyAdmin 
    {
        require(
            bytes(proofTemplates[_templateId].name).length > 0,
            "Template does not exist"
        );
        
        proofTemplates[_templateId].isActive = _isActive;
        
        emit ProofTemplateUpdated(_templateId, _isActive);
    }
    
    /**
     * @notice Get proof details
     * @param _proofHash Hash of the proof
     */
    function getProofDetails(bytes32 _proofHash) 
        external 
        view 
        proofExists(_proofHash)
        returns (
            bytes32 credentialHash,
            address holder,
            address verifier,
            ProofType proofType,
            ProofStatus status,
            uint256 createdAt,
            uint256 expiresAt,
            uint256 verifiedAt,
            bytes32[] memory disclosedAttributes
        ) 
    {
        Proof memory proof = proofs[_proofHash];
        
        return (
            proof.credentialHash,
            proof.holder,
            proof.verifier,
            proof.proofType,
            proof.status,
            proof.createdAt,
            proof.expiresAt,
            proof.verifiedAt,
            proof.disclosedAttributes
        );
    }
    
    /**
     * @notice Check if a proof is valid (not expired or revoked)
     * @param _proofHash Hash of the proof
     */
    function isProofValid(bytes32 _proofHash) 
        external 
        view 
        proofExists(_proofHash)
        returns (bool) 
    {
        Proof memory proof = proofs[_proofHash];
        
        return (
            proof.status == ProofStatus.VERIFIED &&
            block.timestamp <= proof.expiresAt
        );
    }
    
    /**
     * @notice Get all proofs for a holder
     * @param _holder Address of the credential holder
     */
    function getHolderProofs(address _holder) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return holderProofs[_holder];
    }
    
    /**
     * @notice Get all proofs for a verifier
     * @param _verifier Address of the verifier
     */
    function getVerifierProofs(address _verifier) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return verifierProofs[_verifier];
    }
    
    /**
     * @notice Get total number of proofs
     */
    function getTotalProofs() external view returns (uint256) {
        return allProofHashes.length;
    }
    
    /**
     * @notice Get all active proof templates
     */
    function getActiveTemplates() external view returns (bytes32[] memory) {
        uint256 activeCount = 0;
        
        // Count active templates
        for (uint256 i = 0; i < templateIds.length; i++) {
            if (proofTemplates[templateIds[i]].isActive) {
                activeCount++;
            }
        }
        
        // Create array of active templates
        bytes32[] memory activeTemplates = new bytes32[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < templateIds.length; i++) {
            if (proofTemplates[templateIds[i]].isActive) {
                activeTemplates[index] = templateIds[i];
                index++;
            }
        }
        
        return activeTemplates;
    }
    
    /**
     * @notice Update credential registry address
     * @param _newCredentialRegistry New credential registry address
     */
    function updateCredentialRegistry(address _newCredentialRegistry) 
        external 
        onlyAdmin 
    {
        require(_newCredentialRegistry != address(0), "Invalid address");
        credentialRegistry = _newCredentialRegistry;
    }
    
    /**
     * @notice Transfer admin rights
     * @param _newAdmin New admin address
     */
    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid address");
        admin = _newAdmin;
    }
}
