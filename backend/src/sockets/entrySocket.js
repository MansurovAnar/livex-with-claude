const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const { accessSecret } = require('../config/jwt');

// Map<examId, Set<WebSocket>>
const rooms = new Map();

function initSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    // Authenticate via token in query string: /ws?token=...
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    try {
      jwt.verify(token, accessSecret);
    } catch {
      ws.close(1008, 'Unauthorized');
      return;
    }

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'subscribe' && msg.exam_id) {
          if (!rooms.has(msg.exam_id)) rooms.set(msg.exam_id, new Set());
          rooms.get(msg.exam_id).add(ws);
          ws._subscribedExam = msg.exam_id;
        }
      } catch { /* ignore malformed messages */ }
    });

    ws.on('close', () => {
      if (ws._subscribedExam && rooms.has(ws._subscribedExam)) {
        rooms.get(ws._subscribedExam).delete(ws);
      }
    });
  });
}

function broadcast(examId, payload) {
  const clients = rooms.get(examId);
  if (!clients) return;
  const msg = JSON.stringify(payload);
  for (const client of clients) {
    if (client.readyState === 1) client.send(msg);
  }
}

module.exports = { initSocket, broadcast };
