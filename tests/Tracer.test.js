const Tracer = require('../src/Tracer.js');

jest.mock('uuid', () => ({
    v4: jest.fn(() => 'ab6672a1-8c90-4e41-8773-51c2c881f3a9'),
}));
jest.mock('async_hooks', () => ({
    ...jest.requireActual('async_hooks'),
    // executionAsyncId: jest.fn(() => '1123'),
}));

describe('Tracer injection label tests', () => {
    const t = new Tracer(() => {
    });
    test('Tracer init with string label does not throw error', () => {
        expect(() => {
            t.inject('sss', () => {
            });
        }).not.toThrowError();
    });

    test('Tracer init with numeric label throws error', () => {
        expect(() => {
            t.inject(123, () => {
            });
        }).toThrowError(Error('Please provide trace label'));
    });

    test('Tracer init with boolean label throws error', () => {
        expect(() => {
            t.inject(true, () => {
            });
        }).toThrowError(Error('Please provide trace label'));
    });
});

describe('Tracer tagging tests', () => {
    test('add a single tag to trace', (done) => {
        const t = new Tracer({
            name: 'Single tag trace',
            write(msg) {
                try {
                    expect(msg).toMatchObject({
                        tags: {
                            key: 'value',
                        },
                    });
                    done();
                } catch (error) {
                    done(error);
                }
            },
        });

        const hello = async () => 'Hello';
        t.inject('test', () => {
            t.tag('key', 'value');
            hello().then(() => true);
        });
    });

    test('add multiple tags to a trace', (done) => {
        const t = new Tracer({
            name: 'Multiple tag trace',
            write(msg) {
                try {
                    expect(msg).toMatchObject({
                        tags: {
                            key1: 'value1',
                            key2: 'value2',
                            key3: 'value3',
                            key4: 'value4',
                        },
                    });
                    done();
                } catch (error) {
                    done(error);
                }
            },
        });

        const hello = async () => 'Hello';
        t.inject('test', () => {
            t
                .tag('key1', 'value1')
                .tag('key2', 'value2')
                .tag('key3', 'value3')
                .tag('key4', 'value4');
            hello().then(() => true);
        });
    });
});

describe('Tracer remote tests', () => {
    test('mark a trace remote', (done) => {
        const t = new Tracer({
            name: 'Remote trace',
            write(msg) {
                try {
                    expect(msg).toMatchObject({
                        id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                        children: [{
                            id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                            parent_id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                            type: 'PROMISE',
                            children: [{
                                id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                                parent_id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                                type: 'PROMISE',
                            }],
                        }],
                        remote: true,
                    });
                    done();
                } catch (error) {
                    done(error);
                }
            },
        });

        const hello = async () => 'Hello';
        t.inject('test', () => {
            t.markRemote();
            hello().then(() => true);
        });
    });
});

describe('Tracer log tests', () => {
    test('log in a trace', (done) => {
        const t = new Tracer({
            name: 'log trace',
            write(msg) {
                try {
                    expect(msg).toMatchObject({
                        logs: {
                            key: 'value',
                        },
                    });
                    done();
                } catch (error) {
                    done(error);
                }
            },
        });

        const hello = async () => {
            t.log('key', 'value');
            return 'hello';
        };
        t.inject('test', () => hello().then(() => true));
    });

    test('multiple logs in a trace', (done) => {
        const t = new Tracer({
            name: 'multiple log trace',
            write(msg) {
                try {
                    expect(msg).toMatchObject({
                        logs: {
                            key1: 'value1',
                            key2: 'value2',
                            key3: 'value3',
                            key4: 'value4',
                        },
                    });
                    done();
                } catch (error) {
                    done(error);
                }
            },
        });

        const hello = async () => {
            t
                .log('key1', 'value1')
                .log('key2', 'value2')
                .log('key3', 'value3')
                .log('key4', 'value4');
            return 'hello';
        };
        t.inject('test', () => hello().then(() => true));
    });
});

