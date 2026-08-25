/* ===================== Editor: gutter + tabs ===================== */

const editor = document.getElementById("code-editor");
const gutter = document.getElementById("gutter");
const runBtn = document.getElementById("run-btn");
const resetBtn = document.getElementById("reset-btn");
const examplesSelect = document.getElementById("examples");
const statusEl = document.getElementById("status");
const consoleOutput = document.getElementById("console-output");
const loadingOverlay = document.getElementById("loading-overlay");

const EXAMPLES = {
  hello: `# A quick hello from the sandbox
name = "world"
for i in range(3):
    print(f"Hello, {name}! ({i + 1}/3)")
`,
  loops: `# Loops and a little math
total = 0
for n in range(1, 11):
    total += n
    print(f"n={n:2d}  running total={total}")

print("Sum 1..10 is", total)
`,
  drawing: `import sandbox

sandbox.clear()
sandbox.rect(40, 40, 120, 80, color="#16a34a")
sandbox.circle(320, 120, 60, color="#6366f1")
sandbox.line(40, 200, 560, 200, color="#1f2937", width=3)
sandbox.text(40, 260, "Drawn with Python", size=20)

print("Switch to the Canvas tab to see it!")
`,
  game: `# Tiny game: move the square with arrow keys.
# Switch to the Canvas tab, then click it and use the arrow keys.
import sandbox

x, y = 300, 200
speed = 5

def tick():
    global x, y
    if sandbox.key_down("ArrowLeft"):
        x -= speed
    if sandbox.key_down("ArrowRight"):
        x += speed
    if sandbox.key_down("ArrowUp"):
        y -= speed
    if sandbox.key_down("ArrowDown"):
        y += speed

    sandbox.clear()
    sandbox.rect(x, y, 30, 30, color="#16a34a")
    sandbox.text(10, 20, "Arrow keys to move", size=14, color="#1f2937")

sandbox.on_tick(tick)
print("Game running — check the Canvas tab.")
`,
};

const DEFAULT_CODE = EXAMPLES.hello;
editor.value = DEFAULT_CODE;

function updateGutter() {
  const lines = editor.value.split("\n").length;
  let out = "";
  for (let i = 1; i <= lines; i++) out += i + "\n";
  gutter.textContent = out;
}
editor.addEventListener("input", updateGutter);
editor.addEventListener("scroll", () => { gutter.scrollTop = editor.scrollTop; });
editor.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    const start = editor.selectionStart, end = editor.selectionEnd;
    editor.value = editor.value.slice(0, start) + "    " + editor.value.slice(end);
    editor.selectionStart = editor.selectionEnd = start + 4;
    updateGutter();
  }
});
updateGutter();

resetBtn.addEventListener("click", () => {
  stopTickLoop();
  editor.value = examplesSelect.value ? EXAMPLES[examplesSelect.value] : DEFAULT_CODE;
  updateGutter();
});

examplesSelect.addEventListener("change", () => {
  if (examplesSelect.value) {
    stopTickLoop();
    editor.value = EXAMPLES[examplesSelect.value];
    updateGutter();
    if (examplesSelect.value === "drawing" || examplesSelect.value === "game") {
      switchTab("canvas");
    }
  }
});

/* Tabs */
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});
function switchTab(name) {
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  document.getElementById("console-output").classList.toggle("active", name === "console");
  document.getElementById("canvas-pane").classList.toggle("active", name === "canvas");
}

/* ===================== Keyboard state (for sandbox.key_down) ===================== */

window.__sandboxKeys = new Set();
window.addEventListener("keydown", (e) => window.__sandboxKeys.add(e.key));
window.addEventListener("keyup", (e) => window.__sandboxKeys.delete(e.key));

/* ===================== Pyodide setup ===================== */

let pyodide = null;
let tickTimer = null;

function log(text, isErr) {
  if (consoleOutput.querySelector(".muted")) consoleOutput.textContent = "";
  const span = document.createElement("span");
  if (isErr) span.className = "err-line";
  span.textContent = text;
  consoleOutput.appendChild(span);
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

function setStatus(text, kind) {
  statusEl.textContent = text;
  statusEl.className = "status" + (kind ? " " + kind : "");
}

async function boot() {
  try {
    pyodide = await loadPyodide();
    pyodide.setStdout({ batched: (s) => log(s + "\n", false) });
    pyodide.setStderr({ batched: (s) => log(s + "\n", true) });

    const sandboxSrc = await (await fetch("sandbox.py")).text();
    pyodide.FS.writeFile("/home/pyodide/sandbox.py", sandboxSrc);

    loadingOverlay.classList.add("hidden");
    runBtn.disabled = false;
    setStatus("Ready", "ok");
  } catch (err) {
    console.error(err);
    setStatus("Failed to load Python", "err");
    loadingOverlay.querySelector("p").textContent = "Couldn't load the Python runtime. Check your connection and reload.";
  }
}
boot();

function stopTickLoop() {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
}

async function runCode() {
  if (!pyodide) return;
  stopTickLoop();
  consoleOutput.textContent = "";
  setStatus("Running…");
  runBtn.disabled = true;

  try {
    // Fresh globals each run so leftover state doesn't leak between runs.
    pyodide.runPython(`
import sys
for name in [m for m in sys.modules if m == "sandbox"]:
    del sys.modules[name]
`);
    await pyodide.runPythonAsync(editor.value);

    const hasTick = pyodide.runPython("import sandbox; sandbox._has_tick()");
    if (hasTick) {
      const intervalMs = pyodide.runPython("sandbox._tick_interval_ms()");
      tickTimer = setInterval(() => {
        try {
          pyodide.runPython("sandbox._dispatch_tick()");
        } catch (e) {
          log(String(e) + "\n", true);
          stopTickLoop();
        }
      }, intervalMs);
    }

    setStatus("Ready", "ok");
  } catch (err) {
    log(String(err) + "\n", true);
    setStatus("Error", "err");
  } finally {
    runBtn.disabled = false;
  }
}

runBtn.addEventListener("click", runCode);
editor.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
    e.preventDefault();
    runCode();
  }
});

