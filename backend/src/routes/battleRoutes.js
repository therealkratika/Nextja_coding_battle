const express = require("express");
const {
  createBattle,
  joinBattle,
  getBattle,
  getBattleQuestions,
  leaveBattle,
  getBattleSubmissions
} = require("../controller/battleController.js");
const createRateLimiter = require("../middleware/rateLimiter");

const creationLimiter = createRateLimiter({
  windowSeconds: 60,
  maxRequests: 5,
  keyPrefix: "rate-limit:room-create",
});
const joinLimiter = createRateLimiter({
  windowSeconds: 60,
  maxRequests: 10,
  keyPrefix: "rate-limit:room-join",
});

const router = express.Router();

router.post("/create", creationLimiter, createBattle);
router.post("/join", joinLimiter, joinBattle);
router.get("/:roomCode/questions", getBattleQuestions);
router.get("/:roomCode/submissions", getBattleSubmissions);
router.get("/:roomCode/final-leaderboard", require("../controller/battleController.js").getFinalLeaderboard);
router.get("/:roomCode", getBattle);
router.post("/leave", leaveBattle);
module.exports = router;