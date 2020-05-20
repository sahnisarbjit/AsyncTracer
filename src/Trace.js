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

    map.keys().forEach((value, key) => {
        obj[key] = value;
    });

    return obj;
};

class Trace {
    #id;

    #asyncId;

    #type;

    #parentAsyncId;

    #rootContextId;

    #children = new Map();

    #logs = new Map();

    #tags = new Map();

    #stack;

    #status = STATUS.IN_FLIGHT;

    #startTime = null;

    #endTime = null;

    constructor(asyncId, type, parentAsyncId, rootContextId) {
        this.#id = uuid();
        this.#startTime = new Date().getTime();

        this.#asyncId = asyncId;
        this.#type = type;
        this.#parentAsyncId = parentAsyncId;
        this.#rootContextId = rootContextId;

        const error = {};
        Error.captureStackTrace(error);

        this.#stack = error.stack.split('\n').map((line) => line.trim());
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

    getParentAsyncId() {
        // TODO: Fix parent id
        return this.#parentAsyncId;
    }

    getStartTime() {
        return this.#startTime;
    }

    getEndTime() {
        return this.#endTime;
    }

    getRootContextId() {
        return this.#rootContextId;
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
        return this.getRootContextId() === this.getAsyncId();
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
        const logs = simplify(this.getLogs());
        const tags = simplify(this.getTags());

        const children = [];
        this.getChildren().forEach((trace) => {
            children.push(trace.toJSON());
        });

        const json = {
            id: this.getId(),
            parent_id: this.getParentAsyncId(),
            trace_id: this.getAsyncId(),
            type: this.getType(),
            start_time: this.getStartTime(),
            end_time: this.getEndTime(),
        };

        if (logs) {
            json.logs = logs;
        }

        if (tags) {
            json.tags = tags;
        }

        if (children.length) {
            json.children = children;
        }

        const stack = this.getStack();
        if (stack) {
            json.stack = stack;
        }

        return json;
    }
}

module.exports = Trace;
