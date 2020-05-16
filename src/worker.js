import http from 'http';

const HOST = '0.0.0.0';
const PORT = 8080;

const server = http.createServer();

server.on('error', (err) => console.error(err));

server.on('request', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Worker thread Response!</h1>');
});

server.on('stream', (stream, headers) => {
    stream.respond({
        'content-type': 'text/html',
        ':status': 200
    });

    stream.end('<h1>Worker thread Stream!</h1>');
});

server.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
