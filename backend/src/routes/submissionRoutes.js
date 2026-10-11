const express = require("express");
const {
  submitCode
} = require("../controller/submissionController.js");
const createRateLimiter = require("../middleware/rateLimiter");

const submissionLimiter = createRateLimiter({
  windowSeconds: 60,
  maxRequests: 10,
  keyPrefix: "rate-limit:submission",
});

const router = express.Router();

router.post("/", submissionLimiter, submitCode);

module.exports = router;