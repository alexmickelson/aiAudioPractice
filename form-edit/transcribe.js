const transcribeBtn = document.getElementById("transcribe");
const stopBtn = document.getElementById("stopTranscribe");

const recognition = new SpeechRecognition();

transcribeBtn.addEventListener("click", () => {
  console.log("Transcribe button clicked");
  recognition.start();
});


const onResult = (event) => {
  console.log(event.results);
  transcriptionResult.textContent = "";
  for (const result of event.results) {
    const text = document.createTextNode(result[0].transcript);

    const p = document.createElement("p");
    p.appendChild(text);
    if (result.isFinal) {
      p.classList.add("final");
    }
    transcriptionResult.appendChild(p);
  }
};
stopBtn.addEventListener("click", () => {
  recognition.stop();
  recognition.addEventListener("result", onResult);
});