describe('Tracer collector tests', () => {
    test('trace a simple async function', (done) => {
        const t = new Tracer({
            name: 'Simple async trace',
            write(msg) {
                try {
                    expect(msg).toMatchObject({
                        id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                        children: [{
                            id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                            parent_id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                            type: 'PROMISE',
                            children: [{
                                id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                                parent_id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                                type: 'PROMISE',
                            }],
                        }],
                    });
                    done();
                } catch (error) {
                    done(error);
                }
            },
        });

        const hello = async () => 'Hello';
        t.inject('test', () => hello().then(() => true));
    });

    test('trace a simple timeout function', (done) => {
        const t = new Tracer({
            name: 'Simple timeout trace',
            write(msg) {
                try {
                    expect(msg).toMatchObject({
                        id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                        children: [{
                            id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                            parent_id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                            type: 'Timeout',
                        }],
                    });
                    done();
                } catch (error) {
                    done(error);
                }
            },
        });

        t.inject('test', () => {
            setTimeout(() => {
            }, 500);
        });
    });

    test('trace a nested async call', (done) => {
        const t = new Tracer({
            name: 'nested async trace',
            write(msg) {
                try {
                    expect(msg).toMatchObject({
                        id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                        children: [{
                            id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                            parent_id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                            type: 'PROMISE',
                        }, {
                            id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                            parent_id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                            type: 'PROMISE',
                            children: [{
                                id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                                parent_id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                                type: 'PROMISE',
                            }],
                        }],
                    });
                    done();
                } catch (error) {
                    done(error);
                }
            },
        });

        const hello = async () => {
            await new Promise((resolve) => {
                resolve('hello');
            });
        };
        t.inject('test', () => hello());
    });

    test('trace a nested async call with timeout', (done) => {
        const t = new Tracer({
            name: 'nested async timeout trace',
            write(msg) {
                try {
                    expect(msg).toMatchObject({
                        id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                        children: [{
                            id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                            parent_id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                            type: 'PROMISE',
                        }, {
                            id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                            parent_id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                            type: 'PROMISE',
                            children: [{
                                id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                                parent_id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                                type: 'PROMISE',
                            }],
                        }, {
                            id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                            parent_id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                            type: 'Timeout',
                        }],
                    });
                    done();
                } catch (error) {
                    done(error);
                }
            },
        });

        const hello = async () => {
            await new Promise((resolve) => {
                setTimeout(() => {
                    resolve('hello');
                }, 100);
            });
        };
        t.inject('test', () => hello());
    });
});

describe('Tracer error stack tests', () => {
    test('trace a simple timeout function while throwing an error', (done) => {
        const t = new Tracer({
            name: 'Simple timeout trace with error',
            write(msg) {
                try {
                    expect(msg).toMatchObject({
                        id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                        children: [{
                            id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                            parent_id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                            type: 'Timeout',
                            stack: {
                                message: 'This must be caught!!',
                                type: 'Error',
                            },
                        }],
                    });
                    done();
                } catch (error) {
                    done(error);
                }
            },
        });

        t.inject('test', () => {
            setTimeout(() => {
                try {
                    throw new Error('This must be caught!!');
                } catch (e) {
                    t.error(e);
                }
            }, 500);
        });
    });

    test('trace a nested async call with timeout while throwing an error', (done) => {
        const t = new Tracer({
            name: 'nested async timeout trace with error',
            write(msg) {
                try {
                    expect(msg).toMatchObject({
                        id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                        children: [{
                            id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                            parent_id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                            type: 'PROMISE',
                        }, {
                            id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                            parent_id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                            type: 'PROMISE',
                            children: [{
                                id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                                parent_id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                                type: 'PROMISE',
                            }],
                        }, {
                            id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                            parent_id: 'ab6672a1-8c90-4e41-8773-51c2c881f3a9',
                            type: 'Timeout',
                            stack: {
                                message: 'This must be caught!!',
                                type: 'Error',
                            },
                        }],
                    });
                    done();
                } catch (error) {
                    done(error);
                }
            },
        });

        const hello = async () => {
            await new Promise((resolve) => {
                setTimeout(() => {
                    try {
                        throw new Error('This must be caught!!');
                    } catch (e) {
                        t.error(e);
                    }
                    resolve('hello');
                }, 100);
            });
        };
        t.inject('test', () => hello());
    });
});
