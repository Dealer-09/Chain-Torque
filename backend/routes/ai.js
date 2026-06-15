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
 * @desc Generate a 3D model from a 2D image via Hunyuan3D-2
 * @access Public
 */
router.post('/generate-3d', upload.single('image'), async (req, res) => {
    let imagePath = null;
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image provided' });
        }

        imagePath = req.file.path;
        console.log(`[AI] Processing image: ${imagePath}`);

        // BYOK: prefer the user's own HF token; fall back to server env var.
        // Multer parses multipart fields into req.body alongside the file.
        const hfToken = (req.body?.userHfToken?.trim()) || process.env.HF_TOKEN || null;

        const { Client, handle_file } = await import('@gradio/client');
        console.log('[AI] @gradio/client imported');

        const clientOpts = hfToken ? { hf_token: hfToken, token: hfToken } : {};
        const client = await Client.connect("frogleo/Image-to-3D", clientOpts);
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
            const glbPath = result.data[2];
            const objPath = result.data[3];

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

        if (imagePath && fs.existsSync(imagePath)) {
            try { fs.unlinkSync(imagePath); } catch (unlinkErr) {
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

// ── Gemini helper ─────────────────────────────────────────────────────────────
// Torquy now runs on Gemini 2.5 Flash.
// BYOK: if the client sends a `userApiKey` in the request body, it is used
// instead of the server's GEMINI_API_KEY env var. The user's key is never
// stored server-side — it is used for this request only and then discarded.
// If neither key is available the request is rejected with a helpful message.

const { GoogleGenerativeAI } = require('@google/generative-ai');

function getGeminiModel(userApiKey, systemPrompt) {
    const key = userApiKey || process.env.GEMINI_API_KEY;
    if (!key || !key.trim()) {
        throw new Error(
            'No Gemini API key found. ' +
            'Go to Settings (⚙ top-right) → API Keys tab → paste your key → click Save. ' +
            'Get a free key at https://aistudio.google.com/apikey'
        );
    }
    const trimmedKey = key.trim();
    if (!trimmedKey.startsWith('AIza')) {
        throw new Error(
            'Invalid Gemini API key format. ' +
            'Keys from Google AI Studio always start with "AIza". ' +
            'The key you provided starts with "' + trimmedKey.slice(0, 6) + '..." — ' +
            'make sure you copied a Gemini API Key from https://aistudio.google.com/apikey, ' +
            'not a service account, OAuth token, or key from a different Google product.'
        );
    }
    const genAI = new GoogleGenerativeAI(key.trim());
    return genAI.getGenerativeModel({
        model: 'gemini-3.5-flash',

        // systemInstruction MUST be a Content object, NOT a plain string.
        // Passing a string directly to startChat() causes a 400 Bad Request
        // because the SDK does not auto-wrap it in this version.
        systemInstruction: systemPrompt
            ? { parts: [{ text: systemPrompt }] }
            : undefined,
        generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
        },
    });
}

/**
 * @route POST /api/ai/torquy
 * @desc Process CAD commands via Torquy (Gemini 2.5 Flash).
 *       Accepts an optional `userApiKey` field in the body for BYOK usage.
 */
router.post('/torquy', async (req, res) => {
    try {
        const {
            prompt,
            chatHistory = [],
            workspaceParams = {},
            generationMode = '3d',
            userApiKey,          // BYOK: user-supplied Gemini API key
        } = req.body;

        if (!prompt) {
            return res.status(400).json({ success: false, message: 'No prompt provided' });
        }

        const systemPrompt = `You are Torquy, a 3D CAD geometry engine for ChainTorque. Convert any request into a JSON assembly of primitives. NEVER refuse — approximate everything with cubes, spheres, cylinders, cones, planes.

════ COORDINATE SYSTEM ════
• Y-axis = vertical. +Y = UP. Origin (0,0,0) = center of the assembly.
• Cylinders default to vertical (along Y). To make a horizontal cylinder (arm, pipe, etc.) set rotation.z = 1.5708.
• Parts must TOUCH. If part A has height H at center y=Y, its top edge is at Y + H/2. The next part center must be at Y + H/2 + nextH/2.

════ FULL ASTRONAUT EXAMPLE (copy this structure for humanoid shapes) ════
{
  "reply": "Here is your astronaut in full EVA suit",
  "plan": ["Torso → legs → boots", "Head + helmet + visor", "Arms + gloves", "Backpack + tank"],
  "sketches": [],
  "shapes": [
    {"id":"torso","type":"cylinder","parameters":{"radius":2.5,"height":10},"position":{"x":0,"y":0,"z":0},"rotation":{"x":0,"y":0,"z":0},"color":"#F0EDE8"},
    {"id":"chest_plate","type":"cube","parameters":{"width":3.5,"height":3,"depth":0.6},"position":{"x":0,"y":1.5,"z":2.55},"rotation":{"x":0,"y":0,"z":0},"color":"#8C9BAB"},
    {"id":"neck","type":"cylinder","parameters":{"radius":1.1,"height":1.5},"position":{"x":0,"y":5.75,"z":0},"rotation":{"x":0,"y":0,"z":0},"color":"#8C9BAB"},
    {"id":"helmet","type":"sphere","parameters":{"radius":3},"position":{"x":0,"y":8.5,"z":0},"rotation":{"x":0,"y":0,"z":0},"color":"#F0EDE8"},
    {"id":"visor","type":"sphere","parameters":{"radius":2.55},"position":{"x":0,"y":8.8,"z":2.2},"rotation":{"x":0,"y":0,"z":0},"color":"#7EC8E3"},
    {"id":"left_shoulder","type":"sphere","parameters":{"radius":1.3},"position":{"x":-2.8,"y":4,"z":0},"rotation":{"x":0,"y":0,"z":0},"color":"#D8D4CF"},
    {"id":"right_shoulder","type":"sphere","parameters":{"radius":1.3},"position":{"x":2.8,"y":4,"z":0},"rotation":{"x":0,"y":0,"z":0},"color":"#D8D4CF"},
    {"id":"left_upper_arm","type":"cylinder","parameters":{"radius":0.9,"height":4.5},"position":{"x":-5,"y":3.5,"z":0},"rotation":{"x":0,"y":0,"z":1.5708},"color":"#E8E4DF"},
    {"id":"right_upper_arm","type":"cylinder","parameters":{"radius":0.9,"height":4.5},"position":{"x":5,"y":3.5,"z":0},"rotation":{"x":0,"y":0,"z":1.5708},"color":"#E8E4DF"},
    {"id":"left_lower_arm","type":"cylinder","parameters":{"radius":0.8,"height":3.5},"position":{"x":-8.5,"y":3.5,"z":0},"rotation":{"x":0,"y":0,"z":1.5708},"color":"#D0CCC8"},
    {"id":"right_lower_arm","type":"cylinder","parameters":{"radius":0.8,"height":3.5},"position":{"x":8.5,"y":3.5,"z":0},"rotation":{"x":0,"y":0,"z":1.5708},"color":"#D0CCC8"},
    {"id":"left_glove","type":"sphere","parameters":{"radius":1.1},"position":{"x":-10.8,"y":3.5,"z":0},"rotation":{"x":0,"y":0,"z":0},"color":"#2C2C2C"},
    {"id":"right_glove","type":"sphere","parameters":{"radius":1.1},"position":{"x":10.8,"y":3.5,"z":0},"rotation":{"x":0,"y":0,"z":0},"color":"#2C2C2C"},
    {"id":"left_thigh","type":"cylinder","parameters":{"radius":1.3,"height":6},"position":{"x":-1.4,"y":-8,"z":0},"rotation":{"x":0,"y":0,"z":0},"color":"#E8E4DF"},
    {"id":"right_thigh","type":"cylinder","parameters":{"radius":1.3,"height":6},"position":{"x":1.4,"y":-8,"z":0},"rotation":{"x":0,"y":0,"z":0},"color":"#E8E4DF"},
    {"id":"left_shin","type":"cylinder","parameters":{"radius":1.1,"height":5},"position":{"x":-1.4,"y":-13.5,"z":0},"rotation":{"x":0,"y":0,"z":0},"color":"#D0CCC8"},
    {"id":"right_shin","type":"cylinder","parameters":{"radius":1.1,"height":5},"position":{"x":1.4,"y":-13.5,"z":0},"rotation":{"x":0,"y":0,"z":0},"color":"#D0CCC8"},
    {"id":"left_boot","type":"cube","parameters":{"width":2.5,"height":1.5,"depth":3.5},"position":{"x":-1.4,"y":-16.75,"z":0.5},"rotation":{"x":0,"y":0,"z":0},"color":"#1a1a1a"},
    {"id":"right_boot","type":"cube","parameters":{"width":2.5,"height":1.5,"depth":3.5},"position":{"x":1.4,"y":-16.75,"z":0.5},"rotation":{"x":0,"y":0,"z":0},"color":"#1a1a1a"},
    {"id":"backpack","type":"cube","parameters":{"width":4,"height":6,"depth":2},"position":{"x":0,"y":0.5,"z":-4.2},"rotation":{"x":0,"y":0,"z":0},"color":"#6B7280"},
    {"id":"oxygen_tank","type":"cylinder","parameters":{"radius":0.9,"height":4.5},"position":{"x":1,"y":0.5,"z":-5.6},"rotation":{"x":0,"y":0,"z":0},"color":"#A8A9AD"}
  ],
  "boolean_operations": []
}

FOR NON-HUMANOID OBJECTS apply the same math: parts touch at edges, cylinders are horizontal when they should be (rotation.z = 1.5708), colors are unique per material.

════ GENERATION MODE ════
${generationMode === '2d'
                ? "2D SKETCH — ONLY output into 'sketches' array. No shapes. Use coordinates 100–400 for 800×600 canvas."
                : "3D SOLID — ONLY output into 'shapes' array + boolean_operations. No sketches. Every part must be precisely positioned."
            }
Current workspace: ${workspaceParams.sketches?.length || 0} existing sketches.

Output ONLY valid JSON. Zero markdown. Zero explanation. Zero thinking text.`;



        // Build Gemini-style chat history (role must be 'user' or 'model')
        const history = chatHistory
            .slice(-6)
            .filter(msg => msg.role && msg.text)
            .map(msg => ({
                role: msg.role === 'ai' ? 'model' : 'user',
                parts: [{ text: msg.text }],
            }));

        const model = getGeminiModel(userApiKey, systemPrompt);
        const chat = model.startChat({ history });
        const result = await chat.sendMessage(prompt);

        const aiResponse = result.response.text();

        let parsedResult;
        try {
            parsedResult = JSON.parse(aiResponse);
        } catch (e) {
            console.error('[AI] Torquy failed to return valid JSON:', aiResponse);
            throw new Error('AI returned invalid JSON');
        }

        res.json({
            success: true,
            reply: parsedResult.reply || 'Done.',
            plan: parsedResult.plan || [],
            shapes: parsedResult.shapes || [],
            boolean_operations: parsedResult.boolean_operations || [],
            sketches: parsedResult.sketches || [],
        });

    } catch (error) {
        console.error('[AI] Torquy Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process AI command',
            error: error.message,
        });
    }
});

module.exports = router;
