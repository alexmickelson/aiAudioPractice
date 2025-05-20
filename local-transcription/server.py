# filepath: /home/alexm/projects/misc/web-audio/server.py
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import whisper
import os
import tempfile

app = FastAPI()

model = whisper.load_model(
    "base"
)  # Load the Whisper model (choose "tiny", "base", "small", etc.)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOADS_DIR = "uploads"
os.makedirs(UPLOADS_DIR, exist_ok=True)  # Ensure the uploads directory exists


@app.post("/transcribe")
def transcribe(audio: UploadFile = File(...)):
    if audio.content_type not in ("audio/wav", "audio/x-wav"):
        raise HTTPException(status_code=400, detail="File must be a WAV audio")

    try:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio.file.read())
            tmp_path = tmp.name

        result = model.transcribe(tmp_path)
        transcription = result["text"]

        print(transcription)
        return {"transcription": transcription}
    finally:
        try:
            os.remove(tmp_path)
        except Exception:
            pass
