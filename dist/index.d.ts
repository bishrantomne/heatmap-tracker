type WidgetConfig = {
    /** Project slug, must match an entry in heatmap-data/projects.json */
    project: string;
    /** Full URL of the deployed heatmap-proxy */
    endpoint: string;
    /** Flush interval in ms. Default 30000. */
    flushIntervalMs?: number;
    /** Max events buffered before forced flush. Default 100. */
    maxBatchSize?: number;
};
declare function start(): Promise<void>;
declare function stop(): Promise<void>;
declare function isTracking(): boolean;
declare function optOut(): void;
declare function mountWidget(config: WidgetConfig): void;

export { isTracking, mountWidget, optOut, start, stop };
