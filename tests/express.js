const express = require('express');

const { Tracer } = require('../index');

const app = express();
const port = 3000;

Tracer.debug();

const tracer = new Tracer();

app.use((req, res, next) => {
    tracer.inject('express-app', () => next());
});

app.get('/', (req, res) => res.send('Hello World!'));

app.get('/complex', (req, res) => {
    // Mimic network/db call
    setTimeout(() => {
        res.send('Delayed Hello World!');
    }, 500);
});

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));
