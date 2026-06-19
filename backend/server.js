const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const battleRoutes = require('./src/routes/battleRoutes')

dotenv.config();

const connectDB = require("./src/config/db");

connectDB();

const app = express();

app.use(cors());

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend running");
});
app.use("/api/battle", battleRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});