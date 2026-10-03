import { getCookie } from "./cookies.js";

export class SpeechListener {
  constructor({ onTranscription, onError } = {}) {
    this.isRecording = false;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.autoStopTimer = null;

    this.onTranscription = onTranscription || (() => {});
    this.onError = onError || ((e) => console.error("[SpeechListener]", e));
  }

  getRecordingStatus() {
    return this.isRecording;
  }

  async toggleListening() {
    if (!this.isRecording) {
      await this._startRecording();
    } else {
      await this._stopRecording();
    }
  }

  async _startRecording() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      this.onError(`[SpeechListener] Microphone permission denied: ${e}`);
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "";

    this.mediaRecorder = mimeType
      ? new MediaRecorder(this.stream, { mimeType })
      : new MediaRecorder(this.stream);

    this.audioChunks = [];
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.audioChunks.push(e.data);
    };
    this.mediaRecorder.onstop = () => this._handleStopped();

    this.mediaRecorder.start();
    this.isRecording = true;

    this.autoStopTimer = setTimeout(() => {
      if (this.isRecording) this._stopRecording();
    }, 30_000);
  }

  async _stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) return;
    clearTimeout(this.autoStopTimer);
    this.isRecording = false;

    return new Promise((resolve) => {
      this.mediaRecorder.addEventListener("stop", () => resolve(), { once: true });
      this.mediaRecorder.stop();
      this.stream.getTracks().forEach((t) => t.stop());
    });
  }

  async _handleStopped() {
    if (this.audioChunks.length === 0) {
      this.onError("[SpeechListener] No audio captured");
      this.onTranscription("");
      return;
    }
    console.log("[SpeechListener] Audio stopped. Trancribing...")
    const blob = new Blob(this.audioChunks, { type: "audio/webm" });
    await this._transcribe(blob);
  }

  async _transcribe(blob) {
    const apiKey = getCookie("groq_api_key");
    if (!apiKey) {
      this.onError("[SpeechListener] No Groq API key set. SET IT NOW!");
      this.onTranscription("");
      return;
    }

    const formData = new FormData();
    formData.append("file", blob, "speech.webm");
    formData.append("model", "whisper-large-v3-turbo");
    formData.append("response_format", "json");

    try {
      const response = await fetch(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: formData,
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`[SpeechListener] Transcription failed (${response.status}): ${errText}`);
      }

      const data = await response.json();
      console.log(`[SpeechListener] Transcribed successfully: ${data.text}`)
      this.onTranscription((data.text || "").trim());
    } catch (e) {
      this.onError(e);
      this.onTranscription("");
    }
  }
}
