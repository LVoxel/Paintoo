const express = require('express');
const { WebSocketServer } = require('ws');
const { WebSocket } = require('ws');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.static(path.join(__dirname, 'public')));

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Новый клиент подключен');
  ws.on('message', (message) => {
    console.log('Получено сообщение от клиента:', message.toString());
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        console.log('Отправка сообщения клиенту:', message.toString());
        client.send(message);
      }
    });
  });
  ws.on('close', () => {
    console.log('Клиент отключен');
  });
});