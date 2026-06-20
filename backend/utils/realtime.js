/*
  Purpose: Real-time update utilities.
  Responsibility: Broadcast database event notifications to all connected clients over WebSockets.
*/
const WebSocket = require('ws');

function broadcast(req, payload) {
  try {
    const wss = req.app.get('wss');
    if (!wss) return;
    const message = JSON.stringify(payload);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  } catch (err) {
    console.error('Error broadcasting real-time update:', err);
  }
}

module.exports = {
  broadcast
};
