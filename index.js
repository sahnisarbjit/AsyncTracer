const Tracer = require('./src/Tracer.js');
const Worker = require('./src/Worker.js');

console.log("Starting worker");

const worker = new Worker({
    port: 4455,
    name: "test",
});

Tracer.debug();

const tracer = new Tracer(worker);

console.log('Start of script');

tracer.inject('simple.method', () => {
    console.log('Starting timeout.');

    tracer.tag('level', 0);

    setTimeout(() => {
        tracer.log('Author', 'admin');

        console.log('Timeout finished.');
    }, 500);
});

console.log('End of script');
