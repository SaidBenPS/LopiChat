const WebSocket = require('ws');

// استخدم المنفذ اللي يوفره Render أو 8080 محلياً
const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

const clients = new Map();

console.log(`🚀 الخادم يعمل على المنفذ: ${PORT}`);

wss.on('connection', function connection(ws) {
    let user = null;

    // إرسال عدد المتصلين للجميع عند اتصال جديد
    function broadcastOnlineCount() {
        const data = JSON.stringify({
            type: 'onlineCount',
            count: clients.size
        });
        wss.clients.forEach(function(client) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    }

    ws.on('message', function incoming(rawData) {
        try {
            const msg = JSON.parse(rawData.toString());
            console.log('📩 استقبل:', msg);

            // ─── رسالة تسجيل الدخول ───
            if (msg.type === 'join') {
                user = { username: msg.username };
                clients.set(ws, user);
                console.log(`👤 ${user.username} انضم. إجمالي المستخدمين: ${clients.size}`);

                // إشعار الجميع
                broadcast({
                    type: 'system',
                    text: `👤 ${user.username} انضم للغرفة`,
                    timestamp: Date.now()
                });
                broadcastOnlineCount();
            }

            // ─── رسالة عادية ───
            else if (msg.type === 'user' && user) {
                console.log(`💬 ${user.username}: ${msg.text}`);
                broadcast({
                    type: 'user',
                    text: msg.text,
                    sender: user.username,
                    timestamp: Date.now()
                });
            }

        } catch (e) {
            console.error('❌ خطأ في معالجة الرسالة:', e);
        }
    });

    ws.on('close', () => {
        if (user) {
            console.log(`👋 ${user.username} خرج.`);
            broadcast({
                type: 'system',
                text: `👋 ${user.username} غادر الغرفة`,
                timestamp: Date.now()
            });
            clients.delete(ws);
            broadcastOnlineCount();
        }
    });

    ws.on('error', console.error);
});

// دالة الإرسال للجميع
function broadcast(message) {
    const data = JSON.stringify(message);
    wss.clients.forEach(function(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}
