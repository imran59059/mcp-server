import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { InferenceClient } from "@huggingface/inference";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { z } from "zod";
import express from "express";
import cors from 'cors';

dotenv.config();
console.log("🟢 Server is starting...");

// Initialize Hugging Face Inference Client
const hfClient = new InferenceClient(process.env.HF_TOKEN);

// Create Express app
const app = express();
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 204
}));

// app.options('*', cors()); // <--- REMOVE THIS LINE

app.use(express.json());

// Create the MCP server
const server = new McpServer({
    name: "imran-data",
    version: "1.0.0",
});

// 🟢 Step 2: Query Qwen3 model via Hugging Face
async function queryQwen(prompt = "Hello, who are you Gregorio?") {
    try {
        const chatCompletion = await hfClient.chatCompletion({
            provider: "featherless-ai",
            model: "Qwen/Qwen3-14B",
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
        });

        return {
            result: chatCompletion.choices[0].message.content,
        };
    } catch (err) {
        console.log("Error in queryQwen:", err);
        return { error: err.message };
    }
}

// 🧠 Tool handler using Qwen3
const runQueryQwenModel = async ({ prompt }) => {
    const response = await queryQwen(prompt); // you can use prompt instead if needed
    console.log("response:", response);

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(response),
            },
        ],
    };
};

server.tool(
    "queryQwenModel",
    {
        prompt: z.string().describe("Your question to the LLaMA model"),
    },
    runQueryQwenModel
);

// ✅ Simple test route to confirm server is alive
app.get("/", (req, res) => {
    res.send("✅ MCP Backend is LIVE");
});

// Express route for Postman
app.post("/query", async (req, res) => {
    const { prompt } = req.body;
    try {
        const result = await runQueryQwenModel({ prompt });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Set transport
async function init() {
    const PORT = process.env.PORT || 8080; // ✅ Railway provides PORT
    const HOST = '0.0.0.0'; // ✅ Required for Railway

    const transport = new StreamableHTTPServerTransport({
        port: PORT,
        host: HOST,
    });

    await server.connect(transport);

    app.listen(PORT, HOST, () => {
        console.log(`🟢 Server running on http://${HOST}:${PORT}/query`);
    });
}

init().catch(console.error);