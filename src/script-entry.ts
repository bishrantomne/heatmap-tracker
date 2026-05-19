import { mountWidget, start, stop, isTracking, optOut } from './index.js';

(() => {
  const script = document.currentScript as HTMLScriptElement | null;
  if (!script) {
    console.warn('[heatmap-tracker] could not find own <script> tag');
    return;
  }

  const project = script.dataset.project;
  const endpoint = script.dataset.endpoint;

  if (!project || !endpoint) {
    console.warn('[heatmap-tracker] missing data-project or data-endpoint');
    return;
  }

  mountWidget({ project, endpoint });
})();

export { mountWidget, start, stop, isTracking, optOut };
