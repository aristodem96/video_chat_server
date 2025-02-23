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

let waitingUser = null;

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  if (waitingUser) {
    socket.emit("peer-connected", { peerId: waitingUser });
    io.to(waitingUser).emit("peer-connected", { peerId: socket.id });
    waitingUser = null;
  } else {
    waitingUser = socket.id;
  }

  socket.on("offer", ({ offer, recipientId }) => {
    io.to(recipientId).emit("offer", { offer, senderId: socket.id });
  });

  socket.on("answer", ({ answer, recipientId }) => {
    io.to(recipientId).emit("answer", { answer });
  });

  socket.on("ice-candidate", ({ candidate, recipientId }) => {
    io.to(recipientId).emit("ice-candidate", { candidate });
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    if (waitingUser === socket.id) waitingUser = null;
  });
});

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  const host = process.env.HOST || "localhost";
  console.log(`🚀 Server running on http://${host}:${PORT}`);
});
