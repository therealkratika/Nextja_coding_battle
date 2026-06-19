const express = require("express");
const {
  createBattle,
  joinBattle,
  getBattle,
  leaveBattle,
}  = require("../controller/battleController.js");

const router = express.Router();
router.post("/create", createBattle);
router.post("/join", joinBattle);
router.get("/:roomCode", getBattle);
router.post("/leave", leaveBattle);

module.exports = router