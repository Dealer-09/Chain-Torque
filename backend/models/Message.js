const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    senderWallet: {
        type: String,
        required: true,
        lowercase: true,
        index: true
    },
    receiverWallet: {
        type: String,
        required: true,
        lowercase: true,
        index: true
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    read: {
        type: Boolean,
        default: false
    },
}, {
    timestamps: true,
    collection: 'messages'
});

// Compound index for querying a chat history between two users efficiently
MessageSchema.index({ senderWallet: 1, receiverWallet: 1, createdAt: 1 });

module.exports = mongoose.model('Message', MessageSchema);
