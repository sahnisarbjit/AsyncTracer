const { Worker } = require('worker_threads');

// Used to spawn a worker thread
class WorkerThread extends Worker {
    constructor(config) {
        super(`${__dirname}/task.js`, { workerData: config });
        this.#initializeListeners();
    }

    // eslint-disable-next-line consistent-return
    #cb = (err) => {
        if (err) return console.error(err);
    };

    #initializeListeners = () => {
        this.on('message', (msg) => this.#cb(null, msg));
        this.on('error', this.#cb);
        this.on('exit', (code) => code !== 0 && console.error(new Error(`Worker stopped with exit code ${code}`)));
    };

    sendData = (tracerData) => this.postMessage(tracerData);

    cleanup = () => this.emit('exit', 0);
}

module.exports = WorkerThread;
