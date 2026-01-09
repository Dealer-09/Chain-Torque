require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const PendingUpload = require('../models/PendingUpload');
const MarketItem = require('../models/MarketItem');

async function cleanupGhostFiles() {
    try {
        console.log('🧹 Starting Storage Cleanup Task...');

        // Connect to DB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Checking for ghost files > 24 hours old...');

        // 1. Find pending uploads older than 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const staleUploads = await PendingUpload.find({
            createdAt: { $lt: oneDayAgo },
            status: 'pending'
        });

        if (staleUploads.length === 0) {
            console.log('✨ No stale uploads found. Storage is clean.');
            process.exit(0);
        }

        console.log(`found ${staleUploads.length} potentially stale uploads.`);

        // 2. Verify against MarketItems (Double Check)
        // It's possible status wasn't updated but item exists
        let garbageCount = 0;

        for (const upload of staleUploads) {
            const mintedItem = await MarketItem.findOne({ tokenURI: upload.tokenURI });

            if (mintedItem) {
                // It WAS minted, just status mismatch. Update and ignore.
                upload.status = 'minted';
                await upload.save();
                console.log(`[Fix] Upload ${upload._id} was actually minted. Status updated.`);
            } else {
                // TRUE GARBAGE
                garbageCount++;
                upload.status = 'garbage';
                await upload.save();

                // HERE is where we would call Lighthouse DELETE API
                // await lighthouse.delete(upload.tokenURI) ...

                console.warn(`[Garbage] Found Ghost File! TokenURI: ${upload.tokenURI}`);
                console.warn(`          -> Images: ${upload.images.length}, Model: ${upload.modelUrl ? 'Yes' : 'No'}`);
                console.warn(`          -> Action: Marked as 'garbage' in DB.`);
            }
        }

        console.log('-----------------------------------');
        console.log(`Cleanup Complete.`);
        console.log(`Total Scanned: ${staleUploads.length}`);
        console.log(`Confirmed Garbage: ${garbageCount} (Ready for deletion)`);
        console.log('-----------------------------------');

        process.exit(0);

    } catch (error) {
        console.error('Cleanup failed:', error);
        process.exit(1);
    }
}

cleanupGhostFiles();
