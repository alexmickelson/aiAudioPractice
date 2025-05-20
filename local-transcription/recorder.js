const QUIET_DECIBEL_THRESHOLD = -40;
const DECIBEL_INTERVAL_PERIOD = 100;
const QUIET_THRESHOLD_COUNT = 10;

let mediaRecorder;
let audioChunks = [];
let audioContext;
let analyser;
let source;
let decibelInterval;
let quietCount = 0;

const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");
const transcriptEl = document.getElementById("transcript");

function calculateDecibels(dataArray) {
  let sumSquares = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const normalized = (dataArray[i] - 128) / 128;
    sumSquares += normalized * normalized;
  }
  const rms = Math.sqrt(sumSquares / dataArray.length);
  const decibels = 20 * Math.log10(rms);
  return decibels === -Infinity ? -100 : decibels.toFixed(2);
}

function resetState() {
  audioChunks = [];
  quietCount = 0;
}

function setButtonStates(isRecording) {
  startBtn.disabled = isRecording;
  stopBtn.disabled = !isRecording;
}
function startDecibelMonitor(analyser, onQuiet) {
  const bufferLength = analyser.fftSize;
  const dataArray = new Uint8Array(bufferLength);

  return setInterval(() => {
    analyser.getByteTimeDomainData(dataArray);
    const db = calculateDecibels(dataArray);
    if (db < QUIET_DECIBEL_THRESHOLD) {
      quietCount++;
    } else {
      quietCount = 0;
    }
    console.log("Decibels (last ~0.5s):", db, "dB", quietCount);
    if (quietCount > QUIET_THRESHOLD_COUNT) {
      onQuiet();
    }
  }, DECIBEL_INTERVAL_PERIOD);
}

async function handleRecordingStop() {
  clearInterval(decibelInterval);
  if (audioContext) await audioContext.close();

  const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
  const formData = new FormData();
  formData.append("audio", audioBlob, "audio.wav");

  try {
    const response = await axios.post(
      "http://localhost:8000/transcribe",
      formData
    );
    transcriptEl.textContent =
      response.data.transcription + `\nQuiet count: ${quietCount}`;
  } catch (error) {
    console.error("Error during axios request:", error);
    transcriptEl.textContent = "Error: Unable to transcribe audio.";
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    setButtonStates(false);
  }
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    resetState();

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    source.connect(analyser);

    decibelInterval = startDecibelMonitor(analyser, stopRecording);

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.addEventListener("stop", handleRecordingStop);

    mediaRecorder.start();
    setButtonStates(true);
  } catch (error) {
    console.error("Error accessing microphone:", error);
    transcriptEl.textContent = "Error: Unable to access microphone.";
  }
}
export function setupRecorder() {
  startBtn.addEventListener("click", (event) => {
    event.preventDefault();
    startRecording();
  });

  stopBtn.addEventListener("click", (event) => {
    event.preventDefault();
    stopRecording();
  });
}
