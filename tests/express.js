const express = require('express');

const { Tracer, NoopCollector } = require('../index');

const app = express();
const port = 3000;

Tracer.debug();

const tracer = new Tracer(NoopCollector);

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

app.get('/', (req, res) => res.send('Hello World!'));

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

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));
