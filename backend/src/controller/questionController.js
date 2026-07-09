const Question = require("../model/question.js");

function createSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const createQuestion = async (req, res) => {
  try {
    const payload = req.body;
    const slug = payload.slug || createSlug(payload.title);

    const question = await Question.create({
      ...payload,
      slug,
    });

    return res.status(201).json({ success: true, data: question });
  } catch (error) {
    console.error("createQuestion error:", error);
    return res.status(500).json({ success: false, message: "Failed to create question" });
  }
};

const getQuestions = async (req, res) => {
  try {
    const questions = await Question.find({}).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: questions });
  } catch (error) {
    console.error("getQuestions error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch questions" });
  }
};

const getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    return res.status(200).json({ success: true, data: question });
  } catch (error) {
    console.error("getQuestionById error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch question" });
  }
};

const updateQuestion = async (req, res) => {
  try {
    const payload = req.body;

    if (payload.title && !payload.slug) {
      payload.slug = createSlug(payload.title);
    }

    const question = await Question.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    return res.status(200).json({ success: true, data: question });
  } catch (error) {
    console.error("updateQuestion error:", error);
    return res.status(500).json({ success: false, message: "Failed to update question" });
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);

    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    return res.status(200).json({ success: true, message: "Question deleted successfully" });
  } catch (error) {
    console.error("deleteQuestion error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete question" });
  }
};

module.exports = {
  createQuestion,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
};
