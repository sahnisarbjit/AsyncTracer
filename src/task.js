const { parentPort, workerData } = require('worker_threads');

parentPort.on('message', (msg) => {
    console.log("Received message with data: ", msg);
    console.log("Worker data: ", workerData);
})

parentPort.postMessage({text: "all ok", time: Date.now()});
