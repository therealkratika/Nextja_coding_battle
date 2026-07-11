const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const http = require("http");

const { Server } = require("socket.io");

dotenv.config();

const connectDB = require("./src/config/db");

const battleRoutes = require("./src/routes/battleRoutes");
const questionRoutes = require("./src/routes/questionRoutes");
const submissionRoutes = require("./src/routes/submissionRoutes");

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
app.use("/api/questions", questionRoutes);
app.use("/api/submission", submissionRoutes);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",

    methods: ["GET", "POST"],
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  battleSocket(socket, io);
});

const PORT = process.env.PORT || 5002;

server.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});