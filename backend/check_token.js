// Quick script to check for tokenId 5 in the database
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import the MarketItem model
const MarketItem = require('./models/MarketItem');

async function checkToken() {
    try {
        // Connect to MongoDB
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✓ Connected to MongoDB\n');
        console.log('='.repeat(80));

        // Search for tokenId 5
        console.log('\n🔍 SEARCHING FOR TOKEN ID 5...\n');
        const token5 = await MarketItem.find({ tokenId: 5 });

        if (token5.length > 0) {
            console.log('✅ YES - TOKEN 5 EXISTS!\n');
            console.log('Documents found:', token5.length);
            console.log('\nCOMPLETE DOCUMENT(S):\n');
            token5.forEach((item, index) => {
                console.log(`\n--- Document ${index + 1} ---`);
                console.log(JSON.stringify(item.toObject(), null, 2));
            });
        } else {
            console.log('❌ NO - No item with tokenId 5 found');
        }

        console.log('\n' + '='.repeat(80));

        // Get all active marketplace items
        console.log('\n🔍 ALL ACTIVE MARKETPLACE ITEMS...\n');
        const activeItems = await MarketItem.find({ status: 'active' })
            .select('tokenId title status seller price')
            .sort({ tokenId: 1 });

        console.log(`Total active items: ${activeItems.length}\n`);
        console.log('Token IDs in database (active items):');
        activeItems.forEach(item => {
            console.log(`  - Token ${item.tokenId}: "${item.title}" (${item.status}) - ${item.price} ETH - Seller: ${item.seller}`);
        });

        // Get ALL items (including sold/canceled)
        console.log('\n' + '='.repeat(80));
        console.log('\n🔍 ALL ITEMS (INCLUDING SOLD/CANCELED)...\n');
        const allItems = await MarketItem.find({})
            .select('tokenId title status seller price')
            .sort({ tokenId: 1 });

        console.log(`Total items (all statuses): ${allItems.length}\n`);
        console.log('All Token IDs:');
        allItems.forEach(item => {
            console.log(`  - Token ${item.tokenId}: "${item.title}" (${item.status}) - ${item.price} ETH - Seller: ${item.seller}`);
        });

        console.log('\n' + '='.repeat(80));
        console.log('\n✓ Query complete!\n');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error);
    } finally {
        // Close the connection
        await mongoose.connection.close();
        console.log('Database connection closed.');
    }
}

// Run the check
checkToken();
