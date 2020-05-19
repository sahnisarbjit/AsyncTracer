import async_hooks from "async_hooks";
import { debug } from './Utils.js';

const defaultOptions = {
    debug: false,
};

class Tracer {

    _options;

    // Tracks async operations currently in progress.
    curAsyncOps = new Map();

    // Async operations at the root of the hierarchy.
    rootAsyncOps = new Map();

    // Records all async operations that have ever happened.
    allAsyncOps = new Map();

    // Records the number of async operations in progress for each label.
    numAsyncOps = new Map();

    // Records the top-level execution contexts currently being tracked.
    executionContexts = new Set();

    // Maps execution context ids to labels.
    labelMap = new Map();

    constructor(options) {
        this._options = {
            ...defaultOptions,
            ...options
        };

        debug.enable(this._options.debug)
    }

    inject = (label, fn) => {
        this.init();

        const executionContext = new async_hooks.AsyncResource(label);
        executionContext.runInAsyncScope(() => {
            const executionContextAsyncId = async_hooks.executionAsyncId();
            this.executionContexts.add(executionContextAsyncId);
            this.labelMap.set(executionContextAsyncId, label);
            fn();
        });
    };

    stop = () => {
        if (this.asyncHook) {
            // checkAsyncOps(this, () => this.asyncHook.disable())
            this.asyncHook.disable()
        }
    };

    init = () => {
        if (!this.asyncHook) {
            this.asyncHook = async_hooks.createHook({
                init: (asyncId, type, triggerAsyncId, resource) => {
                    this.addAsyncOp(asyncId, type, triggerAsyncId, resource);
                },
                before: (asyncId) => {
                    debug("before executing asyncId: ", asyncId);
                },
                after: (asyncId) => {
                    debug("after successful callback of asyncId: ", asyncId);
                },
                destroy: (asyncId) => {
                    this.removeAsyncOp(asyncId, "destroying asyncId: ");
                },
                promiseResolve: (asyncId) => {
                    this.removeAsyncOp(asyncId, "promiseResolve asyncId: ");
                }
            })
        }

        this.asyncHook.enable();
    };

    findExecutionContextId = (asyncId) => {
        if (this.executionContexts.has(asyncId)) {
            return asyncId;
        }

        const asyncOp = this.allAsyncOps.get(asyncId);
        if (asyncOp) {
            return asyncOp.executionContextId;
        }

        return undefined;
    };

    addAsyncOp = (asyncId, type, triggerAsyncId, resource) => {
        const executionContextId = this.findExecutionContextId(triggerAsyncId);
        if (executionContextId === undefined) {
            return;
        }

        const error = {};
        Error.captureStackTrace(error);

        const stack = error.stack.split("\n").map(line => line.trim());

        const asyncOp = {
            asyncId,
            type,
            triggerAsyncId,
            children: new Map(),
            stack,
            status: "in-flight",
            executionContextId,
        };

        const parentOperation = this.allAsyncOps.get(triggerAsyncId);
        if (parentOperation) {
            parentOperation.children.set(asyncId, asyncOp); // Record the hierarchy of asynchronous operations.
        } else {
            this.rootAsyncOps.set(asyncId, asyncOp);
        }

        this.curAsyncOps.set(asyncId, asyncOp);
        this.allAsyncOps.set(asyncId, asyncOp);

        this.numAsyncOps.set(executionContextId, (this.numAsyncOps.get(executionContextId) || 0) + 1);

        debug("initialized type: ", type, "with asyncId: ", asyncId, "having triggerAsyncId: ", triggerAsyncId);
    };

    removeAsyncOp = (asyncId, reason) => {
        const asyncOp = this.curAsyncOps.get(asyncId);
        if (!asyncOp) {
            return;
        }

        asyncOp.status = "completed";

        this.curAsyncOps.delete(asyncId);

        const executionContextId = this.findExecutionContextId(asyncId);
        if (executionContextId !== undefined) {
            const numAsyncOps = this.numAsyncOps.get(executionContextId);
            if (numAsyncOps !== undefined) {
                this.numAsyncOps.set(executionContextId, numAsyncOps - 1);
                debug(reason, asyncId);
            }
        }
    };
}

export default Tracer;
