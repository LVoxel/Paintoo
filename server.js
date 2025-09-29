const express = require('express');
const { WebSocketServer } = require('ws');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8080;  // Render использует $PORT

// Обслуживание статических файлов (ваш index.html)
app.use(express.static(path.join(__dirname, 'public')));  // Положите index.html в папку public

// HTTP-сервер
const server = app.listen(PORT, '0.0.0.0', () => {  // Привязка к 0.0.0.0 обязательна для Render
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});

// WebSocket-сервер на том же порту
const wss = new WebSocketServer({ server });  // Прикрепляем к HTTP-серверу

wss.on('connection', (ws) => {
  console.log('Новый клиент подключен');
  ws.on('message', (message) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
  ws.on('close', () => {
    console.log('Клиент отключен');
  });
});