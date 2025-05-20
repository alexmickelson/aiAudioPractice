import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";
import { update_user, get_user, updateUserJsonSchema } from "./userForm.js";

//https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/realtime-audio-webrtc
// shoudl implement function calling https://platform.openai.com/docs/guides/realtime-conversations#function-calling

const WEBRTC_URL =
  "https://eastus2.realtimeapi-preview.ai.azure.com/v1/realtimertc";

const DEPLOYMENT = "gpt-4o-mini-realtime-preview";
const VOICE = "verse";

const transcriptContainer = document.getElementById("transcriptContainer");
const lastEventElement = document.getElementById("lastEvent");
const chatWindow = document.getElementById("chatWindow");
const myChat = document.getElementById("myChat");
const aiChat = document.getElementById("aiChat");

let aiResponse = "";

function handleNewAiResponse() {
  aiChat.innerHTML = marked.parse(aiResponse);
}

async function fetchEphemeralKey() {
  const response = await fetch("http://localhost:3001/api/ephemeral-key", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    console.log(response.status);
    console.log(response.statusText);
    throw new Error(`API request failed`);
  }

  const data = await response.json();
  console.log({
    sessionId: data.sessionId,
    ephemeralKey: data.ephemeralKey,
  });
  return {
    sessionId: data.sessionId,
    ephemeralKey: data.ephemeralKey,
  };
}

function logMessage(message) {
  const logContainer = document.getElementById("logContainer");
  const p = document.createElement("p");
  p.textContent = message;
  logContainer.appendChild(p);
}

// tool calling

export const tools = [
  {
    type: "function",
    name: "update_user",
    description:
      "Update the current user object (name, age, description) and re-render the form.",
    parameters: updateUserJsonSchema.definitions.UpdateUserParams,
  },
  {
    type: "function",
    name: "get_user",
    description: "Get the user currently displayed on the form",
  },
];
console.log(JSON.stringify(tools), updateUserJsonSchema);
// tool calling end

async function init(ephemeralKey) {
  let peerConnection = new RTCPeerConnection();

  // Set up to play remote audio from the model.
  const audioElement = document.createElement("audio");
  // audioElement.autoplay = true;
  document.body.appendChild(audioElement);

  peerConnection.ontrack = (event) => {
    audioElement.srcObject = event.streams[0];
  };

  // Set up data channel for sending and receiving events
  const clientMedia = await navigator.mediaDevices.getUserMedia({
    audio: true,
  });
  const audioTrack = clientMedia.getAudioTracks()[0];
  peerConnection.addTrack(audioTrack);

  const dataChannel = setupDataChannel(peerConnection, updateSession);

  // Start the session using the Session Description Protocol (SDP)
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  const sdpResponse = await fetch(`${WEBRTC_URL}?model=${DEPLOYMENT}`, {
    method: "POST",
    body: offer.sdp,
    headers: {
      Authorization: `Bearer ${ephemeralKey}`,
      "Content-Type": "application/sdp",
    },
  });

  const answer = { type: "answer", sdp: await sdpResponse.text() };
  await peerConnection.setRemoteDescription(answer);

  const button = document.createElement("button");
  button.innerText = "Close Session";
  button.onclick = () => {
    if (dataChannel) dataChannel.close();
    if (peerConnection) peerConnection.close();
    peerConnection = null;
    logMessage("Session closed.");
    button.remove();
  };
  document.getElementById("endSessionContainer").replaceChildren(...[button]);

  // Send a client event to update the session
  function updateSession(dataChannel) {
    // const event = {
    //   type: "session.update",
    //   session: {
    //     instructions:
    //       "You are a helpful AI assistant responding in natural, engaging language. Use tools provided to update the user object when requested",
    //     tools: tools,
    //     tool_choice: "auto",
    //   },
    // };
    const event = {
      type: "session.update",
      session: {
        instructions:
          `
            You are a helpful AI assistant responding in natural, engaging language. Use tools provided to update the user object when requested
            Here is the user object:
            ${JSON.stringify(get_user())}
          `,
        tools: tools,
        tool_choice: "auto",
      },
    };
    console.log("starting with ", JSON.stringify(event));
    dataChannel.send(JSON.stringify(event));
    logMessage("Sent client event: " + JSON.stringify(event, null, 2));
  }
}

function setupDataChannel(peerConnection, updateSession) {
  const dataChannel = peerConnection.createDataChannel("realtime-channel");

  dataChannel.addEventListener("open", () => {
    logMessage("Data channel is open");
    updateSession(dataChannel);
  });

  dataChannel.addEventListener("message", (event) => {
    const realtimeEvent = JSON.parse(event.data);
    lastEventElement.textContent = realtimeEvent.type;
    logMessage(
      "Received server event: " + JSON.stringify(realtimeEvent, null, 2)
    );
    // if (realtimeEvent.type === "session.updated") {
    //   const instructions = realtimeEvent.session.instructions;
    //   console.log("Instructions: " + instructions, realtimeEvent);
    // } else if (realtimeEvent.type === "session.error") {
    //   logMessage("Error: " + realtimeEvent.error.message);
    // } else if (realtimeEvent.type === "session.end") {
    //   logMessage("Session ended.");
    // }

    // if (realtimeEvent.type === "response.output_item.done") {
    //   chatWindow.textContent = realtimeEvent.item.content[0].transcript;
    // }
    //display the transcript
    if (
      realtimeEvent.type === "response.audio_transcript.delta" &&
      realtimeEvent.delta
    ) {
      aiResponse += realtimeEvent.delta;
      // new SpeechSynthesisUtterance(realtimeEvent.delta);
      handleNewAiResponse();
    }

    console.log(realtimeEvent.type);
    if (realtimeEvent.type === "response.function_call_arguments.done") {
      // tool call

      console.log(
        "tool call detected",
        realtimeEvent.name,
        realtimeEvent.arguments
      );
      // logMessage("Tool call detected: ", );
      if (realtimeEvent.name === "update_user") {
        const args =
          typeof realtimeEvent.arguments === "string"
            ? JSON.parse(realtimeEvent.arguments)
            : realtimeEvent.arguments;
        const result = update_user(args);
        sendFunctionCallOutput(dataChannel, realtimeEvent, result);
      }
      if (realtimeEvent.name === "get_user") {
        const result = get_user();
        sendFunctionCallOutput(dataChannel, realtimeEvent, result);
      }
    }
  });

  dataChannel.addEventListener("close", () => {
    logMessage("Data channel is closed");
  });
  return dataChannel;
}

function sendFunctionCallOutput(dataChannel, realtimeEvent, result) {
  dataChannel.send(
    JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: realtimeEvent.call_id,
        output: JSON.stringify(result),
      },
    })
  );
  // dataChannel.send(
  //   JSON.stringify({
  //     type: "response.create",
  //   })
  // );
}

async function StartSession() {
  console.log("StartSession called");
  try {
    const { sessionId, ephemeralKey } = await fetchEphemeralKey();

    console.error("Ephemeral key:", ephemeralKey);

    // Mask the ephemeral key in the log message.
    logMessage("Ephemeral Key Received: " + "***");
    logMessage("WebRTC Session Id = " + sessionId);

    // Set up the WebRTC connection using the ephemeral key.
    init(ephemeralKey);
  } catch (error) {
    logMessage("Error fetching ephemeral key: " + error.message);
  }
}
document.getElementById("startSession").addEventListener("click", StartSession);
