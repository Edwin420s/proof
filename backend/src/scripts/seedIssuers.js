const { prisma } = require('../config/database');
const { ethers } = require('ethers');
const { generateDID } = require('../utils/cryptography');

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // Clear existing data (optional - for development)
    if (process.env.NODE_ENV === 'development') {
      console.log('🧹 Clearing existing data...');
      
      await prisma.verification.deleteMany({});
      await prisma.credential.deleteMany({});
      await prisma.verificationRequest.deleteMany({});
      await prisma.issuer.deleteMany({});
      await prisma.user.deleteMany({});
      
      console.log('✅ Existing data cleared\n');
    }

    // Create test users
    console.log('👥 Creating test users...');
    
    const testUsers = [
      {
        walletAddress: '0x1111111111111111111111111111111111111111',
        name: 'Alice Johnson',
        email: 'alice@example.com',
        role: 'USER'
      },
      {
        walletAddress: '0x2222222222222222222222222222222222222222',
        name: 'Bob Smith',
        email: 'bob@example.com',
        role: 'USER'
      },
      {
        walletAddress: '0x3333333333333333333333333333333333333333',
        name: 'Charlie Brown',
        email: 'charlie@example.com',
        role: 'USER'
      },
      {
        walletAddress: '0x4444444444444444444444444444444444444444',
        name: 'David Wilson',
        email: 'david@example.com',
        role: 'VERIFIER'
      },
      {
        walletAddress: '0x5555555555555555555555555555555555555555',
        name: 'Eve Davis',
        email: 'eve@example.com',
        role: 'VERIFIER'
      }
    ];

    const createdUsers = [];
    for (const userData of testUsers) {
      const did = generateDID(userData.walletAddress);
      
      const user = await prisma.user.create({
        data: {
          walletAddress: userData.walletAddress.toLowerCase(),
          did: did.did,
          name: userData.name,
          email: userData.email,
          role: userData.role
        }
      });
      
      createdUsers.push(user);
      console.log(`   Created user: ${user.name} (${user.walletAddress})`);
    }
    console.log('✅ Test users created\n');

    // Create test issuers
    console.log('🏛️ Creating test issuers...');
    
    const testIssuers = [
      {
        name: 'Proof University',
        description: 'Leading educational institution providing verifiable academic credentials',
        walletAddress: '0x6666666666666666666666666666666666666666',
        isVerified: true,
        metadata: {
          type: 'educational_institution',
          country: 'ZA',
          accreditation: 'government',
          website: 'https://university.proofidentity.com',
          contactEmail: 'credentials@proofuniversity.edu'
        }
      },
      {
        name: 'Tech Certification Board',
        description: 'Industry-recognized technology certification authority',
        walletAddress: '0x7777777777777777777777777777777777777777',
        isVerified: true,
        metadata: {
          type: 'certification_body',
          industry: 'technology',
          website: 'https://certifications.techboard.org',
          contactEmail: 'info@techcertboard.org'
        }
      },
      {
        name: 'Healthcare Professionals Council',
        description: 'Regulatory body for healthcare practitioners',
        walletAddress: '0x8888888888888888888888888888888888888888',
        isVerified: true,
        metadata: {
          type: 'regulatory_body',
          sector: 'healthcare',
          country: 'ZA',
          website: 'https://hpc.org.za',
          contactEmail: 'registry@hpc.org.za'
        }
      },
      {
        name: 'Financial Services Authority',
        description: 'Financial regulatory institution',
        walletAddress: '0x9999999999999999999999999999999999999999',
        isVerified: false, // Pending verification
        metadata: {
          type: 'government_agency',
          sector: 'finance',
          country: 'ZA',
          website: 'https://fsa.gov.za',
          contactEmail: 'licensing@fsa.gov.za'
        }
      }
    ];

    const createdIssuers = [];
    for (const issuerData of testIssuers) {
      const did = generateDID(issuerData.walletAddress);
      
      const issuer = await prisma.issuer.create({
        data: {
          name: issuerData.name,
          description: issuerData.description,
          walletAddress: issuerData.walletAddress.toLowerCase(),
          did: did.did,
          isVerified: issuerData.isVerified,
          metadata: issuerData.metadata
        }
      });
      
      createdIssuers.push(issuer);
      console.log(`   Created issuer: ${issuer.name} ${issuer.isVerified ? '(Verified)' : '(Pending)'}`);
    }
    console.log('✅ Test issuers created\n');

    // Create test credentials
    console.log('📜 Creating test credentials...');
    
    const testCredentials = [
      {
        userId: createdUsers[0].id, // Alice
        issuerId: createdIssuers[0].id, // Proof University
        type: 'EDUCATION_DEGREE',
        title: 'Bachelor of Science in Computer Science',
        description: 'Four-year undergraduate degree in Computer Science',
        credentialHash: ethers.keccak256(ethers.toUtf8Bytes('degree-alice-1')),
        status: 'ACTIVE',
        data: {
          studentId: 'CS2023001',
          gpa: '3.8',
          graduationYear: '2024',
          honors: 'Summa Cum Laude'
        },
        metadata: {
          program: 'Computer Science',
          faculty: 'Engineering',
          duration: '4 years',
          ipfsCID: 'QmTestCID1'
        },
        issuedAt: new Date('2024-06-15'),
        expiresAt: null // Permanent credential
      },
      {
        userId: createdUsers[0].id, // Alice
        issuerId: createdIssuers[1].id, // Tech Certification Board
        type: 'CERTIFICATION',
        title: 'Certified Blockchain Developer',
        description: 'Professional certification in blockchain development',
        credentialHash: ethers.keccak256(ethers.toUtf8Bytes('cert-alice-1')),
        status: 'ACTIVE',
        data: {
          certificationId: 'CBD-2024-001',
          specialization: 'Ethereum & Solidity',
          examScore: '92%',
          validUntil: '2026-12-31'
        },
        metadata: {
          technology: 'Blockchain',
          level: 'Professional',
          ipfsCID: 'QmTestCID2'
        },
        issuedAt: new Date('2024-09-10'),
        expiresAt: new Date('2026-12-31')
      },
      {
        userId: createdUsers[1].id, // Bob
        issuerId: createdIssuers[0].id, // Proof University
        type: 'EDUCATION_DEGREE',
        title: 'Master of Business Administration',
        description: 'Graduate degree in Business Administration',
        credentialHash: ethers.keccak256(ethers.toUtf8Bytes('degree-bob-1')),
        status: 'ACTIVE',
        data: {
          studentId: 'MBA2024002',
          specialization: 'Finance',
          thesisTitle: 'Blockchain in Financial Services'
        },
        metadata: {
          program: 'MBA',
          faculty: 'Business',
          ipfsCID: 'QmTestCID3'
        },
        issuedAt: new Date('2024-05-20'),
        expiresAt: null
      },
      {
        userId: createdUsers[2].id, // Charlie
        issuerId: createdIssuers[2].id, // Healthcare Professionals Council
        type: 'PROFESSIONAL_LICENSE',
        title: 'Medical Doctor License',
        description: 'Licensed medical practitioner',
        credentialHash: ethers.keccak256(ethers.toUtf8Bytes('license-charlie-1')),
        status: 'ACTIVE',
        data: {
          licenseNumber: 'MD-2024-003',
          specialty: 'General Practice',
          registrationDate: '2024-01-15'
        },
        metadata: {
          profession: 'Medical Doctor',
          regulatoryBody: 'HPC',
          ipfsCID: 'QmTestCID4'
        },
        issuedAt: new Date('2024-01-15'),
        expiresAt: new Date('2025-12-31') // Requires renewal
      }
    ];

    const createdCredentials = [];
    for (const credentialData of testCredentials) {
      const credential = await prisma.credential.create({
        data: credentialData
      });
      
      createdCredentials.push(credential);
      console.log(`   Created credential: ${credential.title} for ${credentialData.userId === createdUsers[0].id ? 'Alice' : credentialData.userId === createdUsers[1].id ? 'Bob' : 'Charlie'}`);
    }
    console.log('✅ Test credentials created\n');

    // Create test verifications
    console.log('🔍 Creating test verifications...');
    
    const testVerifications = [
      {
        credentialId: createdCredentials[0].id, // Alice's degree
        verifierId: createdUsers[3].id, // David (verifier)
        proofHash: ethers.keccak256(ethers.toUtf8Bytes('proof-1')).substring(0, 64),
        status: 'VERIFIED',
        verificationResult: {
          valid: true,
          attributes: ['has_degree', 'computer_science'],
          timestamp: new Date('2024-10-01').toISOString()
        },
        verifiedAt: new Date('2024-10-01'),
        ipAddress: '192.168.1.100',
        reason: 'Employment verification'
      },
      {
        credentialId: createdCredentials[1].id, // Alice's certification
        verifierId: createdUsers[4].id, // Eve (verifier)
        proofHash: ethers.keccak256(ethers.toUtf8Bytes('proof-2')).substring(0, 64),
        status: 'VERIFIED',
        verificationResult: {
          valid: true,
          attributes: ['blockchain_certified'],
          timestamp: new Date('2024-10-05').toISOString()
        },
        verifiedAt: new Date('2024-10-05'),
        ipAddress: '192.168.1.101',
        reason: 'Freelance project verification'
      },
      {
        credentialId: createdCredentials[2].id, // Bob's MBA
        verifierId: createdUsers[3].id, // David (verifier)
        proofHash: ethers.keccak256(ethers.toUtf8Bytes('proof-3')).substring(0, 64),
        status: 'REJECTED',
        verificationResult: {
          valid: false,
          error: 'Issuer verification failed',
          timestamp: new Date('2024-10-10').toISOString()
        },
        verifiedAt: new Date('2024-10-10'),
        ipAddress: '192.168.1.102',
        reason: 'Job application verification'
      }
    ];

    for (const verificationData of testVerifications) {
      await prisma.verification.create({
        data: verificationData
      });
      
      console.log(`   Created verification: ${verificationData.status} for credential ${verificationData.credentialId.substring(0, 8)}...`);
    }
    console.log('✅ Test verifications created\n');

    // Create admin user
    console.log('👑 Creating admin user...');
    
    const adminDID = generateDID('0x0000000000000000000000000000000000000000');
    const adminUser = await prisma.user.create({
      data: {
        walletAddress: '0x0000000000000000000000000000000000000000',
        did: adminDID.did,
        name: 'System Administrator',
        email: 'admin@proofidentity.com',
        role: 'ADMIN'
      }
    });
    
    console.log(`✅ Admin user created: ${adminUser.name}\n`);

    // Summary
    console.log('📊 Seeding Summary:');
    console.log(`   Users: ${createdUsers.length + 1} (including admin)`);
    console.log(`   Issuers: ${createdIssuers.length}`);
    console.log(`   Credentials: ${createdCredentials.length}`);
    console.log(`   Verifications: ${testVerifications.length}`);
    console.log('\n🎉 Database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeding
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };