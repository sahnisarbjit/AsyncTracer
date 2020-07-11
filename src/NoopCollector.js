const fs = require('fs');
const util = require('util');

/**
 * Default noop collector implementation.
 * @type {{write(*=): void}}
 */
module.exports = {
    write(data) {
        fs.writeFileSync(
            1,
            `NOOP_COLLECTOR: ${util.format('%j', data)}\n`,
            { flag: 'a' },
        );
    },
};
