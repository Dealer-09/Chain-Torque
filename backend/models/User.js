const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  // Wallet information
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },

  // Profile information
  username: {
    type: String,
    trim: true,
    maxlength: 50
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: 100
  },
  bio: {
    type: String,
    maxlength: 500
  },
  avatar: {
    type: String // URL to avatar image
  },

  // Contact and social
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true, // Allow multiple null values but unique non-null values
    unique: true
  },
  website: {
    type: String,
    trim: true
  },
  social: {
    twitter: String,
    discord: String,
    instagram: String,
    linkedin: String
  },

  // User preferences
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sales: { type: Boolean, default: true },
      purchases: { type: Boolean, default: true },
      follows: { type: Boolean, default: true }
    },
    privacy: {
      showEmail: { type: Boolean, default: false },
      showTransactions: { type: Boolean, default: true },
      showCollection: { type: Boolean, default: true }
    }
  },

  // Activity tracking
  stats: {
    totalCreated: { type: Number, default: 0 },
    totalSold: { type: Number, default: 0 },
    totalPurchased: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 }
  },

  // User status
  isVerified: {
    type: Boolean,
    default: false
  },
  isCreator: {
    type: Boolean,
    default: false
  },
  isBanned: {
    type: Boolean,
    default: false
  },

  // Metadata
  firstTransactionDate: {
    type: Date
  },
  lastActive: {
    type: Date,
    default: Date.now
  },

  // Following/Followers (for future social features)
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true,
  collection: 'users'
});

// Indexes
UserSchema.index({ username: 1 }, { sparse: true });
UserSchema.index({ isCreator: 1, 'stats.totalCreated': -1 });
UserSchema.index({ lastActive: -1 });

// Virtual for follower count
UserSchema.virtual('followerCount').get(function () {
  return this.followers.length;
});

UserSchema.virtual('followingCount').get(function () {
  return this.following.length;
});

// Instance methods
UserSchema.methods.updateLastActive = function () {
  this.lastActive = new Date();
  return this.save();
};

UserSchema.methods.incrementStat = async function (statName, value = 1) {
  const validStats = ['totalCreated', 'totalSold', 'totalPurchased', 'totalEarned', 'totalSpent'];
  if (!validStats.includes(statName)) {
    throw new Error(`Invalid stat name: ${statName}`);
  }
  // Use updateOne with $inc to avoid save() middleware conflicts
  return this.constructor.updateOne(
    { _id: this._id },
    { $inc: { [`stats.${statName}`]: value } }
  );
};

UserSchema.methods.follow = function (userToFollow) {
  if (!this.following.includes(userToFollow._id)) {
    this.following.push(userToFollow._id);
    userToFollow.followers.push(this._id);
    return Promise.all([this.save(), userToFollow.save()]);
  }
};

UserSchema.methods.unfollow = function (userToUnfollow) {
  this.following.pull(userToUnfollow._id);
  userToUnfollow.followers.pull(this._id);
  return Promise.all([this.save(), userToUnfollow.save()]);
};

// Static methods
UserSchema.statics.findByWallet = function (walletAddress) {
  return this.findOne({ walletAddress: walletAddress.toLowerCase() });
};

UserSchema.statics.getTopCreators = function (limit = 10) {
  return this.find({ isCreator: true })
    .sort({ 'stats.totalCreated': -1, 'stats.totalEarned': -1 })
    .limit(limit)
    .select('walletAddress username displayName avatar stats isVerified');
};

UserSchema.statics.getActiveUsers = function (days = 30, limit = 50) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return this.find({
    lastActive: { $gte: cutoffDate },
    isBanned: false
  })
    .sort({ lastActive: -1 })
    .limit(limit)
    .select('walletAddress username displayName avatar lastActive');
};

// Pre-save middleware
UserSchema.pre('save', async function () {
  if (this.isNew && !this.firstTransactionDate) {
    this.firstTransactionDate = new Date();
  }
});

module.exports = mongoose.model('User', UserSchema);
