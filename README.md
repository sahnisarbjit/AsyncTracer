<div align="center">
    <h1>Async Tracer</h1>
    <p>
        This is a general purpose async tracer to trace the execution data, timing and relation between async calls etc.
    </p>
</div>

## Table of Contents
1. [Install](#install)
2. [Initialize](#initialize)
3. [Inject](#inject)
4. [Tags/Logs](#tagslogs)
5. [Remote](#remote)
5. [Exceptions](#exceptions)
7. [Debug](#debug)
8. [Example Trace](#example-trace)

<h2 align="center">Install</h2>
Install with npm:

```bash
npm install git://github.com/sahnisarbjit/AsyncTracer.git
```

Install with yarn:

```bash
yarn add git://github.com/sahnisarbjit/AsyncTracer.git
```

<h2 align="center">Initialize</h2>

To initalize the library, we need to setup a collector first. Whose interface must have `write` method as the entry point to accept the incoming data. Use following code to initialize:

```javascript
const { Tracer, NoopCollector } = require('AsyncTracer');

const tracer = new Tracer(NoopCollector);
```

_Please note that `NoopCollector` is just a blank collector which only do STDOUT writes whenever a data stream is written._

<h2 align="center">Inject</h2>

Inject is the wrapper function whose async calls you want to trace. For example:

```javascript
tracer.inject('simple.method', () => {
    // Any async code here
});
```

In the example above, first argument is label you want to give to this trace and second argument is the piece of code you want to trace with this tracer.

<h2 align="center">Tags/Logs</h2>

Tags and logs could be added to any sub-segment using `tag` & `log` method available on tracer. The difference is that tag could be used to filter traces inside collector UI. We can add these using the following syntax in the context where we want to tag the data.

```javascript
// setTimeout is just example
setTimeout(() => {
    tracer
        .tag('cart-items', 5)
        .log('sub-total', '$50');
}, 500);
```

<h2 align="center">Remote</h2>

If you are dealing with some remote calls in any context. You can mark that segment as remote by using following:

```javascript
setTimeout(() => {
    tracer
        .markRemote()
        .tag('url', 'https://api.host.com')
        .tag('status', 200);
}, 500);
```

<h2 align="center">Exceptions</h2>

Exception handling is absolute necessary steps to every piece of software. If you missed thrown exception then tracer won't be able to trace it. You can use tracer as following:

```javascript
// Normal exception
try {
    throw new Error('Example exception!!');
} catch (e) {
    tracer.error(e);

    // Handling this as per requirements.
}

// Promise rejection
task
    .then(() => {
        res.send('Success!!');
    })
    .catch((error) => {
        tracer.error(error);
        res.send('Failed!!');
    });
```

<h2 align="center">Debug</h2>

Debugging could be enabled using:
```javascript
Tracer.debug();
```

_Please note that this is static method not an instance method._

<h2 align="center">Example Trace</h2>

```json
{
    "id": "53b376bd-8f63-408b-aeec-a5de908ce9ed",
    "start_time": 1591556797177,
    "end_time": 1591556797178,
    "children": [
        {
            "id": "f3c86cbd-01a5-436e-8834-509a1f772cc1",
            "parent_id": "53b376bd-8f63-408b-aeec-a5de908ce9ed",
            "type": "TickObject",
            "start_time": 1591556797177,
            "end_time": 1591556797179
        },
        {
            "id": "f4b12c59-5267-41c5-94be-c5f524c774f2",
            "parent_id": "53b376bd-8f63-408b-aeec-a5de908ce9ed",
            "type": "Timeout",
            "start_time": 1591556797178,
            "end_time": 1591556797685,
            "logs": {
                "Author": "admin"
            },
            "stack": {
                "type": "Error",
                "message": "This must be caught!!",
                "stack": [
                    "Error: This must be caught!!",
                    "at Timeout._onTimeout (/Users/sahni/code/personal/AsyncTracer/tests/basic.js:20:19)",
                    "at listOnTimeout (internal/timers.js:531:17)",
                    "at processTimers (internal/timers.js:475:7)"
                ]
            }
        }
    ],
    "tags": {
        "level": 0
    }
}
```