/* ===================== Byte (mock AI assistant) ===================== */

const aiFab = document.getElementById("ai-fab");
const aiPanel = document.getElementById("ai-panel");
const aiClose = document.getElementById("ai-close");
const aiForm = document.getElementById("ai-form");
const aiInput = document.getElementById("ai-input");
const aiMessages = document.getElementById("ai-messages");
const openFromCallout = document.getElementById("open-ai-from-callout");

function openAI() {
  aiPanel.classList.add("open");
  aiPanel.setAttribute("aria-hidden", "false");
  aiInput.focus();
}
function closeAI() {
  aiPanel.classList.remove("open");
  aiPanel.setAttribute("aria-hidden", "true");
}
aiFab.addEventListener("click", () => aiPanel.classList.contains("open") ? closeAI() : openAI());
openFromCallout.addEventListener("click", openAI);
aiClose.addEventListener("click", closeAI);

function addMessage(text, who) {
  const div = document.createElement("div");
  div.className = "msg " + who;
  div.textContent = text;
  aiMessages.appendChild(div);
  aiMessages.scrollTop = aiMessages.scrollHeight;
  return div;
}

addMessage("Hey! I'm Byte. Ask me about Python errors, or say \"game\" or \"draw\" for ideas. (I'm a demo assistant with canned answers for now.)", "bot");

const AI_RULES = [
  { kw: ["error", "traceback", "exception", "bug", "broken"],
    reply: "Errors in the sandbox show up in red in the Console tab. Read the last line first — it usually names the problem (e.g. NameError, IndentationError). Paste the exact message here if you want a pointer." },
  { kw: ["indent", "indentation"],
    reply: "Python cares about indentation! Make sure lines inside a for/if/def block are indented with the same number of spaces (the editor's Tab key inserts 4)." },
  { kw: ["loop", "for", "while"],
    reply: "For a fixed number of repeats, use `for i in range(n):`. For \"keep going until something happens\", use `while condition:`. Try the \"Loops & math\" example in the dropdown!" },
  { kw: ["function", "def"],
    reply: "Define a function with `def name(args):` then indent the body. Call it later with `name(values)`. Functions are great for reusing drawing code in the game loop." },
  { kw: ["draw", "drawing", "canvas", "shape", "graphics", "visual"],
    reply: "Import the built-in `sandbox` module: `import sandbox`. Then try `sandbox.rect(x, y, w, h)`, `sandbox.circle(x, y, r)`, or `sandbox.line(x1, y1, x2, y2)`. Check the \"Drawing shapes\" example!" },
  { kw: ["game", "keyboard", "key", "move", "arrow"],
    reply: "For a simple game loop, define a `tick()` function and register it with `sandbox.on_tick(tick)`. Use `sandbox.key_down(\"ArrowLeft\")` etc. to read input. See the \"Tiny game\" example." },
  { kw: ["list", "array"],
    reply: "Lists look like `nums = [1, 2, 3]`. Add with `nums.append(4)`, loop with `for n in nums:`, grab one with `nums[0]`." },
  { kw: ["dict", "dictionary"],
    reply: "Dictionaries map keys to values: `scores = {\"alice\": 10}`. Read with `scores[\"alice\"]`, add/update with `scores[\"bob\"] = 5`." },
  { kw: ["hi", "hello", "hey"],
    reply: "Hey there! Try loading an example from the dropdown above the editor, then hit Run and see what happens." },
  { kw: ["real ai", "real api", "api key", "chatgpt", "gpt", "connect"],
    reply: "Right now I'm running on canned demo responses so this page works with zero setup. A developer can wire me up to a real AI API — see the README in this project for where that plugs in." },
];

function respondTo(userText) {
  const t = userText.toLowerCase();
  for (const rule of AI_RULES) {
    if (rule.kw.some((k) => t.includes(k))) return rule.reply;
  }
  return "I'm a demo version of Byte, so my answers are canned for now — try asking about \"errors\", \"loops\", \"drawing\", or \"game\" and I'll point you to the right example.";
}

aiForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = aiInput.value.trim();
  if (!text) return;
  addMessage(text, "user");
  aiInput.value = "";

  const typing = addMessage("Byte is typing…", "bot typing");
  const delay = 500 + Math.random() * 500;
  setTimeout(() => {
    typing.remove();
    addMessage(respondTo(text), "bot");
  }, delay);
});
