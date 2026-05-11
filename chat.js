const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;

// إنشاء خادم HTTP بسيط (ضروري جداً لـ Render)
const server = http.createServer(function(req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Chat Server is Running');
});

// ربط WebSocket بخادم HTTP
const wss = new WebSocket.Server({ server });
const clients = new Map();

wss.on('connection', function(ws) {
    let user = null;

    ws.on('message', function(data) {
        try {
            const msg = JSON.parse(data.toString());

            if (msg.type === 'join') {
                user = { username: msg.username };
                clients.set(ws, user);
                broadcast({ type: 'system', text: '👤 ' + user.username + ' joined', timestamp: Date.now() });
                broadcastOnlineCount();
            } else if (msg.type === 'user' && user) {
                broadcast({ type: 'user', text: msg.text, sender: user.username, timestamp: Date.now() });
            }
        } catch (e) {
            console.error(e);
        }
    });

    ws.on('close', function() {
        if (user) {
            broadcast({ type: 'system', text: '👋 ' + user.username + ' left', timestamp: Date.now() });
            clients.delete(ws);
            broadcastOnlineCount();
        }
    });
});

function broadcast(message) {
    const data = JSON.stringify(message);
    wss.clients.forEach(function(client) {
        if (client.readyState === WebSocket.OPEN) client.send(data);
    });
}

function broadcastOnlineCount() {
    const data = JSON.stringify({ type: 'onlineCount', count: clients.size });
    wss.clients.forEach(function(client) {
        if (client.readyState === WebSocket.OPEN) client.send(data);
    });
}

// تشغيل الخادم
server.listen(PORT, function() {
    console.log('🚀 Server running on port ' + PORT);
});
