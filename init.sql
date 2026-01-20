-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(255) UNIQUE NOT NULL,
    did VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'USER' CHECK (role IN ('USER', 'ISSUER', 'VERIFIER', 'ADMIN')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create issuers table
CREATE TABLE IF NOT EXISTS issuers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    wallet_address VARCHAR(255) UNIQUE NOT NULL,
    did VARCHAR(255) UNIQUE NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    contract_address VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create credentials table
CREATE TABLE IF NOT EXISTS credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    issuer_id UUID REFERENCES issuers(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- On-chain data
    credential_hash VARCHAR(255) UNIQUE NOT NULL,
    contract_address VARCHAR(255),
    token_id VARCHAR(255),
    chain_id INTEGER DEFAULT 137,
    
    -- Credential data
    data JSONB,
    metadata JSONB,
    
    -- Status
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED', 'SUSPENDED')),
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    revoked_at TIMESTAMP,
    revoked_reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create verifications table
CREATE TABLE IF NOT EXISTS verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    credential_id UUID REFERENCES credentials(id) ON DELETE CASCADE,
    verifier_id UUID REFERENCES users(id) ON DELETE CASCADE,
    proof_hash VARCHAR(255) UNIQUE NOT NULL,
    proof_data JSONB,
    
    -- Verification result
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED')),
    verified_at TIMESTAMP,
    verification_result JSONB,
    
    -- Metadata
    ip_address VARCHAR(45),
    user_agent TEXT,
    reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create verification_requests table
CREATE TABLE IF NOT EXISTS verification_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id VARCHAR(100) UNIQUE NOT NULL,
    verifier_id UUID REFERENCES users(id) ON DELETE CASCADE,
    credential_type VARCHAR(100),
    required_attributes JSONB,
    expires_at TIMESTAMP NOT NULL,
    callback_url TEXT,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'EXPIRED')),
    completed_at TIMESTAMP,
    verification_result JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
CREATE INDEX idx_users_did ON users(did);
CREATE INDEX idx_users_role ON users(role);

CREATE INDEX idx_issuers_wallet_address ON issuers(wallet_address);
CREATE INDEX idx_issuers_did ON issuers(did);
CREATE INDEX idx_issuers_is_verified ON issuers(is_verified);

CREATE INDEX idx_credentials_user_id ON credentials(user_id);
CREATE INDEX idx_credentials_issuer_id ON credentials(issuer_id);
CREATE INDEX idx_credentials_credential_hash ON credentials(credential_hash);
CREATE INDEX idx_credentials_status ON credentials(status);
CREATE INDEX idx_credentials_issued_at ON credentials(issued_at);
CREATE INDEX idx_credentials_type ON credentials(type);

CREATE INDEX idx_verifications_credential_id ON verifications(credential_id);
CREATE INDEX idx_verifications_verifier_id ON verifications(verifier_id);
CREATE INDEX idx_verifications_proof_hash ON verifications(proof_hash);
CREATE INDEX idx_verifications_status ON verifications(status);
CREATE INDEX idx_verifications_created_at ON verifications(created_at);

CREATE INDEX idx_verification_requests_request_id ON verification_requests(request_id);
CREATE INDEX idx_verification_requests_verifier_id ON verification_requests(verifier_id);
CREATE INDEX idx_verification_requests_status ON verification_requests(status);
CREATE INDEX idx_verification_requests_expires_at ON verification_requests(expires_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_issuers_updated_at BEFORE UPDATE ON issuers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credentials_updated_at BEFORE UPDATE ON credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_verification_requests_updated_at BEFORE UPDATE ON verification_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert admin user (optional)
INSERT INTO users (wallet_address, did, email, name, role) 
VALUES (
    '0x0000000000000000000000000000000000000000',
    'did:polygon:admin:system',
    'admin@proofidentity.com',
    'System Admin',
    'ADMIN'
) ON CONFLICT (wallet_address) DO NOTHING;

-- Insert test issuer
INSERT INTO issuers (name, description, wallet_address, did, is_verified, metadata) 
VALUES (
    'Proof University',
    'Leading institution for verifiable credentials',
    '0x1111111111111111111111111111111111111111',
    'did:polygon:university:proof',
    true,
    '{"type": "educational_institution", "country": "ZA", "accreditation": "government"}'
) ON CONFLICT (wallet_address) DO NOTHING;

-- Create view for credential statistics
CREATE VIEW credential_stats AS
SELECT 
    c.type,
    COUNT(*) as total,
    COUNT(CASE WHEN c.status = 'ACTIVE' THEN 1 END) as active,
    COUNT(CASE WHEN c.status = 'EXPIRED' THEN 1 END) as expired,
    COUNT(CASE WHEN c.status = 'REVOKED' THEN 1 END) as revoked,
    COUNT(CASE WHEN c.status = 'PENDING' THEN 1 END) as pending
FROM credentials c
GROUP BY c.type;

-- Create view for verification statistics
CREATE VIEW verification_stats AS
SELECT 
    v.status,
    COUNT(*) as total,
    DATE(v.created_at) as date
FROM verifications v
GROUP BY v.status, DATE(v.created_at);

-- Grant permissions (adjust based on your security requirements)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO proof_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO proof_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO proof_user;