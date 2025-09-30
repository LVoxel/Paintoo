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
let drawHistory = []; // Массив для хранения истории рисования

wss.on('connection', (ws) => {
  console.log('Новый клиент подключен. Всего клиентов:', wss.clients.size);
  // Отправка истории новому клиенту
  if (drawHistory.length > 0) {
    console.log('Отправка истории новому клиенту:', JSON.stringify({ type: 'history', lines: drawHistory }));
    ws.send(JSON.stringify({ type: 'history', lines: drawHistory }));
  }

  ws.on('message', (message) => {
    console.log('Получено сообщение от клиента. Тип:', typeof message, 'Данные:', message);
    let data;
    if (Buffer.isBuffer(message)) {
      data = message.toString();
    } else if (message instanceof Blob) {
      const reader = new FileReader();
      reader.onload = function() {
        data = reader.result.toString();
        broadcast(data);
        if (JSON.parse(data).type === 'draw') {
          drawHistory = drawHistory.concat(JSON.parse(data).lines);
        }
      };
      reader.readAsText(message);
    } else {
      data = message.toString();
      broadcast(data);
      if (JSON.parse(data).type === 'draw') {
        drawHistory = drawHistory.concat(JSON.parse(data).lines);
      }
    }
  });

  function broadcast(data) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        console.log(`Отправка сообщения клиенту. Активных клиентов: ${wss.clients.size}, Данные: ${data}`);
        client.send(data);
      } else {
        console.log(`Клиент не готов (readyState: ${client.readyState})`);
      }
    });
  }

  ws.on('close', () => {
    console.log('Клиент отключен. Осталось клиентов:', wss.clients.size);
  });
});