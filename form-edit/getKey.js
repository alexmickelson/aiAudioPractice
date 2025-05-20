
//https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/realtime-audio-webrtc

// Make sure the WebRTC URL region matches the region of your Azure OpenAI resource.
// For example, if your Azure OpenAI resource is in the swedencentral region,
// the WebRTC URL should be https://swedencentral.realtimeapi-preview.ai.azure.com/v1/realtimertc.
// If your Azure OpenAI resource is in the eastus2 region, the WebRTC URL should be https://eastus2.realtimeapi-preview.ai.azure.com/v1/realtimertc.
const WEBRTC_URL =
  "https://eastus2.realtimeapi-preview.ai.azure.com/v1/realtimertc";

// The SESSIONS_URL includes the Azure OpenAI resource URL,
// deployment name, the /realtime/sessions path, and the API version.
// The Azure OpenAI resource region isn't part of the SESSIONS_URL.
const SESSIONS_URL =
  "https://alex-mao5ns75-eastus2.cognitiveservices.azure.com/openai/realtimeapi/sessions?api-version=2025-04-01-preview";
// "https://YourAzureOpenAIResourceName.openai.azure.com/openai/realtimeapi/sessions?api-version=2025-04-01-preview";

const API_KEY =
  "";

// The deployment name might not be the same as the model name.
const DEPLOYMENT = "gpt-4o-mini-realtime-preview";
const VOICE = "verse";

async function fetchEphemeralKey() {
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
      console.log(response.body);
      console.log(response.status);
      console.log(response.statusText);
      throw new Error(`API request failed`);
    }

    const data = await response.json();
    console.log({
      sessionId: data.id,
      ephemeralKey: data.client_secret?.value,
    });

}

await fetchEphemeralKey()