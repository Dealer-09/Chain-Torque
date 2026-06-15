/**
 * One-time DB backfill script
 * For every MarketItem with empty imageUrl/modelUrl, fetches its tokenURI
 * IPFS metadata and patches the DB record with real title, images, modelUrl.
 *
 * Run with:  node scripts/backfill-ipfs.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const MarketItem = require('../models/MarketItem');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

// Normalise any IPFS URL to Pinata gateway
function resolveIpfsUrl(url) {
  if (!url) return '';
  const match = url.match(/\/ipfs\/(.+)$/);
  if (match) return `https://gateway.pinata.cloud/ipfs/${match[1]}`;
  if (url.startsWith('ipfs://')) return `https://gateway.pinata.cloud/ipfs/${url.slice(7)}`;
  return url;
}

async function fetchMeta(tokenURI) {
  const url = resolveIpfsUrl(tokenURI);
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function run() {
  if (!MONGO_URI) {
    console.error('❌  MONGO_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log('✅  Connected to MongoDB');

  // Find all items missing image data
  const items = await MarketItem.find({
    $or: [
      { imageUrl: { $in: ['', null] } },
      { modelUrl: { $in: ['', null] } },
    ]
  });

  console.log(`\nFound ${items.length} item(s) with missing image/model data.\n`);

  let patched = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of items) {
    const tag = `Token #${item.tokenId}`;

    // Skip broken tokenURIs
    if (!item.tokenURI || item.tokenURI.includes('undefined')) {
      console.log(`⚠️  ${tag}: tokenURI is broken — ${item.tokenURI || '(empty)'} — skipping`);
      skipped++;
      continue;
    }

    try {
      console.log(`🔄  ${tag}: fetching ${resolveIpfsUrl(item.tokenURI)}`);
      const meta = await fetchMeta(item.tokenURI);

      let changed = false;

      // Title
      if (meta.name && item.title.startsWith('CAD Model #')) {
        item.title = meta.name;
        changed = true;
      }

      // Description
      if (meta.description && !item.description) {
        item.description = meta.description;
        changed = true;
      }

      // Image
      const rawImage = meta.image || (Array.isArray(meta.images) && meta.images[0]) || '';
      if (rawImage && !item.imageUrl) {
        item.imageUrl = resolveIpfsUrl(rawImage);
        changed = true;
      }

      // Images array
      if (!item.images || item.images.length === 0) {
        if (Array.isArray(meta.images) && meta.images.length > 0) {
          item.images = meta.images.map(resolveIpfsUrl);
          changed = true;
        } else if (rawImage) {
          item.images = [resolveIpfsUrl(rawImage)];
          changed = true;
        }
      }

      // Model URL (stored as animation_url in IPFS metadata)
      const rawModel = meta.animation_url || meta.model || '';
      if (rawModel && !item.modelUrl) {
        item.modelUrl = resolveIpfsUrl(rawModel);
        changed = true;
      }

      if (changed) {
        await item.save();
        console.log(`  ✅  ${tag} patched — title="${item.title}" imageUrl="${item.imageUrl}" modelUrl="${item.modelUrl}"`);
        patched++;
      } else {
        console.log(`  ℹ️  ${tag}: IPFS has no new data to add`);
        skipped++;
      }
    } catch (err) {
      console.error(`  ❌  ${tag}: fetch failed — ${err.message}`);
      failed++;
    }
  }

  console.log(`\n--- Backfill complete ---`);
  console.log(`  Patched : ${patched}`);
  console.log(`  Skipped : ${skipped}`);
  console.log(`  Failed  : ${failed}`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
