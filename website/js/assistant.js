import jsYaml from 'https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/+esm';

import { getCookie, saveRecipe } from "./cookies.js";
import { SpeechListener } from "./speech.js";

export const STATE = { IDLE: 0, LISTENING: 1, TALKING: 2 };

export class Assistant {
  constructor({ onStateChange, onOutputText, onError, onDispense, systemPromptPath } = {}) {
    this.state = STATE.IDLE;
    this.onStateChange = onStateChange || (() => {});
    this.onOutputText = onOutputText || (() => {});
    this.onError = onError || ((e) => console.error("[Assistant]", e));
    this.onDispense = onDispense || (() => {});
    this.systemPromptPath = systemPromptPath || "";
    this.speak = true;

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

  setSpeakStatus(state){
    this.speak = state;
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

    this.systemPrompt = await this._loadPrompt('./assets/prompt.yaml');

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
      await Promise.all([
        this._animateOutput(comment),
        this.speak ? this._speak(comment) : Promise.resolve()
      ]);

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

  async _loadPrompt(yamlPath) {
    try {
        const response = await fetch(yamlPath);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${yamlPath}: ${response.statusText}`);
        }
        
        const yamlText = await response.text();
        const config = jsYaml.load(yamlText) || {};

        // Model, settings
        const params = config.model_params || config.model_settings || {};
        if (params.model) this.groqModel = params.model;
        if (params.temperature !== undefined) this.aiTemperature = params.temperature;
        if (params.voice) this.ttsVoice = params.voice;

        // Flavor inventory
        const baseSolutions = config.inventory?.base_solutions || {};
        const flavours = config.inventory?.flavours || {};
        const inventoryItems = { ...baseSolutions, ...flavours };

        const inventoryStr = Object.entries(inventoryItems)
            .map(([code, name]) => `  ${code}: ${name}`)
            .join('\n');

        // Sections
        const role = config.system_prompt || '';
        const answerFormat = config.answer_format || {};
        const recipeRules = typeof answerFormat === 'object' && answerFormat !== null
            ? (answerFormat.recipe_rules || '')
            : answerFormat;
        const instructions = config.instructions || '';

        // Assemble prompt
        const systemInstruction = [
            role,
            `- INVENTORY -\n${inventoryStr}`,
            `- ANSWER FORMAT -\n${recipeRules}`,
            `- INSTRUCTIONS -\n${instructions}`
        ].join('\n\n').trim();

        return systemInstruction;

    } catch (e) {
        console.error(`Error loading prompt YAML:`, e);
        return '';
    }
  }
}
