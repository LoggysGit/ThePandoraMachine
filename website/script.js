// --- IMPORTS --- //

import { setCookie, getCookie, getRecipes } from "./js/cookies.js";
import { Assistant } from "./js/assistant.js";
import { ESPBridge } from "./js/bridge.js";

// --- COMMON FUNCTIONS --- //

export function monitorKey() {
    const keyCookie = getCookie("groq_api_key") || "";
    const micBtn = document.getElementById("btn-mic");
    const keyInput = document.getElementById("groq-key-input");
    
    let warningLabel = document.getElementById("groq-key-warning");
    if (!warningLabel && keyInput) {
        warningLabel = document.createElement("span");
        warningLabel.id = "groq-key-warning";
        warningLabel.style.color = "var(--status-red, #ff5252)";
        warningLabel.style.fontSize = "0.78rem";
        warningLabel.style.marginTop = "4px";
        warningLabel.style.display = "none";
        keyInput.parentNode.appendChild(warningLabel);
    }

    // Validate  key format (gsk_{30})
    const isValidKey = /^gsk_[a-zA-Z0-9_-]{30,}$/.test(keyCookie.trim());

    if (!isValidKey) {
        if (micBtn) {
            micBtn.disabled = true;
            micBtn.style.opacity = "0.35";
            micBtn.style.pointerEvents = "none";
            micBtn.title = "Set a valid Groq API key in settings";
        }
        
        if (warningLabel) {
            warningLabel.textContent = keyCookie 
                ? "Invalid key format" 
                : "Groq API key is missing";
            warningLabel.style.display = "block";
        }
    } else {
        if (micBtn) {
            micBtn.disabled = false;
            micBtn.style.opacity = "1";
            micBtn.style.pointerEvents = "auto";
            micBtn.title = "Hold to Record";
        }
        
        if (warningLabel) {
            warningLabel.style.display = "none";
        }
    }

    return isValidKey;
}

function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    document.getElementById('clock').textContent = timeStr;
    document.getElementById('date').textContent = dateStr;
}

function updateAssistantVisual(state) {}

function animateSpeech(text) {
    const el = document.getElementById("ai-response-text");
    if (el) el.textContent = text;
}

function toggleSettings() {
    const settings = document.getElementById("settings-modal");
    const recipes = document.getElementById("recipes-modal");

    if (recipes && !recipes.classList.contains("hidden")) {
        recipes.classList.add("hidden");
    }
    if (settings) {
        settings.classList.toggle("hidden");
    }
}
function toggleRecipes() {
    const settings = document.getElementById("settings-modal");
    const recipes = document.getElementById("recipes-modal");

    if (settings && !settings.classList.contains("hidden")) {
        settings.classList.add("hidden");
    }
    if (recipes) {
        recipes.classList.toggle("hidden");
        if (!recipes.classList.contains("hidden")) {
            renderRecipeList();
        }
    }
}

function renderRecipeList() {
    const list = document.querySelector(".recipe-list");
    if (!list) return;

    const recipes = getRecipes();
    list.innerHTML = "";

    if (recipes.length === 0) {
        const empty = document.createElement("li");
        empty.className = "recipe-item";
        empty.textContent = "No recipes yet";
        list.appendChild(empty);
        return;
    }

    recipes.forEach((r) => {
        const li = document.createElement("li");
        li.className = "recipe-item";

        const name = document.createElement("span");
        name.textContent = r.beverage_name || "Unnamed drink";

        const btn = document.createElement("button");
        btn.className = "action-btn";
        btn.textContent = "Dispense";
        btn.addEventListener("click", () => bridge.dispenseRecipe(r.recipe));

        li.appendChild(name);
        li.appendChild(btn);
        list.appendChild(li);
    });
}

// --- MAIN CODE SECTION --- //

const PROMPT_FILE = "./assets/prompt.yaml"

const assistant = new Assistant({
    onStateChange: (s) => { updateAssistantVisual(s) },
    onOutputText: (t) => { animateSpeech(t) },
    onError: (e) => console.error(e),
    onDispense: (recipe) => bridge.dispenseRecipe(recipe),
    systemPromptPath: PROMPT_FILE,
});

const bridge = new ESPBridge({
    onNotify: (bytes) => console.log("[ESP] notify:", bytes),
    onError: (e) => console.error("[ESP]", e),
    systemPromptPath: PROMPT_FILE,
});

const keyInput = document.getElementById("groq-key-input");
if (keyInput) {
    keyInput.value = getCookie("groq_api_key") || "";
    keyInput.addEventListener("change", () => {
        setCookie("groq_api_key", keyInput.value.trim());
    });
}

document.getElementById("btn-mic")?.addEventListener("click", async () => {
    assistant.handleAssistantClick();
});

document.getElementById("scan-btn")?.addEventListener("click", async () => {
    bridge.requestAndConnect();
});

document.getElementById("btn-settings")?.addEventListener("click", toggleSettings);
document.getElementById("btn-recipes")?.addEventListener("click", toggleRecipes);
document.getElementById("close-settings-btn")?.addEventListener("click", toggleSettings);
document.getElementById("close-recipes-btn")?.addEventListener("click", toggleRecipes);

document.addEventListener("DOMContentLoaded", () => {
    monitorKey();

    const keyInput = document.getElementById("groq-key-input");
    if (keyInput) {
        keyInput.addEventListener("input", (e) => {
            setCookie("groq_api_key", e.target.value.trim(), 30);
            monitorKey();
        });
    }
});

setInterval(updateClock, 1000);
updateClock();
