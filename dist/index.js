// src/index.ts
var LS_OPTOUT = "heatmap_optout";
var SS_ACTIVE = "heatmap_active";
var SS_USER_ID = "heatmap_session_user_id";
var SS_USER_NAME = "heatmap_session_user_name";
var SS_SESSION_ID = "heatmap_session_id";
var state = null;
var clickListenerAttached = false;
var visibilityListenerAttached = false;
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
function ssGet(k) {
  try {
    return sessionStorage.getItem(k);
  } catch {
    return null;
  }
}
function ssSet(k, v) {
  try {
    sessionStorage.setItem(k, v);
  } catch {
  }
}
function ssDel(k) {
  try {
    sessionStorage.removeItem(k);
  } catch {
  }
}
function showNameModal() {
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
      <h2 style="margin:0 0 8px;font-size:18px;font-weight:600;">Start heatmap session</h2>
      <p style="margin:0 0 20px;color:#aaa;font-size:14px;line-height:1.5;">
        Enter your name to label this session. Clicks will be recorded until you tap End.
      </p>
      <input
        data-heatmap-name
        type="text"
        placeholder="Your name"
        style="width:100%;padding:10px 12px;background:#0a0a0a;border:1px solid #333;
               border-radius:6px;color:#fff;font-size:14px;box-sizing:border-box;outline:none;"
      />
      <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end;">
        <button data-heatmap-cancel
          style="padding:8px 14px;background:transparent;border:1px solid #333;
                 border-radius:6px;color:#aaa;cursor:pointer;font-size:13px;">
          Cancel
        </button>
        <button data-heatmap-submit
          style="padding:8px 14px;background:#fff;border:1px solid #fff;
                 border-radius:6px;color:#000;cursor:pointer;font-size:13px;font-weight:500;">
          Start recording
        </button>
      </div>
    `;
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    const input = card.querySelector("[data-heatmap-name]");
    const submitBtn = card.querySelector("[data-heatmap-submit]");
    const cancelBtn = card.querySelector("[data-heatmap-cancel]");
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
    cancelBtn.addEventListener("click", () => {
      cleanup();
      resolve(null);
    });
  });
}
function buildWidget() {
  if (!state || state.widgetRoot) return;
  const root = document.createElement("div");
  root.setAttribute("data-heatmap-widget", "");
  root.style.cssText = `
    position: fixed; right: 16px; bottom: 16px; z-index: 2147483646;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  `;
  const pill = document.createElement("button");
  pill.setAttribute("data-heatmap-pill", "");
  pill.style.cssText = `
    background: #1a1a1a; color: #e5e5e5; border: 1px solid #333;
    border-radius: 999px; padding: 8px 14px; font-size: 12px; font-weight: 500;
    cursor: pointer; display: flex; align-items: center; gap: 8px;
    box-shadow: 0 4px 14px rgba(0,0,0,0.3);
  `;
  pill.innerHTML = `
    <span style="width:8px;height:8px;border-radius:50%;background:#666;display:inline-block;"></span>
    <span>Heatmap mode</span>
  `;
  pill.addEventListener("click", () => void start());
  const recording = document.createElement("div");
  recording.setAttribute("data-heatmap-recording", "");
  recording.style.cssText = `
    display: none; background: #1a1a1a; color: #e5e5e5; border: 1px solid #333;
    border-radius: 999px; padding: 6px 6px 6px 14px; font-size: 12px; font-weight: 500;
    align-items: center; gap: 10px; box-shadow: 0 4px 14px rgba(0,0,0,0.3);
  `;
  recording.innerHTML = `
    <span style="display:flex;align-items:center;gap:8px;">
      <span data-heatmap-dot style="width:8px;height:8px;border-radius:50%;background:#ef4444;
             display:inline-block;animation:heatmap-pulse 1.4s ease-in-out infinite;"></span>
      <span data-heatmap-label>Recording</span>
      <span data-heatmap-count style="color:#888;tabular-nums;">0</span>
    </span>
    <button data-heatmap-end style="background:#fff;color:#000;border:none;
             border-radius:999px;padding:6px 12px;font-size:11px;font-weight:600;
             cursor:pointer;">End</button>
  `;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes heatmap-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.35; }
    }
  `;
  document.head.appendChild(style);
  recording.querySelector("[data-heatmap-end]").addEventListener("click", () => void stop());
  root.appendChild(pill);
  root.appendChild(recording);
  document.body.appendChild(root);
  state.widgetRoot = root;
  state.pillEl = pill;
  state.recordingEl = recording;
}
function renderWidget() {
  if (!state || !state.pillEl || !state.recordingEl) return;
  if (state.tracking) {
    state.pillEl.style.display = "none";
    state.recordingEl.style.display = "flex";
    const countEl = state.recordingEl.querySelector("[data-heatmap-count]");
    if (countEl) countEl.textContent = String(state.buffer.length + state.batchNumber * 100);
  } else {
    state.pillEl.style.display = "flex";
    state.recordingEl.style.display = "none";
  }
}
async function registerUser(name) {
  if (!state) throw new Error("No state");
  const res = await fetch(`${state.config.endpoint}/api/v1/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });
  if (!res.ok) throw new Error(`User registration failed: ${res.status}`);
  const data = await res.json();
  return data.userId;
}
async function flush(useBeacon = false) {
  if (!state || !state.userId || !state.sessionId || state.buffer.length === 0) return;
  const events = state.buffer;
  state.buffer = [];
  const batchNumber = state.batchNumber++;
  const payload = {
    project: state.config.project,
    sessionId: state.sessionId,
    userId: state.userId,
    batchNumber,
    events
  };
  const url = `${state.config.endpoint}/api/v1/events`;
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
function onClick(e) {
  if (!state || !state.tracking || !state.userId) return;
  const target = e.target;
  if (target?.closest("[data-heatmap-widget]")) return;
  if (target?.closest("[data-heatmap-modal]")) return;
  state.buffer.push({
    x: Math.round(e.clientX),
    y: Math.round(e.clientY),
    page: location.pathname,
    viewportW: window.innerWidth,
    viewportH: window.innerHeight,
    ts: Date.now()
  });
  renderWidget();
  if (state.buffer.length >= state.config.maxBatchSize) {
    void flush();
  }
}
async function start() {
  if (!state) {
    console.warn("[heatmap-tracker] widget not mounted \u2014 call mountWidget() first");
    return;
  }
  if (state.tracking) return;
  if (isOptedOut()) return;
  const name = await showNameModal();
  if (!name) return;
  let userId;
  try {
    userId = await registerUser(name);
  } catch (err) {
    console.warn("[heatmap-tracker] user registration failed", err);
    return;
  }
  state.userId = userId;
  state.userName = name;
  state.sessionId = uuid();
  state.buffer = [];
  state.batchNumber = 0;
  state.tracking = true;
  ssSet(SS_ACTIVE, "1");
  ssSet(SS_USER_ID, userId);
  ssSet(SS_USER_NAME, name);
  ssSet(SS_SESSION_ID, state.sessionId);
  attachListeners();
  state.flushTimer = window.setInterval(() => void flush(), state.config.flushIntervalMs);
  renderWidget();
}
async function stop() {
  if (!state || !state.tracking) return;
  await flush();
  if (state.flushTimer) {
    clearInterval(state.flushTimer);
    state.flushTimer = null;
  }
  state.tracking = false;
  state.userId = null;
  state.userName = null;
  state.sessionId = null;
  state.buffer = [];
  state.batchNumber = 0;
  ssDel(SS_ACTIVE);
  ssDel(SS_USER_ID);
  ssDel(SS_USER_NAME);
  ssDel(SS_SESSION_ID);
  renderWidget();
}
function isTracking() {
  return state?.tracking ?? false;
}
function optOut() {
  try {
    localStorage.setItem(LS_OPTOUT, "true");
  } catch {
  }
  void stop();
  if (state?.widgetRoot) {
    state.widgetRoot.remove();
    state.widgetRoot = null;
    state.pillEl = null;
    state.recordingEl = null;
  }
}
function attachListeners() {
  if (!clickListenerAttached) {
    window.addEventListener("click", onClick, { capture: true, passive: true });
    clickListenerAttached = true;
  }
  if (!visibilityListenerAttached) {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") void flush(true);
    });
    window.addEventListener("pagehide", () => void flush(true));
    visibilityListenerAttached = true;
  }
}
function mountWidget(config) {
  if (state) {
    console.warn("[heatmap-tracker] widget already mounted");
    return;
  }
  if (isOptedOut()) return;
  state = {
    config: {
      project: config.project,
      endpoint: config.endpoint.replace(/\/$/, ""),
      flushIntervalMs: config.flushIntervalMs ?? 3e4,
      maxBatchSize: config.maxBatchSize ?? 100
    },
    tracking: false,
    userId: null,
    userName: null,
    sessionId: null,
    buffer: [],
    batchNumber: 0,
    flushTimer: null,
    widgetRoot: null,
    pillEl: null,
    recordingEl: null
  };
  const init = () => {
    buildWidget();
    const wasActive = ssGet(SS_ACTIVE) === "1";
    const savedUserId = ssGet(SS_USER_ID);
    const savedUserName = ssGet(SS_USER_NAME);
    const savedSessionId = ssGet(SS_SESSION_ID);
    if (wasActive && savedUserId && savedUserName && savedSessionId && state) {
      state.userId = savedUserId;
      state.userName = savedUserName;
      state.sessionId = savedSessionId;
      state.tracking = true;
      attachListeners();
      state.flushTimer = window.setInterval(() => void flush(), state.config.flushIntervalMs);
    }
    renderWidget();
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}
export {
  isTracking,
  mountWidget,
  optOut,
  start,
  stop
};
//# sourceMappingURL=index.js.map