const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' }); // Load env from parent dir if needed, or current

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err);
        process.exit(1);
    }
};

const wipeDB = async () => {
    await connectDB();

    try {
        console.log('Wiping database...');

        const collections = await mongoose.connection.db.collections();

        for (let collection of collections) {
            console.log(`Dropping collection: ${collection.collectionName}`);
            try {
                await collection.drop();
            } catch (error) {
                if (error.code === 26) {
                    console.log(`Collection ${collection.collectionName} does not exist.`);
                } else {
                    throw error;
                }
            }
        }

        console.log('Database wiped successfully!');
    } catch (error) {
        console.error('Error wiping database:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

wipeDB();
