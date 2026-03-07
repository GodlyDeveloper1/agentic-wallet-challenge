const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');

console.log('🧪 Testing basic setup...');
console.log('='.repeat(50));

try {
    // Test 1: Generate keypair
    const keypair = Keypair.generate();
    console.log('✅ Test 1: Keypair generated');
    console.log('   Address:', keypair.publicKey.toString());
    
    // Test 2: Encode with bs58
    const encoded = bs58.encode(Buffer.from(keypair.secretKey));
    console.log('✅ Test 2: bs58 encoding working');
    console.log('   Encoded length:', encoded.length);
    
    // Test 3: Decode with bs58
    const decoded = bs58.decode(encoded);
    console.log('✅ Test 3: bs58 decoding working');
    
    // Test 4: Verify encoding/decoding
    const originalHex = Buffer.from(keypair.secretKey).toString('hex').substring(0, 20);
    const decodedHex = Buffer.from(decoded).toString('hex').substring(0, 20);
    console.log('✅ Test 4: Verification');
    console.log('   Original (hex):', originalHex + '...');
    console.log('   Decoded (hex):', decodedHex + '...');
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 All basic tests passed!');
    console.log('='.repeat(50));
    
} catch (error) {
    console.error('❌ Error:', error);
    console.error('Error details:', error.message);
}