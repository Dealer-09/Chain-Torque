const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Message = require('../models/Message');

// Get Top Sellers to populate Chat Sidebar
router.get('/top-sellers', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 12;
        // Find all users who are not banned, sorted by selling volume and earnings
        const topSellers = await User.find({ isBanned: false })
            .sort({ 'stats.totalSold': -1, 'stats.totalEarned': -1, 'lastActive': -1 })
            .limit(limit)
            .select('walletAddress username displayName avatar stats isVerified');

        res.json({ success: true, topSellers });
    } catch (error) {
        console.error('Error fetching top sellers for chat:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch top sellers', error: error.message });
    }
});

// Get chat history between current user and specified user
router.get('/history', async (req, res) => {
    try {
        const { user1, user2 } = req.query; // wallet addresses
        if (!user1 || !user2) {
            return res.status(400).json({ success: false, message: 'user1 and user2 wallet addresses are required.' });
        }

        const messages = await Message.find({
            $or: [
                { senderWallet: user1.toLowerCase(), receiverWallet: user2.toLowerCase() },
                { senderWallet: user2.toLowerCase(), receiverWallet: user1.toLowerCase() }
            ]
        }).sort({ createdAt: 1 }); // Oldest first for chat UI

        res.json({ success: true, messages });
    } catch (error) {
        console.error('Error fetching chat history:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch chat history', error: error.message });
    }
});

// Mark messages as read
router.post('/mark-read', async (req, res) => {
    try {
        const { senderWallet, receiverWallet } = req.body;
        if (!senderWallet || !receiverWallet) {
            return res.status(400).json({ success: false, message: 'senderWallet and receiverWallet are required.' });
        }

        await Message.updateMany(
            { senderWallet: senderWallet.toLowerCase(), receiverWallet: receiverWallet.toLowerCase(), read: false },
            { $set: { read: true } }
        );

        res.json({ success: true, message: 'Messages marked as read' });
    } catch (error) {
        console.error('Error marking messages as read:', error.message);
        res.status(500).json({ success: false, message: 'Failed to mark records as read', error: error.message });
    }
});

module.exports = router;
