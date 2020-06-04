const { Tracer, Worker } = require('../index');

console.log('Starting worker');

const worker = new Worker({
    port: 4455,
    name: 'test',
});

Tracer.debug();

const tracer = new Tracer(worker);

console.log('Start of script');

tracer.inject('simple.method', () => {
    console.log('Starting timeout.');

    tracer.tag('level', 0);

    setTimeout(() => {
        tracer.log('Author', 'admin');

        try {
            throw new Error('This must be caught!!');
        } catch (e) {
            tracer.error(e);
        }

        console.log('Timeout finished.');
    }, 500);
});

console.log('End of script');
