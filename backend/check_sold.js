const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MarketItem = require('./models/MarketItem');

async function checkSold() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const soldItems = await MarketItem.find({ status: 'sold' }, 'tokenId seller price title');
        console.log('--- Sold Items ---');
        console.log(JSON.stringify(soldItems, null, 2));
        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

checkSold();
