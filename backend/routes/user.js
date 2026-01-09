const express = require('express');
const router = express.Router();
const User = require('../models/User');
const MarketItem = require('../models/MarketItem');
const { web3Manager } = require('../web3'); // Ensure this export exists or update web3.js
// Note: We might need to adjust the import of web3 depending on how it's exported.
// In server.js it was `const web3 = new Web3Manager()`. Ideally we should have a singleton export.

// User registration/login endpoint
router.post('/register', async (req, res, next) => {
    try {
        const { walletAddress, username, email } = req.body;

        if (!walletAddress) {
            return res.status(400).json({ success: false, message: 'Wallet address is required' });
        }

        // Check if user already exists
        let user = await User.findByWallet(walletAddress);

        if (!user) {
            // Create new user
            user = new User({
                walletAddress: walletAddress.toLowerCase(),
                username,
                email,
                lastActive: new Date()
            });
            await user.save();
        } else {
            // Update last active
            await user.updateLastActive();
        }

        res.json({
            success: true,
            user: {
                walletAddress: user.walletAddress,
                username: user.username,
                displayName: user.displayName,
                avatar: user.avatar,
                stats: user.stats,
                isVerified: user.isVerified
            }
        });
    } catch (error) {
        console.error('User registration error:', error.message);
        res.status(500).json({ success: false, message: 'User registration failed', error: error.message });
    }
});

// Get NFTs owned by a user - Auto-sync
router.get('/:address/nfts', async (req, res) => {
    const userAddress = req.params.address.toLowerCase();

    try {
        // Auto-Sync: Check chain for actual ownership
        if (web3Manager.isReady()) {
            try {
                // Get list of Token IDs owned by user from Smart Contract
                const result = await web3Manager.getUserTokens(userAddress);

                if (result.success && result.tokenIds.length > 0) {
                    console.log(`[Auto-Sync] checking ${result.tokenIds.length} tokens for user ${userAddress}`);

                    for (const tokenId of result.tokenIds) {
                        const item = await MarketItem.findOne({ tokenId: tokenId });

                        // If item exists but DB says owner is someone else (or it's active)
                        if (item && (item.owner.toLowerCase() !== userAddress || item.status === 'active')) {
                            console.log(`[Auto-Sync] correcting ownership for item #${tokenId}`);
                            item.owner = userAddress;
                            item.status = 'sold';
                            if (!item.soldAt) item.soldAt = new Date();
                            await item.save();
                        }
                    }
                }
            } catch (syncError) {
                console.warn('[Auto-Sync] Warning: Failed to sync with blockchain:', syncError.message);
                // Continue to serve DB data even if sync fails
            }
        }

        // Query DB directly
        const userNFTs = await MarketItem.find({
            $or: [
                { owner: userAddress },
                { seller: userAddress }
            ]
        });
        res.json({ success: true, nfts: userNFTs });
    } catch (error) {
        console.error('Error fetching user NFTs:', error.message);
        res.status(404).json({ success: false, error: error.message });
    }
});

// Get user purchases (Transactions + Owned Items) - Returns FULL MarketItem data for CAD editing
router.get('/:address/purchases', async (req, res) => {
    const userAddress = req.params.address.toLowerCase();
    try {
        // PRIMARY SOURCE: Get all MarketItems owned by this user (these are purchased items)
        // After purchase: owner = buyer, seller = original seller (preserved), status = sold
        const ownedItems = await MarketItem.find({
            owner: userAddress,
            status: 'sold'
        }).lean();

        // Also check items where user is explicitly marked as owner even if status is different
        const additionalOwned = await MarketItem.find({
            owner: userAddress,
            status: { $ne: 'active' }, // Not actively listed = owned
            _id: { $nin: ownedItems.map(i => i._id) } // Avoid duplicates
        }).lean();

        const allOwnedItems = [...ownedItems, ...additionalOwned];

        // Filter out items user created themselves
        // Check both seller (now preserved) and creator fields
        const purchases = allOwnedItems.filter(item => {
            // If seller is this user, they created it - not a purchase
            if (item.seller && item.seller.toLowerCase() === userAddress) return false;
            // Also check creator field as backup
            if (item.creator && item.creator.toLowerCase() === userAddress) return false;
            // Otherwise it's a purchase
            return true;
        });

        // Get transaction records for additional metadata (purchase date, hash, etc.)
        const Transaction = require('../models/Transaction');
        const txMap = new Map();

        const purchaseTokenIds = purchases.map(p => p.tokenId);
        if (purchaseTokenIds.length > 0) {
            const txRecords = await Transaction.find({
                buyer: userAddress,
                tokenId: { $in: purchaseTokenIds },
                type: 'purchase',
                status: 'confirmed'
            }).lean();

            txRecords.forEach(tx => txMap.set(tx.tokenId, tx));
        }

        // Format response with FULL item data including modelUrl
        const formattedPurchases = purchases.map(item => {
            const tx = txMap.get(item.tokenId);
            return {
                // Full MarketItem data for CAD access
                _id: item._id,
                tokenId: item.tokenId,
                title: item.title || `Model #${item.tokenId}`,
                description: item.description,
                price: item.price,
                category: item.category,
                imageUrl: item.imageUrl,
                images: item.images || [],
                modelUrl: item.modelUrl, // CRITICAL: This enables CAD editing
                tokenURI: item.tokenURI,
                seller: item.seller,
                owner: item.owner,
                status: item.status,

                // Transaction metadata
                transactionHash: tx?.transactionHash || item.transactionHash || '0x',
                purchasedAt: tx?.confirmedAt || item.soldAt || item.updatedAt,
                blockNumber: tx?.blockNumber || item.blockNumber,

                // Legacy compatibility fields
                metadata: {
                    title: item.title,
                    image: item.imageUrl,
                    modelUrl: item.modelUrl
                }
            };
        }).sort((a, b) => new Date(b.purchasedAt) - new Date(a.purchasedAt));

        res.json({
            success: true,
            purchases: formattedPurchases,
            data: formattedPurchases, // Alternate key for frontend compatibility
            count: formattedPurchases.length
        });
    } catch (error) {
        console.error('Error fetching user purchases:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
