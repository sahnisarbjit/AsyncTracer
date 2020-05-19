import fs from "fs";
import util from "util";

let debugging = false;
export const debug = (...args) => {
    if (!debugging) return;

    fs.writeFileSync(1, `${util.format(...args)}\n`, { flag: 'a' });
};

debug.enable = (value) => {
    debugging = value;
};
