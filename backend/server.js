
const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const redis = require("./src/config/redis");
const connectDB = require("./src/config/db");

const battleRoutes = require("./src/routes/battleRoutes");
const questionRoutes = require("./src/routes/questionRoutes");
const submissionRoutes = require("./src/routes/submissionRoutes");
const battleSocket = require("./src/socket/battleSocket");
const recoverBattles = require("./src/services/recoverBattles");

const app = express();
const server = http.createServer(app);

const DEFAULT_FRONTEND_ORIGINS = [
  "http://localhost:3000",
  "https://nextja-coding-battle.vercel.app",
];
const FRONTEND_ORIGINS = (
  process.env.FRONTEND_URL || DEFAULT_FRONTEND_ORIGINS.join(",")
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map((origin) => new URL(origin).origin);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || FRONTEND_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
};

app.use(
  cors({
    ...corsOptions,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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
    ...corsOptions,
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
  battleSocket(socket, io);
});

const PORT = process.env.PORT || 5001;

async function startServer() {
  try {
    await connectDB();
    await redis.connectRedis();

    await recoverBattles(io);

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

startServer();
