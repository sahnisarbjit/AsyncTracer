const { createHook, AsyncResource, executionAsyncId } = require('async_hooks');
const fs = require('fs');
const util = require('util');

const Trace = require('./Trace');

let debugging = false;

class Tracer {
    #asyncHook;

    #labels = new Map();

    // Records the top-level execution contexts currently being tracked.
    #rootContexts = new Set();

    // Tracks async operations currently in progress.
    #curTraces = new Map();

    // Records all async operations that have ever happened.
    #allTraces = new Map();

    // Records the number of async operations in progress for each label.
    #numTraces = new Map();

    constructor() {
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

            // TODO: Start a root trace instance here.

            this.#rootContexts.add(asyncId);
            this.#labels.set(asyncId, label);

            fn();
        });
    }

    enable() {
        this.#asyncHook.enable();
    }

    disable() {
        this.#asyncHook.disable();
    }

    #findRootContextId = (asyncId) => {
        if (this.#rootContexts.has(asyncId)) {
            return asyncId;
        }

        const trace = this.#allTraces.get(asyncId);
        if (trace) {
            return trace.getRootContextId();
        }

        return undefined;
    };

    #addTrace = (asyncId, type, triggerAsyncId) => {
        const rootContextId = this.#findRootContextId(triggerAsyncId);
        if (rootContextId === undefined) {
            return;
        }

        const trace = new Trace(asyncId, type, triggerAsyncId, rootContextId);

        const parentTrace = this.#allTraces.get(triggerAsyncId);
        if (parentTrace) {
            // Record the hierarchy of asynchronous operations.
            parentTrace.addChild(asyncId, trace);
        }

        this.#curTraces.set(asyncId, trace);
        this.#allTraces.set(asyncId, trace);

        this.#numTraces.set(
            rootContextId,
            (this.#numTraces.get(rootContextId) || 0) + 1,
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

        const rootContextId = this.#findRootContextId(asyncId);
        const label = this.#labels.get(rootContextId);

        if (rootContextId !== undefined) {
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
        if (trace.isCollectible()) {
            // TODO: Send this trace to collector. Logging for now.
            this.#logger('LABEL: %s -> Collecting:', trace.getLabel(), trace.toJSON());

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
