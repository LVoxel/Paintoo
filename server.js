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
  const clientId = Math.floor(Math.random() * 1000) + 1; // Генерируем уникальный ID от 1 до 1000
  console.log(`Новый клиент подключен. Client ID: ${clientId}. Всего клиентов: ${wss.clients.size}`);
  
  // Отправка истории и Client ID новому клиенту
  const filteredHistory = drawHistory.filter(item => item !== null);
  const initialMessage = {
    type: 'init',
    clientId: clientId,
    points: filteredHistory.length > 0 ? filteredHistory : []
  };
  console.log('Отправка инициализации новому клиенту:', JSON.stringify(initialMessage));
  ws.send(JSON.stringify(initialMessage));

  ws.on('message', (message) => {
    console.log('Получено сообщение от клиента. Тип:', typeof message, 'Данные:', message.toString());
    let data = message.toString();
    const parsedData = JSON.parse(data);
    if (parsedData.type === 'draw') {
      if (parsedData.points) {
        drawHistory = drawHistory.concat(parsedData.points);
      }
    } else if (parsedData.type === 'clear') {
      drawHistory = [];
    } else if (parsedData.type === 'erase') {
      const { points } = parsedData;
      if (points) {
        points.forEach(point => {
          const { x, y, size } = point;
          const eraseRadius = size / 2;
          drawHistory = drawHistory.filter(line => {
            if (line && line.startX !== undefined && line.endX !== undefined) {
              const steps = 5;
              const dx = (line.endX - line.startX) / steps;
              const dy = (line.endY - line.startY) / steps;
              let withinErase = false;
              for (let i = 0; i <= steps; i++) {
                const checkX = line.startX + dx * i;
                const checkY = line.startY + dy * i;
                const distance = Math.sqrt((checkX - x) ** 2 + (checkY - y) ** 2);
                if (distance <= eraseRadius) {
                  withinErase = true;
                  break;
                }
              }
              return !withinErase;
            }
            return true;
          });
        });
      }
    }
    broadcast(data, ws);
  });

  function broadcast(data, sender) {
    wss.clients.forEach((client) => {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        console.log(`Отправка сообщения клиенту. Активных клиентов: ${wss.clients.size}, Данные: ${data}`);
        client.send(data);
      } else if (client === sender) {
        console.log('Пропуск отправителя');
      } else {
        console.log(`Клиент не готов (readyState: ${client.readyState})`);
      }
    });
  }

  ws.on('close', () => {
    console.log(`Клиент отключен. Client ID: ${clientId}. Осталось клиентов: ${wss.clients.size}`);
  });
});