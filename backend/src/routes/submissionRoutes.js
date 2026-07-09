const express = require("express");
const { submitCode } = require("../controller/submissionController.js");

const router = express.Router();

router.post("/", submitCode);

module.exports = router;
