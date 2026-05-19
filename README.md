# @bishrantomne/heatmap-tracker

Drop-in click tracker for Omne projects. Adds a small floating "Heatmap mode" pill in the corner of every page. Click it to start a tracked session, click "End" to stop. Sessions persist across page refreshes but end when the tab closes.

## Install — script tag

```html
<script
  src="https://cdn.jsdelivr.net/gh/bishrantomne/heatmap-tracker@v0.2.0/dist/tracker.min.js"
  data-project="cycle-count"
  data-endpoint="https://heatmap-proxy-two.vercel.app"
  defer
></script>
```

Once loaded, a small pill appears at the bottom-right of every page. Users click it to opt into a tracked session — nothing is recorded until they do.

## How it works

1. Page loads → floating pill appears: "● Heatmap mode"
2. User clicks the pill → modal asks for their name
3. User submits name → tracking begins, pill becomes "● Recording N — End"
4. User navigates / refreshes → session keeps going, same name
5. User clicks "End" → final flush, session ends, pill returns to idle state
6. User closes tab → session ends automatically, next visit shows idle pill

## API

| Function | Description |
|---|---|
| `mountWidget({ project, endpoint })` | Inject the floating widget. Called automatically by the script-tag build. |
| `start()` | Programmatically open the name modal and begin tracking. |
| `stop()` | Flush events and end the tracked session. |
| `isTracking()` | Returns true while a session is active. |
| `optOut()` | Permanently hide the widget. Persisted in `localStorage`. |

In a Claude Code project with the npm package:

```ts
import { mountWidget } from '@bishrantomne/heatmap-tracker';

mountWidget({ project: 'cycle-count', endpoint: 'https://heatmap-proxy-two.vercel.app' });
```

## Storage

- `sessionStorage.heatmap_active` / `_user_id` / `_user_name` / `_session_id` — active session state. Cleared on tab close or End.
- `localStorage.heatmap_optout` — `"true"` if the user permanently hid the widget.

No persistent user identity. Each session starts fresh with a new name prompt.
