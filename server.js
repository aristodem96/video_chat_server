const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// Храним комнаты и пользователей
let rooms = {};  

// Генерация случайного ID для комнаты
const generateRoomId = () => Math.random().toString(36).substring(7);

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Ищем подходящую комнату для подключения
  let assignedRoom = null;
  for (const roomId in rooms) {
    if (rooms[roomId].length < 2) {
      assignedRoom = roomId;  // Если в комнате есть место, назначаем пользователя
      break;
    }
  }

  // Если подходящей комнаты нет, создаём новую
  if (!assignedRoom) {
    assignedRoom = generateRoomId();
    rooms[assignedRoom] = [];
  }

  // Добавляем пользователя в комнату
  rooms[assignedRoom].push(socket.id);
  socket.join(assignedRoom);
  console.log(`User ${socket.id} assigned to room ${assignedRoom}`);

  // Если в комнате 2 человека, начинаем соединение
  if (rooms[assignedRoom].length === 2) {
    io.to(rooms[assignedRoom][0]).emit("peer-connected", { peerId: rooms[assignedRoom][1] });
    io.to(rooms[assignedRoom][1]).emit("peer-connected", { peerId: rooms[assignedRoom][0] });
    console.log(`Room ${assignedRoom} is ready for call`);
  }

  // Обработка предложения на звонок
  socket.on("offer", ({ offer, recipientId }) => {
    io.to(recipientId).emit("offer", { offer, senderId: socket.id });
  });

  // Обработка ответа на предложение
  socket.on("answer", ({ answer, recipientId }) => {
    io.to(recipientId).emit("answer", { answer });
  });

  // Обработка ICE-кандидатов
  socket.on("ice-candidate", ({ candidate, recipientId }) => {
    io.to(recipientId).emit("ice-candidate", { candidate });
  });

  // Удаление пользователя из комнаты при отключении
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    // Убираем пользователя из комнаты
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter((id) => id !== socket.id);
      if (rooms[roomId].length === 0) {
        delete rooms[roomId];  // Удаляем пустую комнату
      }
    }
  });
});

const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || "0.0.0.0"; 

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});
