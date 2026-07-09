const express = require("express");
const {
  createBattle,
  joinBattle,
  getBattle,
  getBattleQuestions,
  leaveBattle,
} = require("../controller/battleController.js");

const router = express.Router();
router.post("/create", createBattle);
router.post("/join", joinBattle);
router.get("/:roomCode/questions", getBattleQuestions);
router.get("/:roomCode/final-leaderboard", require("../controller/battleController.js").getFinalLeaderboard);
router.get("/:roomCode", getBattle);
router.post("/leave", leaveBattle);

module.exports = router