const express = require("express");
const {
  createQuestion,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  getRandomQuestionList,
} = require("../controller/questionController.js");

const router = express.Router();

router.post("/", createQuestion);
router.get("/random", getRandomQuestionList);
router.get("/", getQuestions);
router.get("/:id", getQuestionById);
router.put("/:id", updateQuestion);
router.delete("/:id", deleteQuestion);

module.exports = router;
