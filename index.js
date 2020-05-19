// An initial example to check if tracer only traces the required async function.

import Tracer from "./src/Tracer.js";

function doTimeout() {
    console.log("Starting timeout.");

    setTimeout(() => {
        console.log("Timeout finished.");
    }, 2000);
}

const tracer = new Tracer();

tracer.inject('test-1', doTimeout);
console.log("Middle of script");
tracer.stop();

console.log("End of script");
