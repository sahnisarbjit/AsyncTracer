const process = require('process');
const Worker = require('./src/Worker.js');

console.log("Starting worker");

const worker = new Worker({
    port: 4455,
    name: "test",
});

worker.sendData({
    name: "yaya"
});

setTimeout(() => {
    worker.sendData({
        name: "tore"
    });
}, 5000);

process.stdin.resume(); //so the program will not close instantly

exitHandler = (options, worker, exitCode) => {
    if (options.cleanup) {
        console.log('exiting worker thread');
        worker.cleanup(); //terminate worker thread
    }
    if (exitCode || exitCode === 0) console.log("Exit code: " + exitCode);
    process.exit();
};

//do something when app is closing
process.on('exit', exitHandler.bind(null, {cleanup: true}, worker));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit: true}, worker));
