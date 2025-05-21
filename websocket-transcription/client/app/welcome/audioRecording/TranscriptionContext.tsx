import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useWebSocket } from "./WebSocketContext";

interface TranscriptionContextProps {
  websocket: WebSocket | null;
  isRecording: boolean;
  stopRecording: () => void;
  toggleRecording: () => Promise<void>;
  status: string;
  transcript: string;
  bufferTranscript: string;
  lag: number;
}

const TranscriptionContext = createContext<
  TranscriptionContextProps | undefined
>(undefined);

const websocketUrl = "ws://localhost:8000/asr";

export const TranscriptionProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const {
    websocket,
    connectWebSocket,
    status: websocketStatus,
  } = useWebSocket();
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Click to start transcription");
  const audioContextRef = useRef<AudioContext | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const [transcript, setTranscript] = useState("");
  const [bufferTranscript, setBufferTranscript] = useState("");

  const [chunkDuration, setChunkDuration] = useState(500);
  const [silenceInterval, setSilenceInterval] = useState(1500);
  const [lag, setLag] = useState(0);

  const startRecording = async (ws: WebSocket) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const audioContext = new window.AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      microphoneRef.current = microphone;

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recorder.ondataavailable = (e) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(e.data);
        }
      };
      recorder.start(chunkDuration);
      recorderRef.current = recorder;

      startTimeRef.current = Date.now();
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.floor(
          (Date.now() - (startTimeRef.current || 0)) / 1000
        );
        const minutes = Math.floor(elapsed / 60)
          .toString()
          .padStart(2, "0");
        const seconds = (elapsed % 60).toString().padStart(2, "0");
        setStatus(`Recording... ${minutes}:${seconds}`);
      }, 1000);

      setIsRecording(true);
    } catch (err) {
      setStatus("Error accessing microphone. Please allow microphone access.");
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }

    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }

    if (analyserRef.current) {
      analyserRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    startTimeRef.current = null;
    setIsRecording(false);
    setStatus("Finished processing audio! Ready to record again.");
  };

  const toggleRecording = async () => {
    if (!isRecording) {
      try {
        if (websocket && websocket.readyState === WebSocket.OPEN) {
          await startRecording(websocket);
        } else {
          const ws = await connectWebSocket(websocketUrl);
          setStatus("Connected to server.");
          await startRecording(ws);
        }
      } catch (err) {
        setStatus("Could not connect to WebSocket or access mic. Aborted.");
        console.error(err);
      }
    } else {
      stopRecording();
    }
  };

  useEffect(() => {
    setStatus(websocketStatus);
  }, [websocketStatus]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      console.log("detected silence period");
    }, silenceInterval);

    return () => clearTimeout(timeout);
  }, [transcript, silenceInterval]);

  return (
    <TranscriptionContext.Provider
      value={{
        websocket,
        isRecording,
        stopRecording,
        toggleRecording,
        status,
        transcript,
        bufferTranscript,
        lag,
      }}
    >
      {children}
    </TranscriptionContext.Provider>
  );
};

export const useTranscription = () => {
  const context = useContext(TranscriptionContext);
  if (!context) {
    throw new Error(
      "useTranscription must be used within a TranscriptionProvider"
    );
  }
  return context;
};
