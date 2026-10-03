// --- IMPORTS --- //

import { setCookie, getCookie, getRecipes, removeAllRecipes } from "./js/cookies.js";
import { Assistant } from "./js/assistant.js";
import { ESPBridge } from "./js/bridge.js";

// --- SYSTEM FUNCTIONS --- //

function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    document.getElementById('clock').textContent = timeStr;
    document.getElementById('date').textContent = dateStr;
}

function requestFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) {
        el.requestFullscreen().catch((e) => console.warn("Fullscreen denied:", e));
    } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
    }
}
async function requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
        console.log('[WakeLock] Screen blocked');
  
        wakeLock.addEventListener('release', () => {
          console.log('[WakeLock] Block released');
        });
      } catch (err) {
        console.error(`[WakeLock] Error: ${err.name}, ${err.message}`);
      }
    } else {
      console.warn('[WakeLock] API is not supported by your browser');
    }
}

function monitorKey() {
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

    // Validate key format (gsk_{30})
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

function setupConsoleCapture() {
    const logOutput = document.getElementById("debug-log-output");
    if (!logOutput) return;

    const original = {
        log: console.log.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
    };

    function formatArgs(args) {
        return args
            .map((arg) => {
                if (arg instanceof Error) return arg.stack || arg.message;
                if (typeof arg === "object" && arg !== null) {
                    try {
                        return JSON.stringify(arg);
                    } catch {
                        return String(arg);
                    }
                }
                return String(arg);
            })
            .join(" ");
    }

    function appendLine(level, args) {
        const time = new Date().toLocaleTimeString();
        const prefix = level === "error" ? "err" : level === "warn" ? "warn" : "log";
        const line = `[${time}] (${prefix}) : ${formatArgs(args)}\n`;

        logOutput.value += line;
        logOutput.scrollTop = logOutput.scrollHeight;
    }

    console.log = (...args) => {
        original.log(...args);
        appendLine("log", args);
    };

    console.warn = (...args) => {
        original.warn(...args);
        appendLine("warn", args);
    };

    console.error = (...args) => {
        original.error(...args);
        appendLine("error", args);
    };

    window.addEventListener("error", (e) => {
        appendLine("error", [`Uncaught: ${e.message}`, `at ${e.filename}:${e.lineno}`]);
    });

    window.addEventListener("unhandledrejection", (e) => {
        appendLine("error", [`Unhandled rejection: ${e.reason}`]);
    });
}

// Assistant

const STATE_NAMES = { 0: "idle", 1: "listening", 2: "talking" };
function updateAssistantVisual(state) {
    const name = STATE_NAMES[state] || "idle";
    document.body.dataset.assistantState = name;
}

function animateSpeech(text) {
    const el = document.getElementById("ai-response-text");
    if (el) el.textContent = text;
}

// Test menu builder

function buildPumpTestGrids(bridge) {
    buildMainPumpRow(bridge);
    buildMiniPumpGrid(bridge);
}

function buildMainPumpRow(bridge) {
    const grid = document.getElementById("main-pump-grid");
    if (!grid || grid.children.length > 0) return;

    const mainPumps = [
        { code: "WAT", label: "Soda Water" },
        { code: "SUG", label: "Sugar solution" },
        { code: "SOR", label: "Sour solution" },
        { code: "STI", label: "Still Water" },
    ];

    mainPumps.forEach(({ code, label }) => {
        const btn = document.createElement("button");
        btn.className = "pump-test-btn main-pump-btn";
        btn.textContent = label;
        btn.dataset.pumpCode = code;
        btn.addEventListener("click", () => bridge.testPump(code));

        grid.appendChild(btn);
    });
}
function buildMiniPumpGrid(bridge) {
    const grid = document.getElementById("mini-pump-grid");
    if (!grid || grid.children.length > 0) return;

    const rowLayout = [
        [6, 5, 4, 3, 2, 1],
        [12, 11, 10, 9, 8, 7],
        [13, 14, 15, 16, 17, 18],
        [19, 20, 21, 22, 23, 24],
    ];

    rowLayout.forEach((row) => {
        row.forEach((pumpIndex) => {
            const btn = document.createElement("button");
            btn.className = "pump-test-btn mini-pump-btn";
            btn.textContent = pumpIndex;
            btn.dataset.pumpIndex = pumpIndex;
            btn.addEventListener("click", () => bridge.testPump("FLV", pumpIndex));

            grid.appendChild(btn);
        });
    });
}

// --- MENU FUNCTIONS --- //

function toggleRecipes() {
    const settings = document.getElementById("settings-modal");
    const test = document.getElementById("test-modal");
    const recipes = document.getElementById("recipes-modal");

    if (settings && !settings.classList.contains("hidden")) {
        settings.classList.add("hidden");
    }
    if (test && !test.classList.contains("hidden")) {
        test.classList.add("hidden");
    }

    if (recipes) {
        recipes.classList.toggle("hidden");
        if (!recipes.classList.contains("hidden")) {
            renderRecipeList();
        }
    }
}
function togglePumpTestMenu(){
    const settings = document.getElementById("settings-modal");
    const test = document.getElementById("test-modal");
    const recipes = document.getElementById("recipes-modal");

    if (recipes && !recipes.classList.contains("hidden")) {
        recipes.classList.add("hidden");
    }
    if (settings && !settings.classList.contains("hidden")) {
        settings.classList.add("hidden");
    }

    if (test) {
        test.classList.toggle("hidden");
    }
}
function toggleSettings() {
    const settings = document.getElementById("settings-modal");
    const test = document.getElementById("test-modal");
    const recipes = document.getElementById("recipes-modal");

    if (recipes && !recipes.classList.contains("hidden")) {
        recipes.classList.add("hidden");
    }
    if (test && !test.classList.contains("hidden")) {
        test.classList.add("hidden");
    }

    if (settings) {
        settings.classList.toggle("hidden");
    }
}

function updateConnectionStatus(isConnected) {
    const bleDot = document.getElementById("ble-dot");
    const disconnectBtn = document.getElementById("disconnect-btn");
  
    // BLE dot
    if (bleDot) {
      bleDot.classList.toggle("connected", isConnected);
      bleDot.classList.toggle("disconnected", !isConnected);
      bleDot.title = isConnected ? "BLE: On" : "BLE: Off";
    }
  
    // Disconnection Button
    if (disconnectBtn) {
      disconnectBtn.disabled = !isConnected;
      bleDot.classList.toggle("disconnected", !isConnected);
    }
}

// --- RECIPE FUNCTIONS --- //

function clearRecipes(){
    removeAllRecipes();
    toggleRecipes();
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
    onNotify: (bytes) => console.log("Notify:", bytes),
    onChangeConnection: (conn) => { updateConnectionStatus (conn) },
    onError: (e) => console.error("Error:", e),
    systemPromptPath: PROMPT_FILE,
});

