type InitOptions = {
    /** Project slug, must match an entry in heatmap-data/projects.json */
    project: string;
    /** Full URL of the deployed heatmap-proxy, e.g. https://heatmap-proxy-two.vercel.app */
    endpoint: string;
    /** Flush interval in ms. Default 30000 (30s). */
    flushIntervalMs?: number;
    /** Max events buffered before forced flush. Default 100. */
    maxBatchSize?: number;
    /** Skip the first-time name modal — use when host app already has user context. */
    identifyAs?: string;
};
declare function init(options: InitOptions): void;
declare function optOut(): void;
declare function getUserName(): string | null;

export { getUserName, init, optOut };
