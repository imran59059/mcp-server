// 📝Note: Express JS || LLM Model -> llama3 || Database || Prompt: REACT APP or POSTMAN

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { InferenceClient } from "@huggingface/inference";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { z } from "zod";
import express from "express";
import cors from "cors";

dotenv.config();
console.log("🟢 Server is starting...");

// ✅ Hugging Face Inference Client
const hfClient = new InferenceClient(process.env.HF_TOKEN);

// ✅ Initialize Express
const app = express();

// ✅ CORS for mobile browser compatibility
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
}));
app.options('/*', cors()); // ✅ Handles iOS preflight

app.use(express.json());

// ✅ MCP Server
const server = new McpServer({
  name: "imran-data",
  version: "1.0.0",
});

// ✅ HuggingFace Model Query
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
    console.error("❌ Error in queryQwen:", err);
    return { error: err.message };
  }
}

// ✅ Tool handler for MCP
const runQueryQwenModel = async ({ prompt }) => {
  const response = await queryQwen(prompt);
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

// ✅ Register Tool
server.tool(
  "queryQwenModel",
  {
    prompt: z.string().describe("Your question to the LLaMA model"),
  },
  runQueryQwenModel
);

// ✅ Test route
app.get("/", (req, res) => {
  res.send("✅ MCP Backend is LIVE");
});

// ✅ Query route
app.post("/query", async (req, res) => {
  const { prompt } = req.body;
  try {
    const result = await runQueryQwenModel({ prompt });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Bootstrap server
async function init() {
  const PORT = process.env.PORT || 8080;
  const HOST = "0.0.0.0";

  const transport = new StreamableHTTPServerTransport({
    port: PORT,
    host: HOST,
  });

  await server.connect(transport);

  app.listen(PORT, HOST, () => {
    console.log(`🟢 Server running at http://${HOST}:${PORT}/query`);
  });
}

init().catch(console.error);
