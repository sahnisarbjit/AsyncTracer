const { Tracer, NoopCollector } = require('../index');

console.log('Starting worker');

// Set the tracer to debug mode
Tracer.debug();

// Initialize the tracer lib with the included default Noop collector
const tracer = new Tracer(NoopCollector);

console.log('Start of script');

// Inject our function into the tracer lib with a label `simple.method`
tracer.inject('simple.method', () => {
    console.log('Starting timeout.');

    // Set a tag for the trace
    tracer.tag('level', 0);

    // Start an async operation
    setTimeout(() => {
        // Set a log in the trace
        tracer.log('Author', 'admin');

        try {
            // Throws an error
            throw new Error('This must be caught!!');
        } catch (e) {
            // Log the error in the tracer lib
            tracer.error(e);
        }

        console.log('Timeout finished.');
    }, 500);
});

console.log('End of script');

// On completion the tracer lib outputs the collected data to console
