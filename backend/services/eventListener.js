const { web3Manager: web3 } = require('../web3');
const MarketItem = require('../models/MarketItem');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { ethers } = require('ethers');

class EventListener {
    constructor() {
        this.isListening = false;
    }

    async start() {
        if (this.isListening) {
            console.log('[EventListener] Already listening.');
            return;
        }

        // Wait for Web3 to be ready
        if (!web3.isReady()) {
            console.log('[EventListener] Web3 not ready. Retrying in 5s...');
            setTimeout(() => this.start(), 5000);
            return;
        }

        try {
            console.log('[EventListener] Starting blockchain event polling (Manual Mode)...');

            // Start from current block to avoid parsing entire history on reboot
            // In a production app, you'd store the last processed block in DB to recover missing events
            this.lastProcessedBlock = await web3.provider.getBlockNumber();
            console.log(`[EventListener] Starting from block ${this.lastProcessedBlock}`);

            this.isListening = true;

            // Poll every 10 seconds
            setInterval(() => this.pollEvents(), 10000);

        } catch (error) {
            console.error('[EventListener] Start failed:', error);
            setTimeout(() => this.start(), 10000);
        }
    }

    async pollEvents() {
        if (!web3.isReady()) return;

        try {
            const currentBlock = await web3.provider.getBlockNumber();

            // Only query if there are new blocks
            if (currentBlock <= this.lastProcessedBlock) return;

            const contract = web3.contract;
            const fromBlock = this.lastProcessedBlock + 1; // Don't re-process last block completely
            const toBlock = currentBlock;

            // console.log(`[EventListener] Scanning blocks ${fromBlock} to ${toBlock}...`);

            // 1. Fetch MarketItemCreated Events
            const createdEvents = await contract.queryFilter('MarketItemCreated', fromBlock, toBlock);
            for (const event of createdEvents) {
                await this.handleItemCreated(event);
            }

            // 2. Fetch MarketItemSold Events
            const soldEvents = await contract.queryFilter('MarketItemSold', fromBlock, toBlock);
            for (const event of soldEvents) {
                await this.handleItemSold(event);
            }

            // 3. Fetch MarketItemRelisted Events
            const relistedEvents = await contract.queryFilter('MarketItemRelisted', fromBlock, toBlock);
            for (const event of relistedEvents) {
                await this.handleItemRelisted(event);
            }

            // Update state
            this.lastProcessedBlock = currentBlock;

        } catch (err) {
            console.error('[EventListener] Polling error:', err.message);
        }
    }

    async handleItemCreated(event) {
        try {
            const { tokenId, seller, price, categoryId } = event.args;
            console.log(`[EventListener] New Item Detected: #${tokenId}`);

            const exists = await MarketItem.findOne({ tokenId: Number(tokenId) });
            if (exists) return;

            console.log(`[EventListener] Item #${tokenId} missing from DB. Attempting auto-sync...`);

            const contract = web3.contract;
            const tokenURI = await contract.tokenURI(tokenId);

            let title = `NFT #${tokenId}`;
            let description = '';
            let imageUrl = '';
            let modelUrl = '';
            let images = [];

            // Fetch IPFS Metadata
            if (tokenURI.startsWith('http') || tokenURI.startsWith('ipfs')) {
                const url = tokenURI.startsWith('ipfs://')
                    ? tokenURI.replace('ipfs://', 'https://gateway.lighthouse.storage/ipfs/')
                    : tokenURI;

                try {
                    const res = await fetch(url);
                    if (res.ok) {
                        const meta = await res.json();
                        title = meta.name || title;
                        description = meta.description || description;
                        imageUrl = meta.image || '';
                        modelUrl = meta.animation_url || meta.model || '';
                        images = meta.images || (meta.image ? [meta.image] : []);
                    }
                } catch (e) {
                    console.error('[EventListener] Metadata fetch failed:', e.message);
                }
            }

            // Try to resolve username from DB
            let creatorName = 'Creator';
            try {
                // Use findByWallet or manual lowercasing - findByWallet is static on User model
                const user = await User.findOne({ walletAddress: seller.toLowerCase() });
                if (user) {
                    // Prioritize displayName, then username
                    // CRITICAL: NEVER return raw wallet address as name. Default to 'Creator' if no profile name.
                    creatorName = user.displayName || user.username || 'Creator';
                    // console.log(`[EventListener] Resolved creator for #${tokenId}: ${creatorName} (${seller})`);
                } else {
                    // console.log(`[EventListener] No user profile found for seller ${seller}. Using default 'Creator'.`);
                }
            } catch (e) {
                console.warn(`[EventListener] Failed to resolve username for ${seller}: ${e.message}`);
                // Ignore lookup error, keep default
            }

            // Fetch true royalty from contract
            let royaltyPercentage = 0;
            try {
                const itemData = await contract.getMarketItem(tokenId);
                if (itemData && itemData.royalty) {
                    royaltyPercentage = Number(itemData.royalty) / 100; // Convert BPS to %
                    console.log(`[EventListener] Item #${tokenId} Royalty: ${royaltyPercentage}%`);
                }
            } catch (e) {
                console.warn(`[EventListener] Failed to fetch royalty for #${tokenId}: ${e.message}`);
            }

            const newItem = new MarketItem({
                tokenId: Number(tokenId),
                title,
                description,
                price: Number(ethers.formatEther(price)),
                category: web3.getCategoryName(Number(categoryId)),
                imageUrl,
                images,
                modelUrl,
                tokenURI,
                seller: seller.toLowerCase(),
                owner: seller.toLowerCase(),
                creator: seller.toLowerCase(),
                username: creatorName,
                royalty: royaltyPercentage,
                status: 'active',
                transactionHash: event.transactionHash,
                blockNumber: event.blockNumber
            });

            await newItem.save();
            console.log(`[EventListener] Successfully auto-synced Item #${tokenId}`);

        } catch (err) {
            // Handle duplicate key error (race condition between eventListener and manual sync)
            if (err.code === 11000 || err.message?.includes('duplicate key')) {
                console.log(`[EventListener] ℹ️ Item #${tokenId} already exists (race condition handled)`);
            } else {
                console.error('[EventListener] Error processing MarketItemCreated:', err);
            }
        }
    }

