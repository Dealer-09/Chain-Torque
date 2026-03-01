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

const { Groq } = require('groq-sdk');
let _groq = null;
const getGroq = () => {
    if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY env var is not set');
    if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    return _groq;
};

/**
 * @route POST /api/ai/torquy
 * @desc Process CAD commands via Torquy AI and return JSON shapes and 2D sketches
 */
router.post('/torquy', async (req, res) => {
    try {
        const { prompt, chatHistory = [], workspaceParams = {}, generationMode = '3d' } = req.body;
        if (!prompt) {
            return res.status(400).json({ success: false, message: 'No prompt provided' });
        }

        const systemPrompt = `You are Torquy, an advanced CAD geometry assistant and mechanical engineer. Convert the user's natural language request into a strictly formatted JSON object.
You possess the ability to spawn full 3D meshes (shapes) OR 2D drawings (sketches). 
If the user wants to draw a flat profile, sketch, or polygon to extrude later, YOU MUST use the "sketches" array.
If the user wants a primitive 3D solid or an engineering model, use the "shapes" array.
CRITICAL RULE 1: Sizing and placement MUST be highly precise and spatially coherent (like actual CAD dimensions).
CRITICAL RULE 2: You MUST assign each distinct shape a UNIQUE, appropriate, engineering-grade HEX color representing materials (like steel gray #B0C4DE, brass #B5A642, dark chrome #2d2d2d, bright red paint #E32636, etc). NEVER make the entire assembly a single color unless explicitly asked.
CRITICAL RULE 3: For 3D SOLID operations, keep ALL dimensions small and bounded (a "large" box is 50 units max). For 2D SKETCH mode, you must use substantially larger values (e.g. coordinates spanning 100 to 400) so they comfortably fill an 800x600 canvas coordinate grid.
CRITICAL RULE 4: For subtraction/cut tools (like cylinder holes), you MUST make their length/height significantly larger than the base shape to cleanly pierce through it (e.g., if the box height is 10, the cylinder height should be 30).

Current Workspace Context:
The user currently has ${workspaceParams.sketches?.length || 0} sketches drawn on their board.

*** GENERATION MODE: ${generationMode.toUpperCase()} ***
${generationMode === '2d'
                ? "The user has explicitly selected 2D SKETCH mode. You MUST NOT generate any 3D shapes or boolean_operations. You must ONLY output your geometric data into the 'sketches' array. IMPORTANT: Assume a canvas size of 800x600 for 2D mode, so generate significantly larger objects (e.g. coordinates from -200 to +200) instead of tiny 10-unit shapes, so it is easily visible."
                : "The user has explicitly selected 3D SOLID mode. You MUST NOT generate any 2D sketches. You must ONLY output your geometric data into the 'shapes' array (and mathematically carve them using the 'boolean_operations' array if necessary). Keep 'sketches' completely empty."
            }

Your response MUST be ONLY valid JSON matching this exact schema:
{
  "reply": "Here is the 2D sketch you requested.",
  "plan": [
    "Step 1: Describe the first part you are building",
    "Step 2: Describe the next part",
    "Step 3: ...etc"
  ],
  "sketches": [
    {
      "type": "polygon|circle",
      "points": [{"x": number, "y": number}], // ONLY FOR POLYGONS
      "center": {"x": number, "y": number}, // ONLY FOR CIRCLES
      "radius": number // ONLY FOR CIRCLES
    }
  ],
  "shapes": [
    {
      "id": "unique_string_id_like_engine_block",
      "type": "cube|sphere|cylinder|cone|plane",
      "parameters": {
        "width": number, "height": number, "depth": number, // FOR CUBE
        "radius": number, "height": number, // FOR CYLINDER/CONE (HEIGHT IS MANDATORY)
        "radiusTop": number, "radiusBottom": number // OPTIONAL
      },
      "position": { "x": number, "y": number, "z": number },
      "rotation": { "x": number, "y": number, "z": number },
      "color": "UNIQUE hex string representing a distinct engineering material color (DO NOT default to a single color)"
    }
  ],
  "boolean_operations": [
    {
      "type": "subtract|union|intersect",
      "baseShapeId": "id_of_the_main_body",
      "toolShapeId": "id_of_the_shape_to_carve_with"
    }
  ]
}

Only output valid JSON, with absolutely no markdown wrapping, thinking text, or explanations.`;

        // Format history for Groq
        const messages = [
            { role: 'system', content: systemPrompt }
        ];

        // Append recent contextual history
        const recentHistory = chatHistory.slice(-6); // Keep last 6 messages
        recentHistory.forEach(msg => {
            if (msg.role && msg.text) {
                // Ensure role is exactly 'user' or 'assistant'
                messages.push({
                    role: msg.role === 'ai' ? 'assistant' : 'user',
                    content: msg.text
                });
            }
        });

        // Add the current prompt
        messages.push({ role: 'user', content: prompt });

        const completion = await getGroq().chat.completions.create({
            messages: messages,
            model: 'llama-3.1-8b-instant',
            temperature: 0.1,
            response_format: { type: "json_object" }
        });

        const aiResponse = completion.choices[0]?.message?.content;
        let parsedResult;
        try {
            parsedResult = JSON.parse(aiResponse);
        } catch (e) {
            console.error('[AI] Torquy failed to return valid JSON:', aiResponse);
            throw new Error('AI returned invalid JSON');
        }

        res.json({
            success: true,
            reply: parsedResult.reply || "Done.",
            plan: parsedResult.plan || [],
            shapes: parsedResult.shapes || [],
            boolean_operations: parsedResult.boolean_operations || [],
            sketches: parsedResult.sketches || []
        });

    } catch (error) {
        console.error('[AI] Torquy Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process AI command',
            error: error.message
        });
    }
});

module.exports = router;
