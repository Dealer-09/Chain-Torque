const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for temporary file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/tmp');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `ai-upload-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage });

/**
 * @route GET /api/ai/test
 * @desc Test AI route
 */
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'AI route is working' });
});

/**
 * @route POST /api/ai/generate-3d
 * @desc Generate a 3D model from a 2D image
 * @access Public (for now)
 */
router.post('/generate-3d', upload.single('image'), async (req, res) => {
    let imagePath = null;
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image provided' });
        }

        imagePath = req.file.path;
        console.log(`[AI] Processing image: ${imagePath}`);

        const { Client, handle_file } = await import('@gradio/client');
        console.log('[AI] @gradio/client imported');

        const client = await Client.connect("frogleo/Image-to-3D", { hf_token: process.env.HF_TOKEN, token: process.env.HF_TOKEN });
        console.log('[AI] Connected to Gradio Space');

        const result = await client.predict("/gen_shape", [
            handle_file(imagePath), // image
            5,      // Inference Steps
            5.5,    // Guidance Scale
            1234,   // Seed
            256,    // Octree Resolution
            8000,   // Number of Chunks
            10000,  // Target Face Number
            true    // Randomize seed
        ]);

        console.log('[AI] Generation successful');

        // Cleanup temporary upload
        if (imagePath && fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }

        if (result.data && result.data.length >= 3) {
            const glbPath = result.data[2]; // e.g. "/static/..."
            const objPath = result.data[3]; // e.g. "/static/..."

            if (glbPath) {
                const spaceUrl = "https://frogleo-image-to-3d.hf.space";
                const fullGlbUrl = glbPath.startsWith("http") ? glbPath : spaceUrl + glbPath;
                const fullObjUrl = objPath ? (objPath.startsWith("http") ? objPath : spaceUrl + objPath) : null;

                return res.json({
                    success: true,
                    modelUrl: fullGlbUrl,
                    glbUrl: fullGlbUrl,
                    objUrl: fullObjUrl,
                    previewHtml: result.data[0]
                });
            }
        }

        throw new Error('Failed to extract model URL from AI response');

    } catch (error) {
        console.error('[AI] Error:', error);

        // Cleanup on error if file still exists
        if (imagePath && fs.existsSync(imagePath)) {
            try {
                fs.unlinkSync(imagePath);
            } catch (unlinkErr) {
                console.error('[AI] Cleanup error:', unlinkErr);
            }
        }

        res.status(500).json({
            success: false,
            message: 'Failed to generate 3D model',
            error: error.message
        });
    }
});

module.exports = router;
