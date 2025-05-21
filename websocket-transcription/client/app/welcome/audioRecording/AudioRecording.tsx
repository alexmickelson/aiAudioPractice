import { useTranscription } from "./TranscriptionContext";

export const AudioRecording = () => {
  const {
    isRecording,
    toggleRecording,
    status,
    transcript,
    bufferTranscript,
    lag,
  } = useTranscription();

  return (
    <div>
      <button onClick={toggleRecording}>
        {isRecording ? "Stop Recording" : "Start Recording"}
      </button>
      <p>{status}</p>
      <p>lag {lag}</p>
      <div className="transcript">
        <h2>Transcript:</h2>
        <p>{transcript}</p>
        <p className="text-gray-400">{bufferTranscript}</p>
      </div>
    </div>
  );
};
