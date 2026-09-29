import { getCookie, saveRecipe } from "./js/cookies.js";
import { SpeechListener } from "./js/speech.js";

export const STATE = { IDLE: 0, LISTENING: 1, TALKING: 2 };

export class Assistant {
  constructor({ onStateChange, onOutputText, onError, onDispense, systemPrompt } = {}) {
    this.state = STATE.IDLE;
    this.onStateChange = onStateChange || (() => {});
    this.onOutputText = onOutputText || (() => {});
    this.onError = onError || ((e) => console.error("[Assistant]", e));
    this.onDispense = onDispense || (() => {});
    this.systemPrompt = systemPrompt || "";

    this.speechListener = new SpeechListener({
      onTranscription: (text) => this._handleTranscription(text),
      onError: (e) => this.onError(e),
    });
  }

  _setState(newState) {
    this.state = newState;
    this.onStateChange(newState);
  }

  async handleAssistantClick() {
    if (this.state === STATE.IDLE) {
      this._setState(STATE.LISTENING);
      await this.speechListener.toggleListening();
    } else if (this.state === STATE.LISTENING) {
      await this.speechListener.toggleListening();
    }
  }

  async _handleTranscription(text) {
    if (!text.trim()) {
      this._setState(STATE.IDLE);
      return;
    }

    const apiKey = getCookie("groq_api_key");
    if (!apiKey) {
      this.onError("No Groq API key set");
      this._setState(STATE.IDLE);
      return;
    }

    try {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-120b",
            temperature: 0.7,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: this.systemPrompt },
              { role: "user", content: text },
            ],
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq chat request failed (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "{}";
      const parsed = JSON.parse(content);

      const comment = parsed.comment || "";
      const recipe = (parsed.recipe || "").replace(/\\n/g, "\n");
      const beverageName = parsed.beverage_name || "Unnamed drink";

      this._setState(STATE.TALKING);
      await this._animateOutput(comment);
      await this._speak(comment);

      if (recipe) {
        saveRecipe({ beverage_name: beverageName, recipe, comment });
        this.onDispense(recipe);
      }
    } catch (e) {
      this.onError(e);
    } finally {
      this._setState(STATE.IDLE);
    }
  }

  async _animateOutput(text, intervalMs = 200) {
    const words = text.split(/\s+/).filter(Boolean);
    let shown = "";
    for (const word of words) {
      shown = `${shown} ${word}`.trim();
      this.onOutputText(shown);
      await this._sleep(intervalMs);
    }
    await this._sleep(1500);
    this.onOutputText("");
  }

  _speak(text) {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) {
        console.warn("[Assistant] speechSynthesis not supported");
        resolve();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}