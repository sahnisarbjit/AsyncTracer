const uuid = require('uuid').v4;

const STATUS = {
    COMPLETE: 'complete',
    IN_FLIGHT: 'in-flight',
};

const simplify = (map) => {
    if (!map.size) {
        return null;
    }

    const obj = {};

    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value] of map) {
        obj[key] = value;
    }

    return obj;
};

const filter = (obj) => {
    if (obj == null) {
        return null;
    }

    if (obj instanceof Array) {
        if (!obj.length) {
            return null;
        }

        obj.forEach(filter);
    } else if (obj.constructor === Object) {
        const keys = Object.keys(obj);
        if (!keys.length) {
            return null;
        }

        keys.forEach((key) => {
            const value = obj[key];
            const filteredValue = filter(value);

            if (filteredValue === null) {
                delete obj[key];
            } else {
                obj[key] = filteredValue;
            }
        });
    }

    return obj;
};

/**
 * Trace class which defines a single trace
 */
class Trace {
    // Id used to identify the trace. A UUID
    #id;

    // Asynchronous Id given by the async hook lib for an execution context
    #asyncId;

    // Type of async operation being traced
    #type;

    // Parent trace if available
    #parentTrace;

    // Trace for the top level execution context
    #rootTrace;

    // Map of children traces for any executions spawned by the current execution context.
    #children = new Map();

    // Logs added to the trace
    #logs = new Map();

    // Tags added to the trace
    #tags = new Map();

    // Stack for the current execution context
    #stack;

    // Trace status at any given time. IN_FLIGHT when executing. COMPLETE when finished
    #status = STATUS.IN_FLIGHT;

    // Timestamp for trace execution context initialization
    #startTime = null;

    // Timestamp for execution completion
    #endTime = null;

    // Label added to the Trace
    #label = '';

    // To define if the trace is for a remote call
    #remote = null;

    /**
     * Trace constructor
     * @param asyncId
     * @param type
     * @param parentTrace
     * @param rootTrace
     */
    constructor(asyncId, type, parentTrace, rootTrace) {
        this.#id = uuid();
        this.#startTime = new Date().getTime();

        this.#asyncId = asyncId;
        this.#type = type;
        this.#parentTrace = parentTrace;

        if (parentTrace) {
            this.#parentTrace = parentTrace;
            parentTrace.addChild(asyncId, this);
        }

        this.#rootTrace = rootTrace || this;
    }

    /**
     * Marks a trace completed
     * @returns {Trace}
     */
    complete() {
        this.#endTime = new Date().getTime();
        this.#status = STATUS.COMPLETE;

        return this;
    }

    /**
     * Returns the trace id
     * @returns {*}
     */
    getId() {
        return this.#id;
    }

    /**
     * Returns the trace type
     * @returns {*}
     */
    getType() {
        return this.#type;
    }

    /**
     * Returns the trace async id
     * @returns {*}
     */
    getAsyncId() {
        return this.#asyncId;
    }

    /**
     * Returns the parent trace
     * @returns {*}
     */
    getParent() {
        return this.#parentTrace;
    }

    /**
     * Returns the parent trace id
     * @returns {*}
     */
    getParentId() {
        const parent = this.getParent();
        return parent ? parent.getId() : null;
    }

    /**
     * Returns the trace initialization timestamp
     * @returns {null}
     */
    getStartTime() {
        return this.#startTime;
    }

    /**
     * Returns the trace completion timestamp
     * @returns {null}
     */
    getEndTime() {
        return this.#endTime;
    }

    /**
     * Returns the root trace for the current execution context
     * @returns {*}
     */
    getRootTrace() {
        return this.#rootTrace;
    }

    /**
     * Returns the current trace status => in_flight | completed
     * @returns {string}
     */
    getStatus() {
        return this.#status;
    }

    /**
     * Returns all children traces
     * @returns {Map<any, any>}
     */
    getChildren() {
        return this.#children;
    }

    /**
     * Returns trace logs
     * @returns {Map<any, any>}
     */
    getLogs() {
        return this.#logs;
    }

    /**
     * Returns trace tags
     * @returns {Map<any, any>}
     */
    getTags() {
        return this.#tags;
    }

    /**
     * Returns current execution context's stack trace
     * @returns {*}
     */
    getStack() {
        return this.#stack;
    }

    /**
     * Returns trace label
     * @returns {string}
     */
    getLabel() {
        return this.#label;
    }

    /**
     * Sets trace label
     * @param label
     * @returns {Trace}
     */
    setLabel(label) {
        this.#label = label;
        return this;
    }

    /**
     * Adds a child trace to the current trace
     * @param asyncId
     * @param trace
     */
    addChild(asyncId, trace) {
        this.getChildren().set(asyncId, trace);
    }

    /**
     * Sets a trace log
     * @param key
     * @param value
     * @returns {Trace}
     */
    log(key, value) {
        this.getLogs().set(key, value);
        return this;
    }

    /**
     * Sets a trace tag
     * @param key
     * @param value
     * @returns {Trace}
     */
    tag(key, value) {
        this.getTags().set(key, value);
        return this;
    }

    /**
     * Marks the current trace as a remote
     * @returns {Trace}
     */
    markRemote() {
        this.#remote = true;
        return this;
    }

    /**
     * Checks if the current trace is the root trace
     * @returns {boolean}
     */
    isRoot() {
        return this.getRootTrace() === this;
    }

    /**
     * Checks if the current trace and all the children traces are completed
     * @returns {boolean}
     */
    isComplete() {
        if (this.getStatus() !== STATUS.COMPLETE) {
            return false;
        }

        if (this.hasChildren()) {
            let result = true;

            this.getChildren().forEach((trace) => {
                if (!trace.isComplete()) {
                    result = false;
                }
            });

            return result;
        }

        return true;
    }

    /**
     * Checks if the current trace is collectible.
     * To be collectible the trace should be a root trace and be completed
     * @returns {boolean|boolean}
     */
    isCollectible() {
        return this.isRoot() && this.isComplete();
    }

    /**
     * Checks if the trace has any children
     * @returns {boolean}
     */
    hasChildren() {
        return this.getChildren().size > 0;
    }

    /**
     * Adds an error to the trace stack
     * @param e
     * @returns {Trace}
     */
    error(e) {
        this.#stack = {
            type: e.name,
            message: e.message,
            stack: e.stack.split('\n').map((line) => line.trim()),
        };

        return this;
    }

    /**
     * Returns a json representation of the trace data
     * @returns {null}
     */
    toJSON() {
        const children = [];
        this.getChildren().forEach((trace) => {
            children.push(trace.toJSON());
        });

        return filter({
            id: this.getId(),
            parent_id: this.isRoot() ? null : this.getRootTrace().getId(),
            type: this.getType(),
            start_time: this.getStartTime(),
            end_time: this.getEndTime(),
            children,
            logs: simplify(this.getLogs()),
            tags: simplify(this.getTags()),
            remote: this.#remote,
            stack: this.getStack(),
        });
    }
}

module.exports = Trace;
