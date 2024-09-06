const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Serve the index.html file
const server = http.createServer((req, res) => {
    if (req.url === '/') {
        fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading index.html');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
    }
});

// Create a WebSocket server on top of the HTTP server
const wss = new WebSocket.Server({ server });

const clients = new Set();

wss.on('connection', (ws) => {
    clients.add(ws);
    updateUserCount();

    ws.on('message', (message) => {
        const parsedMessage = JSON.parse(message);

        if (parsedMessage.type === 'message') {
            // Broadcast the message to all clients
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'message', content: parsedMessage.content }));
                }
            });
        } else if (parsedMessage.type === 'typing') {
            // Broadcast typing status to all clients
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'typing', username: parsedMessage.username }));
                }
            });
        } else if (parsedMessage.type === 'userCountRequest') {
            updateUserCount();
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
        updateUserCount();
    });
});

function updateUserCount() {
    const count = clients.size;
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'userCount', count: count }));
        }
    });
}

// Start the server
const port = process.env.PORT || 8080;
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
