const Question = require("../model/question.js");
const {
  createSlug,
  getQuestions: getQuestionsFromService,
  getRandomQuestions,
} = require("../services/questionService.js");

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeStarterCode(starterCode = {}) {
  return {
    cpp: starterCode.cpp || starterCode["C++"] || "",
    java: starterCode.java || starterCode.Java || "",
    python: starterCode.python || starterCode.Python || "",
    javascript: starterCode.javascript || starterCode.JavaScript || "",
  };
}

function normalizePayload(payload = {}) {
  const normalized = {
    ...payload,
    title: payload.title?.trim(),
    description: payload.description?.trim(),
    category: payload.category?.trim(),
    difficulty: payload.difficulty?.trim(),
    tags: normalizeStringArray(payload.tags),
    companies: normalizeStringArray(payload.companies),
    constraints: normalizeStringArray(payload.constraints),
    hints: normalizeStringArray(payload.hints),
    supportedLanguages: Array.isArray(payload.supportedLanguages) && payload.supportedLanguages.length
      ? payload.supportedLanguages
      : ["C++", "Java", "Python", "JavaScript"],
    starterCode: normalizeStarterCode(payload.starterCode),
    examples: Array.isArray(payload.examples)
      ? payload.examples.filter(Boolean).map((example) => ({
          input: example.input || "",
          output: example.output || example.expectedOutput || "",
          explanation: example.explanation || "",
        }))
      : [],
    sampleTestCases: Array.isArray(payload.sampleTestCases)
      ? payload.sampleTestCases.filter(Boolean).map((testCase) => ({
          input: testCase.input || "",
          expectedOutput: testCase.expectedOutput || testCase.output || "",
          explanation: testCase.explanation || "",
        }))
      : [],
    hiddenTestCases: Array.isArray(payload.hiddenTestCases)
      ? payload.hiddenTestCases.filter(Boolean).map((testCase) => ({
          input: testCase.input || "",
          expectedOutput: testCase.expectedOutput || testCase.output || "",
          explanation: testCase.explanation || "",
        }))
      : [],
  };

  if (payload.points !== undefined) normalized.points = Number(payload.points) || 100;
  if (payload.timeLimit !== undefined) normalized.timeLimit = Number(payload.timeLimit) || 2000;
  if (payload.memoryLimit !== undefined) normalized.memoryLimit = Number(payload.memoryLimit) || 256;
  if (payload.isActive !== undefined) normalized.isActive = Boolean(payload.isActive);

  return normalized;
}

const createQuestion = async (req, res) => {
  try {
    const payload = normalizePayload(req.body);

    if (!payload.title) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    if (!payload.description) {
      return res.status(400).json({ success: false, message: "Description is required" });
    }

    if (!payload.category) {
      return res.status(400).json({ success: false, message: "Category is required" });
    }

    if (!payload.difficulty || !["Easy", "Medium", "Hard"].includes(payload.difficulty)) {
      return res.status(400).json({ success: false, message: "Difficulty must be Easy, Medium, or Hard" });
    }

    if (!payload.sampleTestCases || payload.sampleTestCases.length === 0) {
      return res.status(400).json({ success: false, message: "At least one sample test case is required" });
    }

    if (!payload.hiddenTestCases || payload.hiddenTestCases.length === 0) {
      return res.status(400).json({ success: false, message: "At least one hidden test case is required" });
    }

    const starterCodeValues = Object.values(payload.starterCode || {}).filter(Boolean);
    if (starterCodeValues.length === 0) {
      return res.status(400).json({ success: false, message: "Starter code is required for at least one language" });
    }

    let slug = payload.slug || createSlug(payload.title);
    const existingQuestion = await Question.findOne({ slug }).lean();
    if (existingQuestion) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const question = await Question.create({
      ...payload,
      slug,
      createdBy: payload.createdBy || "admin",
    });

    return res.status(201).json({ success: true, data: question });
  } catch (error) {
    console.error("createQuestion error:", error);
    return res.status(500).json({ success: false, message: "Failed to create question" });
  }
};

const getQuestions = async (req, res) => {
  try {
    const result = await getQuestionsFromService(req.query);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("getQuestions error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch questions" });
  }
};

const getQuestionById = async (req, res) => {
  try {
    const question = await Question.findOne({ _id: req.params.id, isActive: true });

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
    const payload = normalizePayload(req.body);

    if (payload.title && !payload.slug) {
      payload.slug = createSlug(payload.title);
    }

    if (payload.slug) {
      const existing = await Question.findOne({ slug: payload.slug, _id: { $ne: req.params.id } }).lean();
      if (existing) {
        payload.slug = `${payload.slug}-${Date.now().toString(36)}`;
      }
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
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      {
        isActive: false,
        deletedAt: new Date(),
      },
      { new: true }
    );

    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    return res.status(200).json({ success: true, message: "Question deleted successfully" });
  } catch (error) {
    console.error("deleteQuestion error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete question" });
  }
};

const getRandomQuestionList = async (req, res) => {
  try {
    const count = Number(req.query.count || req.query.limit || 5);
    const difficulty = req.query.difficulty || "Random";
    const category = req.query.category || "";
    const questions = await getRandomQuestions(count, difficulty, category);
    return res.status(200).json({ success: true, data: questions });
  } catch (error) {
    console.error("getRandomQuestionList error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch random questions" });
  }
};

module.exports = {
  createQuestion,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  getRandomQuestionList,
};
