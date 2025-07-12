// 📝Note: Express JS || LLM Model -> llama3 || Database || Prompt: REACT APP or POSTMAN
// Run Process: 
//       1 - need to run this file using node 
//       2 - need to run ollama (Command is: ollama run llama3 )
//       3 - Prompt: 
//            a. React App
//            b. Postman
//            - URL: http://localhost:8081/query
//            - Headers: Content-Type: application/json
//            - Method: POST
//            - Body (raw, JSON format): {
//                "prompt": "hey"
//              }
//       4 - output 
// -------------------------------------------------------------------------------

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
app.use(cors());
app.use(express.json());

// Create the MCP server
const server = new McpServer({
  name: "imran-data",
  version: "1.0.0",
});

// // 🟡 Step 1: Fetch your API data
// let userData = "";
// try {
//   const dataRes = await fetch("https://686a36172af1d945cea37af0.mockapi.io/api/imr/about");
//   const dataJson = await dataRes.json();
//   userData = JSON.stringify(dataJson, null, 2); // pretty print
// } catch (err) {
//   console.error("Failed to fetch API data:", err.message);
//   userData = "Error fetching user data.";
// }


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