const keyInput = document.getElementById("groq-key-input");
if (keyInput) {
    keyInput.value = getCookie("groq_api_key") || "";
    keyInput.addEventListener("change", () => {
        setCookie("groq_api_key", keyInput.value.trim());
    });
}

let wakeLock = null;

// Main event listeners
document.getElementById("btn-mic")?.addEventListener("click", async () => {
    assistant.handleAssistantClick(); });

document.getElementById("scan-btn")?.addEventListener("click", async () => {
    bridge.requestAndConnect(); });

document.getElementById("disconnect-btn")?.addEventListener("click", async () => {
    bridge.disconnect(); });

// Fullscreen button
document.getElementById("fullscreen-btn")?.addEventListener("click", async () => {
    requestFullscreen();
    requestWakeLock();
});

// Recipes button
document.getElementById("btn-recipes")?.addEventListener("click", toggleRecipes);
document.getElementById("close-recipes-btn")?.addEventListener("click", toggleRecipes);

// Pump test menu button
document.getElementById("btn-test")?.addEventListener("click", togglePumpTestMenu);
document.getElementById("close-test-btn")?.addEventListener("click", togglePumpTestMenu);

// Settings button
document.getElementById("btn-settings")?.addEventListener("click", toggleSettings);
document.getElementById("close-settings-btn")?.addEventListener("click", toggleSettings);

// Other buttons
document.getElementById('clear-recipes-btn').addEventListener("click", clearRecipes);

document.getElementById('voice-output-toggle').addEventListener('change', (event) =>
    { assistant.setSpeakStatus(event.target.checked) });

// DOM Content function
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

// Enable clock
setInterval(updateClock, 1000);
updateClock();

// Load test menu
buildPumpTestGrids(bridge);

// Set up logs
setupConsoleCapture();
