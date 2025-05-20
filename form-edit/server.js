// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

const SESSIONS_URL =
  "https://alex-mao5ns75-eastus2.cognitiveservices.azure.com/openai/realtimeapi/sessions?api-version=2025-04-01-preview";
const API_KEY = process.env.API_KEY;
const DEPLOYMENT = "gpt-4o-mini-realtime-preview";
const VOICE = "verse";

app.post("/api/ephemeral-key", async (req, res) => {
  try {
    const response = await fetch(SESSIONS_URL, {
      method: "POST",
      headers: {
        "api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEPLOYMENT,
        voice: VOICE,
      }),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "API request failed" });
    }

    const data = await response.json();
    res.json({
      sessionId: data.id,
      ephemeralKey: data.client_secret?.value,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});