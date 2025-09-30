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
    console.log('Получено сообщение от клиента. Тип:', typeof message, 'Данные:', message.toString());
    let data = message.toString(); // Всегда преобразуем в строку
    const parsedData = JSON.parse(data);
    if (parsedData.type === 'draw') {
      drawHistory = drawHistory.concat(parsedData.points);
    } else if (parsedData.type === 'clear') {
      drawHistory = []; // Очистка истории при clear
    } else if (parsedData.type === 'erase') {
      const { points } = parsedData;
      points.forEach(point => {
        const { x, y, size } = point;
        // Удаляем линии, чьи центры попадают в область стирания
        drawHistory = drawHistory.filter(line => {
          const midX = (line.startX + line.endX) / 2;
          const midY = (line.startY + line.endY) / 2;
          const distance = Math.sqrt((midX - x) ** 2 + (midY - y) ** 2);
          return distance > size / 2;
        });
      });
    }
    broadcast(data, ws); // Передаём отправителя, чтобы не отправлять ему обратно
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
    console.log('Клиент отключен. Осталось клиентов:', wss.clients.size);
  });
});