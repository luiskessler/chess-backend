import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors()); // allow all origins for testing

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // allow all for dev; restrict in prod
    methods: ["GET", "POST"]
  }
});

// Socket.IO event handling
// server.ts (Node.js + Socket.IO)
const rooms: Record<string, { white?: string; black?: string }> = {};

io.on("connection", (socket) => {
  console.log("a user connected:", socket.id);

  socket.on("join", (roomId: string) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);

    // Initial room object anlegen, falls nicht vorhanden
    if (!rooms[roomId]) {
      rooms[roomId] = {};
    }

    // Optional: Sende aktuelle Farbvergabe an neuen User
    io.to(roomId).emit("color-assignment", rooms[roomId]);
  });

  socket.on("set-color", (data: { roomId: string; color: "white" | "black" }) => {
    const { roomId, color } = data;
    if (!rooms[roomId]) rooms[roomId] = {};

    // Überschreibe Farbe für diese socket.id
    rooms[roomId][color] = socket.id;

    console.log(`User ${socket.id} is now ${color} in room ${roomId}`);

    // Informiere alle in Raum über neue Farbverteilung
    io.to(roomId).emit("color-assignment", rooms[roomId]);
  });

  socket.on("move", (data: { roomId: string; move: any }) => {
    socket.to(data.roomId).emit("opponent-move", data.move);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected:", socket.id);
    // Optional: Farben bei Disconnect bereinigen
    for (const roomId in rooms) {
      const colors = rooms[roomId];
      if (colors.white === socket.id) delete colors.white;
      if (colors.black === socket.id) delete colors.black;
      io.to(roomId).emit("color-assignment", colors);
    }
  });
});


// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
