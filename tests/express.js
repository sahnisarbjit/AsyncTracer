const express = require('express');

const { Tracer, NoopCollector } = require('../index');

// Initialize an express server
const app = express();
const port = 3000;

// Set tracer to debug mode
Tracer.debug();

// Initialize the tracer
const tracer = new Tracer(NoopCollector);

// Inject the tracer onto the express app
// This way we can trace all calls to the express server
app.use((req, res, next) => {
    tracer.inject('express-app', () => {
        tracer
            .tag('host', req.hostname)
            .tag('ip', req.ip)
            .tag('method', req.method)
            .tag('url', req.originalUrl);

        next();
    });
});

// Simple route
app.get('/', (req, res) => res.send('Hello World!'));

// Complex route with a timeout delay
app.get('/complex', (req, res) => {
    // Mimic network/db call
    setTimeout(() => {
        tracer
            .markRemote()
            .tag('url', 'https://api.host.com')
            .tag('status', 200);

        res.send('Delayed Hello World!');
    }, 500);
});

// Route which throws an exception
app.get('/exception', (req, res) => {
    const task = new Promise(((resolve, reject) => {
        // Mimic performance delay
        setTimeout(() => {
            reject(new Error('This route is broken'));
        }, 150);
    }));

    task
        .then(() => {
            console.log('THIS MUST NEVER BE CALLED!!');
            res.send('Success!!');
        })
        .catch((error) => {
            tracer.error(error);
            res.send('Failed as expected!!');
        });
});

// Start the server.
app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));

// Open the routes in the browser on localhost:3000 and see the trace output on the console
