# @bishrantomne/heatmap-tracker

Drop-in click tracker for Omne projects. Sends batched click events to a private GitHub-backed proxy.

## Install — script tag (zero build step)

Drop this into any HTML page:

```html
<script
  src="https://cdn.jsdelivr.net/gh/bishrantomne/heatmap-tracker@v0.1.0/dist/tracker.min.js"
  data-project="cycle-count"
  data-endpoint="https://heatmap-proxy-two.vercel.app"
  defer
></script>
```

First-time visitors see a modal asking for their name. After that, clicks are tracked silently and flushed every 30s.

## Install — npm

```bash
npm i @bishrantomne/heatmap-tracker
```

```ts
import { init } from '@bishrantomne/heatmap-tracker';

init({
  project: 'cycle-count',
  endpoint: 'https://heatmap-proxy-two.vercel.app',
});
```

## API

### `init(options)`

| Option            | Type     | Default  | Description                                                                              |
|-------------------|----------|----------|------------------------------------------------------------------------------------------|
| `project`         | string   | required | Project slug — must exist in `heatmap-data/projects.json`                                |
| `endpoint`        | string   | required | Full URL of the deployed `heatmap-proxy`                                                 |
| `flushIntervalMs` | number   | `30000`  | How often to POST batches                                                                |
| `maxBatchSize`    | number   | `100`    | Flush early once buffer hits this many events                                            |
| `identifyAs`      | string   | —        | Skip the modal and use this name directly (e.g. when host app already has user context) |

### `optOut()`

Permanently disables tracking. Clears stored user ID + name.

### `getUserName()`

Returns the locally stored name, or null.

## What's captured

- `x`, `y` of every click (relative to viewport)
- `page` (`location.pathname` — no query string, no hash)
- `viewportW`, `viewportH`
- `ts` (epoch ms)

Nothing else. No input values, no text content, no scroll position, no DOM paths.

## What's stored locally

- `heatmap_user_id` — UUID returned by the proxy after first registration
- `heatmap_user_name` — display name
- `heatmap_optout` — `"true"` if the user chose not to be tracked
