const { createHook, AsyncResource, executionAsyncId } = require('async_hooks');
const fs = require('fs');
const util = require('util');

const Trace = require('./Trace');

// To enable debug mode or not
let debugging = false;

/**
 * Tracer library
 */
class Tracer {
    // Async hook lib instance
    #asyncHook;

    // Trace labels
    #labels = new Map();

    // Records the top-level execution contexts currently being tracked.
    #rootTraces = new Map();

    // Tracks async operations currently in progress.
    #curTraces = new Map();

    // Records all async operations that have ever happened.
    #allTraces = new Map();

    // Records the number of async operations in progress for each label.
    #numTraces = new Map();

    // Collector to write the trace data on collect
    #collector;

    /**
     * Tracer constructor
     * @param collector
     */
    constructor(collector) {
        if (!collector) {
            throw new Error('Please provide collector to Tracer');
        }

        this.#collector = collector;
        this.#asyncHook = createHook({
            init: (asyncId, type, triggerAsyncId) => {
                this.#addTrace(asyncId, type, triggerAsyncId);
            },
            destroy: (asyncId) => {
                this.#removeTrace(asyncId, 'Destroy');
            },
            promiseResolve: (asyncId) => {
                this.#removeTrace(asyncId, 'Promise Resolved');
            },
        });

        this.enable();
    }

    /**
     * Injector wraps the given function in an async execution context and starts the trace.
     * @param label
     * @param fn
     */
    inject(label, fn) {
        if (!label || typeof label !== 'string') {
            throw new Error('Please provide trace label');
        }

        this.enable();

        const rootContext = new AsyncResource(label);
        rootContext.runInAsyncScope(() => {
            const asyncId = executionAsyncId();

            const trace = new Trace(asyncId);
            trace.setLabel(label);

            this.#allTraces.set(asyncId, trace);
            this.#rootTraces.set(asyncId, trace);
            this.#numTraces.set(asyncId, 0);
            this.#labels.set(asyncId, label);

            fn();

            trace.complete();
        });
    }

    /**
     * Enables the async hook tracer
     */
    enable() {
        this.#asyncHook.enable();
    }

    /**
     * Adds a log to the current trace
     * @param key
     * @param value
     * @returns {Tracer}
     */
    log(key, value) {
        this.#getCurrentTrace().log(key, value);
        return this;
    }

    /**
     * Adds a tag to the current trace
     * @param key
     * @param value
     * @returns {Tracer}
     */
    tag(key, value) {
        this.#getCurrentTrace().tag(key, value);
        return this;
    }

    /**
     * Error handling. Adds an error stack to the trace and completes it
     * @param e
     * @returns {Tracer}
     */
    error(e) {
        const trace = this.#getCurrentTrace();
        trace.error(e);
        this.#removeTrace(trace.getAsyncId(), 'Exception');

        return this;
    }

    /**
     * Marks the current trace as remote
     * @returns {Tracer}
     */
    markRemote() {
        this.#getCurrentTrace().markRemote();
        return this;
    }

    /**
     * Fetches the current trace
     * @returns {any}
     */
    #getCurrentTrace = () => this.#allTraces.get(executionAsyncId());

    /**
     * Finds and returns the root trace for the execution context
     * @param asyncId
     * @returns {undefined|any}
     */
    #findRootTrace = (asyncId) => {
        if (this.#rootTraces.has(asyncId)) {
            return this.#rootTraces.get(asyncId);
        }

        const trace = this.#allTraces.get(asyncId);
        if (trace) {
            return trace.getRootTrace();
        }

        return undefined;
    };

    /**
     * Adds a new trace to the context
     * @param asyncId
     * @param type
     * @param triggerAsyncId
     */
    #addTrace = (asyncId, type, triggerAsyncId) => {
        const rootContextTrace = this.#findRootTrace(triggerAsyncId);
        if (rootContextTrace === undefined) {
            return;
        }

        const parentTrace = this.#allTraces.get(triggerAsyncId);
        const trace = new Trace(asyncId, type, parentTrace, rootContextTrace);

        if (parentTrace) {
            // Record the hierarchy of asynchronous operations.
            parentTrace.addChild(asyncId, trace);
        }

        this.#curTraces.set(asyncId, trace);
        this.#allTraces.set(asyncId, trace);

        const rootContextId = rootContextTrace.getAsyncId();
        this.#numTraces.set(
            rootContextId,
            this.#numTraces.get(rootContextId) + 1,
        );

        const label = this.#labels.get(rootContextId);
        this.#logger(
            'LABEL: %s -> Initialize -> Type: %s, AsyncId: %s, ParentAsyncId: %s, ContextId: %s',
            label,
            type,
            asyncId,
            triggerAsyncId,
            rootContextId,
        );
    };

    /**
     * Removes a trace from the lib context
     * Marks the trace complete and collects it
     * @param asyncId
     * @param reason
     */
    #removeTrace = (asyncId, reason) => {
        const trace = this.#curTraces.get(asyncId);
        if (!trace) {
            return;
        }

        trace.complete();

        const rootContextTrace = this.#findRootTrace(asyncId);

        if (rootContextTrace !== undefined) {
            const rootContextId = rootContextTrace.getAsyncId();
            const label = this.#labels.get(rootContextId);
            const numTraces = this.#numTraces.get(rootContextId);

            if (numTraces !== undefined) {
                this.#logger('LABEL: %s -> %s -> AsyncId: %s', label, reason, asyncId);
                this.#numTraces.set(rootContextId, numTraces - 1);
            }
        }

        this.#collect(trace);
        this.#curTraces.delete(asyncId);
        this.#labels.delete(asyncId);
    };

    /**
     * Collects a trace
     * Only possible if there are no pending traces and the root trace is collectible
     * @param trace
     */
    #collect = (trace) => {
        const rootTrace = trace.getRootTrace();
        const pendingTraces = this.#numTraces.get(rootTrace.getAsyncId());

        if (!pendingTraces && rootTrace.isCollectible()) {
            const traceData = rootTrace.toJSON();

            this.#logger(
                'LABEL: %s -> Collecting:',
                rootTrace.getLabel(),
                JSON.stringify(traceData),
            );

            // Non-blocking
            setTimeout(() => this.#collector.write(traceData), 0);

            this.#removeCollectedTrace(trace);
        }
    };

    /**
     * Removes a collected trace from tracer lib
     * @param trace
     */
    #removeCollectedTrace = (trace) => {
        if (trace.hasChildren()) {
            trace.getChildren().forEach(((child) => {
                this.#removeCollectedTrace(child);
            }));
        }

        this.#allTraces.delete(trace.getAsyncId());
    };

    /**
     * Default lib logger
     * Logs to the console if debugging is set to true
     * @param args
     */
    #logger = (...args) => {
        if (!debugging) return;

        fs.writeFileSync(1, `${util.format(...args)}\n`, { flag: 'a' });
    };

    /**
     * Sets lib to debug mode
     * Starts logging to console
     */
    static debug() {
        debugging = true;
    }
}

module.exports = Tracer;
