const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('./models/User');

async function checkStats() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const users = await User.find({}, 'username displayName stats');
        console.log('User Stats:');
        console.log(JSON.stringify(users, null, 2));

        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

checkStats();
