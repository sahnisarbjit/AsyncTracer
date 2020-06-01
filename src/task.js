const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const util = require('util');

parentPort.on('message', (msg) => {
    fs.writeFileSync(1, `${util.format(msg)}\n`, { flag: 'a' });

    // TODO: Write to a writeable stream instead of logging

    // console.log("Received message with data: ", msg);
    // console.log("Worker data: ", workerData);
})

parentPort.postMessage({text: "all ok", time: Date.now()});
