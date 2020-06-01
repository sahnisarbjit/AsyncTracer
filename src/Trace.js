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

class Trace {
    #id;

    #asyncId;

    #type;

    #parentTrace;

    #rootTrace;

    #children = new Map();

    #logs = new Map();

    #tags = new Map();

    #stack;

    #status = STATUS.IN_FLIGHT;

    #startTime = null;

    #endTime = null;

    #label = '';

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

        // TODO: Fix stack tracing
        // const error = {};
        // Error.captureStackTrace(error);
        // this.#stack = error.stack.split('\n').map((line) => line.trim());
    }

    complete() {
        this.#endTime = new Date().getTime();
        this.#status = STATUS.COMPLETE;

        return this;
    }

    getId() {
        return this.#id;
    }

    getType() {
        return this.#type;
    }

    getAsyncId() {
        return this.#asyncId;
    }

    getParent() {
        return this.#parentTrace;
    }

    getParentId() {
        const parent = this.getParent();
        return parent ? parent.getId() : null;
    }

    getStartTime() {
        return this.#startTime;
    }

    getEndTime() {
        return this.#endTime;
    }

    getRootTrace() {
        return this.#rootTrace;
    }

    getStatus() {
        return this.#status;
    }

    getChildren() {
        return this.#children;
    }

    getLogs() {
        return this.#logs;
    }

    getTags() {
        return this.#tags;
    }

    getStack() {
        return this.#stack;
    }

    getLabel() {
        return this.#label;
    }

    setLabel(label) {
        this.#label = label;
        return this;
    }

    addChild(asyncId, trace) {
        this.getChildren().set(asyncId, trace);
    }

    log(key, value) {
        this.getLogs().set(key, value);
        return this;
    }

    tag(key, value) {
        this.getTags().set(key, value);
        return this;
    }

    isRoot() {
        return this.getRootTrace() === this;
    }

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

    isCollectible() {
        return this.isRoot() && this.isComplete();
    }

    hasChildren() {
        return this.getChildren().size > 0;
    }

    toJSON() {
        const children = [];
        this.getChildren().forEach((trace) => {
            children.push(trace.toJSON());
        });

        return filter({
            id: this.getId(),
            parent_id: this.getParentId(),
            trace_id: this.getAsyncId(),
            type: this.getType(),
            start_time: this.getStartTime(),
            end_time: this.getEndTime(),
            children,
            logs: simplify(this.getLogs()),
            tags: simplify(this.getTags()),
            stack: this.getStack(),
        });
    }
}

module.exports = Trace;
