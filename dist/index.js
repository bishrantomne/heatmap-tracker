// src/index.ts
var LS_USER_ID = "heatmap_user_id";
var LS_USER_NAME = "heatmap_user_name";
var LS_OPTOUT = "heatmap_optout";
var state = null;
function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : r & 3 | 8;
    return v.toString(16);
  });
}
function isOptedOut() {
  try {
    return localStorage.getItem(LS_OPTOUT) === "true";
  } catch {
    return false;
  }
}
function getStoredUserId() {
  try {
    return localStorage.getItem(LS_USER_ID);
  } catch {
    return null;
  }
}
async function registerUser(name) {
  if (!state) throw new Error("Tracker not initialized");
  const res = await fetch(`${state.options.endpoint}/api/v1/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });
  if (!res.ok) throw new Error(`User registration failed: ${res.status}`);
  const data = await res.json();
  try {
    localStorage.setItem(LS_USER_ID, data.userId);
    localStorage.setItem(LS_USER_NAME, data.name);
  } catch {
  }
  return data.userId;
}
function showFirstTimeModal() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.setAttribute("data-heatmap-modal", "");
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.6);
      display: flex; align-items: center; justify-content: center;
      z-index: 2147483647; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      backdrop-filter: blur(4px);
    `;
    const card = document.createElement("div");
    card.style.cssText = `
      background: #1a1a1a; color: #fff; border: 1px solid #333;
      border-radius: 12px; padding: 28px; width: 420px; max-width: 90vw;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    `;
    card.innerHTML = `
      <h2 style="margin:0 0 8px;font-size:18px;font-weight:600;">First time here</h2>
      <p style="margin:0 0 20px;color:#aaa;font-size:14px;line-height:1.5;">
        We track clicks anonymously to improve this product. Enter your name so we can label your session.
      </p>
      <input
        data-heatmap-name
        type="text"
        placeholder="Your name"
        style="width:100%;padding:10px 12px;background:#0a0a0a;border:1px solid #333;
               border-radius:6px;color:#fff;font-size:14px;box-sizing:border-box;outline:none;"
        autofocus
      />
      <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end;">
        <button data-heatmap-skip
          style="padding:8px 14px;background:transparent;border:1px solid #333;
                 border-radius:6px;color:#aaa;cursor:pointer;font-size:13px;">
          Don't track me
        </button>
        <button data-heatmap-submit
          style="padding:8px 14px;background:#fff;border:1px solid #fff;
                 border-radius:6px;color:#000;cursor:pointer;font-size:13px;font-weight:500;">
          Start
        </button>
      </div>
    `;
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    const input = card.querySelector("[data-heatmap-name]");
    const submitBtn = card.querySelector("[data-heatmap-submit]");
    const skipBtn = card.querySelector("[data-heatmap-skip]");
    setTimeout(() => input.focus(), 50);
    const cleanup = () => overlay.remove();
    const submit = () => {
      const name = input.value.trim();
      if (!name) {
        input.style.borderColor = "#f55";
        return;
      }
      cleanup();
      resolve(name);
    };
    submitBtn.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
    skipBtn.addEventListener("click", () => {
      try {
        localStorage.setItem(LS_OPTOUT, "true");
      } catch {
      }
      cleanup();
      resolve(null);
    });
  });
}
async function ensureUser(identifyAs) {
  const existing = getStoredUserId();
  if (existing) return existing;
  let name = identifyAs;
  if (!name) {
    const fromModal = await showFirstTimeModal();
    if (!fromModal) return null;
    name = fromModal;
  }
  return registerUser(name);
}
function onClick(e) {
  if (!state || !state.userId) return;
  state.buffer.push({
    x: Math.round(e.clientX),
    y: Math.round(e.clientY),
    page: location.pathname,
    viewportW: window.innerWidth,
    viewportH: window.innerHeight,
    ts: Date.now()
  });
  if (state.buffer.length >= state.options.maxBatchSize) {
    void flush();
  }
}
async function flush(useBeacon = false) {
  if (!state || !state.userId || state.buffer.length === 0) return;
  const events = state.buffer;
  state.buffer = [];
  const batchNumber = state.batchNumber++;
  const payload = {
    project: state.options.project,
    sessionId: state.sessionId,
    userId: state.userId,
    batchNumber,
    events
  };
  const url = `${state.options.endpoint}/api/v1/events`;
  if (useBeacon && navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    navigator.sendBeacon(url, blob);
    return;
  }
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true
    });
  } catch {
    if (state) state.buffer.unshift(...events);
  }
}
function init(options) {
  if (state?.started) {
    console.warn("[heatmap-tracker] already initialized");
    return;
  }
  if (isOptedOut()) return;
  state = {
    options: {
      project: options.project,
      endpoint: options.endpoint.replace(/\/$/, ""),
      flushIntervalMs: options.flushIntervalMs ?? 3e4,
      maxBatchSize: options.maxBatchSize ?? 100
    },
    userId: null,
    sessionId: uuid(),
    buffer: [],
    batchNumber: 0,
    flushTimer: null,
    started: true
  };
  void (async () => {
    const userId = await ensureUser(options.identifyAs).catch((err) => {
      console.warn("[heatmap-tracker] user registration failed", err);
      return null;
    });
    if (!userId || !state) return;
    state.userId = userId;
    window.addEventListener("click", onClick, { capture: true, passive: true });
    state.flushTimer = window.setInterval(() => void flush(), state.options.flushIntervalMs);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") void flush(true);
    });
    window.addEventListener("pagehide", () => void flush(true));
  })();
}
function optOut() {
  try {
    localStorage.setItem(LS_OPTOUT, "true");
    localStorage.removeItem(LS_USER_ID);
    localStorage.removeItem(LS_USER_NAME);
  } catch {
  }
  if (state?.flushTimer) clearInterval(state.flushTimer);
  state = null;
}
function getUserName() {
  try {
    return localStorage.getItem(LS_USER_NAME);
  } catch {
    return null;
  }
}
export {
  getUserName,
  init,
  optOut
};
//# sourceMappingURL=index.js.map