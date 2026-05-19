import { init } from './index.js';

(() => {
  const script = document.currentScript as HTMLScriptElement | null;
  if (!script) {
    console.warn('[heatmap-tracker] could not find own <script> tag — auto-init skipped');
    return;
  }

  const project = script.dataset.project;
  const endpoint = script.dataset.endpoint;

  if (!project || !endpoint) {
    console.warn('[heatmap-tracker] missing data-project or data-endpoint on <script> tag');
    return;
  }

  init({ project, endpoint });
})();

export { init, optOut, getUserName } from './index.js';
