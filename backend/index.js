/* 
  Purpose: Entry point to start the Cliniq-OX backend REST API service.
  Responsibility: Imports the express app configuration from server.js and starts listening on the configured port.
*/
const http = require('http');
const WebSocket = require('ws');
const app = require('./server');
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Real-time client connected via WebSocket');
  ws.send(JSON.stringify({ event: 'connected', message: 'Cliniq-OX Live Link Established' }));
  
  ws.on('close', () => {
    console.log('Real-time client disconnected');
  });
  
  ws.on('error', (err) => {
    console.error('WebSocket client error:', err);
  });
});

// Save WebSocket server instance on the express app object
app.set('wss', wss);

server.listen(PORT, () => {
  console.log(`Backend API server running on port ${PORT}`);
});
