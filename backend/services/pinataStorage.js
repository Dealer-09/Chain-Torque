const { PinataSDK } = require('pinata');
const path = require('path');
const fs = require('fs');

// Initialize Pinata with JWT (recommended for production)
const jwt = process.env.PINATA_JWT;
const apiKey = process.env.PINATA_API_KEY;
const apiSecret = process.env.PINATA_API_SECRET;

if (!jwt && (!apiKey || !apiSecret)) {
  console.error('[Pinata] ❌ Missing credentials! Provide PINATA_JWT or both PINATA_API_KEY and PINATA_API_SECRET');
}

console.log('[Pinata] Initialized with', jwt ? 'JWT' : 'API Key/Secret');

/**
 * Upload a file to Pinata IPFS
 * @param {string} filePath - Path to the file to upload
 * @returns {Promise<{cid: string, url: string}>}
 */
async function uploadFile(filePath) {
  try {
    console.log('[Pinata] Attempting to upload file:', filePath);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const pinata = new PinataSDK({
      pinataJwt: jwt,
      pinataGateway: 'gateway.pinata.cloud',
    });

    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer]);
    const file = new File([blob], path.basename(filePath), { type: 'application/octet-stream' });
    
    // Some pinata versions use upload.file, others upload.public.file.
    const uploadFunc = pinata.upload.public ? pinata.upload.public.file : pinata.upload.file;
    const response = await uploadFunc.call(pinata.upload, file);
    
    const cid = response.cid || response.IpfsHash;
    console.log('[Pinata] Upload successful:', cid);
    
    return {
      cid: cid,
      url: `https://gateway.pinata.cloud/ipfs/${cid}`,
    };
  } catch (error) {
    console.error('[Pinata] Upload failed:', error.message);
    throw new Error(`Pinata file upload failed: ${error.message}`);
  }
}

async function uploadMetadata(metadata) {
  try {
    console.log('[Pinata] Attempting to upload metadata');

    const pinata = new PinataSDK({
      pinataJwt: jwt,
      pinataGateway: 'gateway.pinata.cloud',
    });

    const uploadFunc = pinata.upload.public ? pinata.upload.public.json : pinata.upload.json;
    const response = await uploadFunc.call(pinata.upload, metadata);
    
    const cid = response.cid || response.IpfsHash;
    console.log('[Pinata] Metadata upload successful:', cid);
    
    return {
      cid: cid,
      url: `https://gateway.pinata.cloud/ipfs/${cid}`,
    };
  } catch (error) {
    console.error('[Pinata] Metadata upload failed:', error.message);
    throw new Error(`Pinata metadata upload failed: ${error.message}`);
  }
}

module.exports = { uploadFile, uploadMetadata };
