function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    
    document.getElementById('clock').textContent = timeStr;
    document.getElementById('date').textContent = dateStr;
}

function updateAssistantVisual(state) {}

function animateSpeech(text) {}

function toggleSettings() {
    const settings = document.getElementById("settings-overlay");
    const recipes = document.getElementById("recipes-overlay");

    if (recipes && !recipes.classList.contains("hidden")) {
        recipes.classList.add("hidden");
    }
    if (settings) {
        settings.classList.toggle("hidden");
    }
}

function toggleRecipes() {
    const settings = document.getElementById("settings-overlay");
    const recipes = document.getElementById("recipes-overlay");

    if (settings && !settings.classList.contains("hidden")) {
        settings.classList.add("hidden");
    }
    if (recipes) {
        recipes.classList.toggle("hidden");
    }
}

window.toggleSettings = toggleSettings;
window.toggleRecipes = toggleRecipes;

setInterval(updateClock, 1000);
updateClock();

import { Assistant } from "./js/assistant.js";
import { ESPBridge } from "./js/bridge.js";

const bridge = new ESPBridge({
    onNotify: (bytes) => console.log("[ESP] notify:", bytes),
    onError: (e) => console.error("[ESP]", e),
});

const assistant = new Assistant({
    onStateChange: (s) => { updateAssistantVisual(s) },
    onOutputText: (t) => { animateSpeech(t) },
    onError: (e) => console.error(e),
    onDispense: (recipe) => bridge.dispenseRecipe(recipe),
    systemPrompt: "LOAD ./assets/prompt.yaml",
});

document.getElementById("btn-mic")?.addEventListener("click", async () => {
    assistant.handleAssistantClick();
});