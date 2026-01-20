// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract DIDRegistry {
    struct DIDDocument {
        string did;
        address controller;
        string publicKey;
        string[] serviceEndpoints;
        uint256 created;
        uint256 updated;
        bool deactivated;
        string metadataURI;
    }
    
    // State variables
    address public admin;
    
    // Mappings
    mapping(string => DIDDocument) public didDocuments;
    mapping(address => string[]) public addressToDIDs;
    mapping(string => bool) private reservedDIDs;
    
    string[] public allDIDs;
    
    // Events
    event DIDCreated(
        string indexed did,
        address indexed controller,
        uint256 timestamp
    );
    
    event DIDUpdated(
        string indexed did,
        address indexed controller,
        uint256 timestamp
    );
    
    event DIDDeactivated(
        string indexed did,
        address indexed deactivatedBy,
        uint256 timestamp
    );
    
    event DIDReactivated(
        string indexed did,
        address indexed reactivatedBy,
        uint256 timestamp
    );
    
    event ControllerChanged(
        string indexed did,
        address indexed oldController,
        address indexed newController
    );
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier onlyController(string memory _did) {
        require(
            keccak256(abi.encodePacked(didDocuments[_did].controller)) == 
            keccak256(abi.encodePacked(msg.sender)),
            "Only DID controller can perform this action"
        );
        _;
    }
    
    modifier didExists(string memory _did) {
        require(
            bytes(didDocuments[_did].did).length > 0,
            "DID does not exist"
        );
        _;
    }
    
    modifier didNotExists(string memory _did) {
        require(
            bytes(didDocuments[_did].did).length == 0,
            "DID already exists"
        );
        _;
    }
    
    modifier notDeactivated(string memory _did) {
        require(
            !didDocuments[_did].deactivated,
            "DID is deactivated"
        );
        _;
    }
    
    // Constructor
    constructor() {
        admin = msg.sender;
    }
    
    // Create a new DID
    function createDID(
        string memory _did,
        string memory _publicKey,
        string[] memory _serviceEndpoints,
        string memory _metadataURI
    ) external didNotExists(_did) returns (bool) {
        // Check if DID follows pattern
        require(
            isValidDID(_did),
            "Invalid DID format"
        );
        
        // Create DID document
        didDocuments[_did] = DIDDocument({
            did: _did,
            controller: msg.sender,
            publicKey: _publicKey,
            serviceEndpoints: _serviceEndpoints,
            created: block.timestamp,
            updated: block.timestamp,
            deactivated: false,
            metadataURI: _metadataURI
        });
        
        // Update mappings
        addressToDIDs[msg.sender].push(_did);
        allDIDs.push(_did);
        
        emit DIDCreated(_did, msg.sender, block.timestamp);
        
        return true;
    }
    
    // Update DID document
    function updateDID(
        string memory _did,
        string memory _publicKey,
        string[] memory _serviceEndpoints,
        string memory _metadataURI
    ) external 
      didExists(_did)
      onlyController(_did)
      notDeactivated(_did) 
    {
        DIDDocument storage doc = didDocuments[_did];
        
        doc.publicKey = _publicKey;
        doc.serviceEndpoints = _serviceEndpoints;
        doc.metadataURI = _metadataURI;
        doc.updated = block.timestamp;
        
        emit DIDUpdated(_did, msg.sender, block.timestamp);
    }
    
    // Deactivate DID
    function deactivateDID(string memory _did) 
        external 
        didExists(_did)
        onlyController(_did)
        notDeactivated(_did)
    {
        didDocuments[_did].deactivated = true;
        didDocuments[_did].updated = block.timestamp;
        
        emit DIDDeactivated(_did, msg.sender, block.timestamp);
    }
    
    // Reactivate DID (admin only for now)
    function reactivateDID(string memory _did) 
        external 
        onlyAdmin
        didExists(_did)
    {
        require(
            didDocuments[_did].deactivated,
            "DID is not deactivated"
        );
        
        didDocuments[_did].deactivated = false;
        didDocuments[_did].updated = block.timestamp;
        
        emit DIDReactivated(_did, msg.sender, block.timestamp);
    }
    
    // Change DID controller
    function changeController(
        string memory _did, 
        address _newController
    ) 
        external 
        didExists(_did)
        onlyController(_did)
        notDeactivated(_did)
    {
        require(
            _newController != address(0),
            "Invalid controller address"
        );
        
        address oldController = didDocuments[_did].controller;
        
        // Remove from old controller's list
        _removeDIDFromAddress(oldController, _did);
        
        // Add to new controller's list
        addressToDIDs[_newController].push(_did);
        
        // Update controller
        didDocuments[_did].controller = _newController;
        didDocuments[_did].updated = block.timestamp;
        
        emit ControllerChanged(_did, oldController, _newController);
        emit DIDUpdated(_did, _newController, block.timestamp);
    }
    
    // Get DID document
    function getDIDDocument(string memory _did) 
        external 
        view 
        didExists(_did)
        returns (
            string memory did,
            address controller,
            string memory publicKey,
            string[] memory serviceEndpoints,
            uint256 created,
            uint256 updated,
            bool deactivated,
            string memory metadataURI
        )
    {
        DIDDocument memory doc = didDocuments[_did];
        
        return (
            doc.did,
            doc.controller,
            doc.publicKey,
            doc.serviceEndpoints,
            doc.created,
            doc.updated,
            doc.deactivated,
            doc.metadataURI
        );
    }
    
    // Check if DID is valid
    function isValidDID(string memory _did) public pure returns (bool) {
        bytes memory didBytes = bytes(_did);
        
        // Check minimum length
        if (didBytes.length < 10) return false;
        
        // Check if starts with "did:"
        if (didBytes[0] != 'd' || didBytes[1] != 'i' || 
            didBytes[2] != 'd' || didBytes[3] != ':') {
            return false;
        }
        
        // Add more validation as needed
        return true;
    }
    
    // Get DIDs by address
    function getDIDsByAddress(address _address) 
        external 
        view 
        returns (string[] memory) 
    {
        return addressToDIDs[_address];
    }
    
    // Get all DIDs
    function getAllDIDs() external view returns (string[] memory) {
        return allDIDs;
    }
    
    // Get total DIDs count
    function getTotalDIDs() external view returns (uint256) {
        return allDIDs.length;
    }
    
    // Check if address controls a DID
    function isDIDController(address _address, string memory _did) 
        external 
        view 
        returns (bool) 
    {
        return didDocuments[_did].controller == _address;
    }
    
    // Reserve a DID (admin only)
    function reserveDID(string memory _did) external onlyAdmin {
        require(
            !reservedDIDs[_did],
            "DID already reserved"
        );
        
        reservedDIDs[_did] = true;
    }
    
    // Check if DID is reserved
    function isDIDReserved(string memory _did) external view returns (bool) {
        return reservedDIDs[_did];
    }
    
    // Transfer admin rights
    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid address");
        admin = _newAdmin;
    }
    
    // Helper function to remove DID from address mapping
    function _removeDIDFromAddress(address _address, string memory _did) private {
        string[] storage dids = addressToDIDs[_address];
        
        for (uint256 i = 0; i < dids.length; i++) {
            if (keccak256(abi.encodePacked(dids[i])) == 
                keccak256(abi.encodePacked(_did))) {
                
                // Move last element to current position
                dids[i] = dids[dids.length - 1];
                dids.pop();
                break;
            }
        }
    }
}