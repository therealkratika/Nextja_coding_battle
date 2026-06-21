const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const http = require("http");

const { Server } = require("socket.io");

dotenv.config();

const connectDB = require("./src/config/db");

const battleRoutes = require("./src/routes/battleRoutes");

const battleSocket = require("./src/socket/battleSocket");

connectDB();

const app = express();

const server = http.createServer(app);

app.use(
  cors({
    origin: "http://localhost:3000",

    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "OPTIONS",
    ],

    credentials: true,
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend running");
});

app.use("/api/battle", battleRoutes);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",

    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  battleSocket(socket, io);
});

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});