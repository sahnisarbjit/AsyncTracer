const Tracer = require('./src/Tracer.js');

Tracer.debug();

const tracer = new Tracer();

console.log('Start of script');

tracer.inject('simple.method', () => {
    console.log('Starting timeout.');

    setTimeout(() => {
        console.log('Timeout finished.');
    }, 500);
});

console.log('End of script');