    async handleItemSold(event) {
        try {
            const { tokenId, buyer, seller, price } = event.args;
            console.log(`[EventListener] Sale Detected: #${tokenId} sold to ${buyer}`);

            const item = await MarketItem.findOne({ tokenId: Number(tokenId) });
            if (!item) return;

            if (item.status === 'sold') return;

            // Update Item
            item.status = 'sold';
            item.owner = buyer.toLowerCase();
            item.soldAt = new Date();
            await item.save();

            // Record Transaction
            const txExists = await Transaction.findOne({ transactionHash: event.transactionHash });
            if (!txExists) {
                const newTx = new Transaction({
                    transactionHash: event.transactionHash,
                    blockNumber: event.blockNumber,
                    tokenId: Number(tokenId),
                    contractAddress: web3.contract.target,
                    type: 'purchase',
                    price: Number(ethers.formatEther(price)),
                    currency: 'ETH',
                    buyer: buyer.toLowerCase(),
                    seller: seller.toLowerCase(),
                    status: 'confirmed',
                    metadata: {
                        tokenURI: item.tokenURI,
                        title: item.title,
                        category: item.category,
                    },
                    confirmedAt: new Date()
                });
                await newTx.save();
                console.log(`[EventListener] Recorded transaction for #${tokenId}`);
            }

            // Update User Stats dynamically handling royalties
            const priceEth = Number(ethers.formatEther(price));
            const platformFeeEth = priceEth * 0.025;
            const royaltyPercentage = item.royalty || 0;
            const royaltyEth = priceEth * (royaltyPercentage / 100);
            const sellerEarnedEth = priceEth - platformFeeEth - royaltyEth;

            await this.updateDynamicStats(
                seller.toLowerCase(),
                buyer.toLowerCase(),
                item.creator ? item.creator.toLowerCase() : null,
                priceEth,
                sellerEarnedEth,
                royaltyEth
            );

        } catch (err) {
            console.error('[EventListener] Error processing MarketItemSold:', err);
        }
    }

    async handleItemRelisted(event) {
        try {
            const { tokenId, seller, price } = event.args;
            console.log(`[EventListener] Relist Detected: #${tokenId} relisted by ${seller} for ${ethers.formatEther(price)} ETH`);

            const item = await MarketItem.findOne({ tokenId: Number(tokenId) });
            if (!item) {
                console.warn(`[EventListener] Relisted item #${tokenId} not found in DB`);
                return;
            }

            // Ensure we aren't processing an old event unnecessarily if we somehow already set it
            // Active items that are relisted might be an edge case if they just changed price, but usually it transitions from sold -> active

            // Update Item
            item.status = 'active';
            item.price = Number(ethers.formatEther(price));
            item.seller = seller.toLowerCase();
            // In the contract, the owner is the marketplace itself now (in escrow)
            item.owner = web3.contract.target.toLowerCase();

            // Try to resolve username from DB for the new seller
            try {
                const user = await User.findOne({ walletAddress: seller.toLowerCase() });
                if (user) {
                    item.username = user.displayName || user.username || 'Creator';
                }
            } catch (e) {
                console.warn(`[EventListener] Failed to resolve username for relisted seller ${seller}: ${e.message}`);
            }

            await item.save();
            console.log(`[EventListener] Document updated for Relisted item #${tokenId}`);

        } catch (err) {
            console.error('[EventListener] Error processing MarketItemRelisted:', err);
        }
    }

    async updateDynamicStats(sellerAddr, buyerAddr, creatorAddr, priceEth, sellerEarnedEth, royaltyEth) {
        try {
            // Update Buyer
            await User.updateOne(
                { walletAddress: buyerAddr },
                { $inc: { 'stats.totalPurchased': 1, 'stats.totalSpent': priceEth } },
                { upsert: true }
            );

            // Update Seller (if not contract/null)
            if (sellerAddr && !/^0x0+$/.test(sellerAddr)) {
                await User.updateOne(
                    { walletAddress: sellerAddr },
                    { $inc: { 'stats.totalSold': 1, 'stats.totalEarned': sellerEarnedEth } }
                );
            }

            // Update Creator (Royalty)
            if (royaltyEth > 0 && creatorAddr && !/^0x0+$/.test(creatorAddr)) {
                await User.updateOne(
                    { walletAddress: creatorAddr },
                    { $inc: { 'stats.totalEarned': royaltyEth } } // Could add stats.totalRoyalties in schema later if desired
                );
            }
        } catch (e) {
            console.error('[EventListener] Stats update failed:', e);
        }
    }
}

module.exports = new EventListener();
