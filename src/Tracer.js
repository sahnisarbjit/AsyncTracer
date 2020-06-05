const { createHook, AsyncResource, executionAsyncId } = require('async_hooks');
const fs = require('fs');
const util = require('util');

const Trace = require('./Trace');

let debugging = false;

class Tracer {
    #asyncHook;

    #labels = new Map();

    // Records the top-level execution contexts currently being tracked.
    #rootTraces = new Map();

    // Tracks async operations currently in progress.
    #curTraces = new Map();

    // Records all async operations that have ever happened.
    #allTraces = new Map();

    // Records the number of async operations in progress for each label.
    #numTraces = new Map();

    #collector;

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

    enable() {
        this.#asyncHook.enable();
    }

    log(key, value) {
        this.#getCurrentTrace().log(key, value);
        return this;
    }

    tag(key, value) {
        this.#getCurrentTrace().tag(key, value);
        return this;
    }

    error(e) {
        const trace = this.#getCurrentTrace();
        trace.error(e);
        this.#removeTrace(trace.getAsyncId(), 'Exception');

        return this;
    }

    markRemote() {
        this.#getCurrentTrace().markRemote();
        return this;
    }

    #getCurrentTrace = () => this.#allTraces.get(executionAsyncId());

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

    #removeCollectedTrace = (trace) => {
        if (trace.hasChildren()) {
            trace.getChildren().forEach(((child) => {
                this.#removeCollectedTrace(child);
            }));
        }

        this.#allTraces.delete(trace.getAsyncId());
    };

    #logger = (...args) => {
        if (!debugging) return;

        fs.writeFileSync(1, `${util.format(...args)}\n`, { flag: 'a' });
    };

    static debug() {
        debugging = true;
    }
}

module.exports = Tracer;
