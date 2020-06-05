module.exports = {
    env: {
        commonjs: true,
        es6: true,
        node: true,
        jest: true
    },
    extends: [
        'airbnb-base',
    ],
    globals: {
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
    },
    parser: 'babel-eslint',
    parserOptions: {
        ecmaVersion: 2019,
    },
    rules: {
        'no-console': 0,
        'no-param-reassign': 0,
        'indent': ['error', 4],
    },
};
