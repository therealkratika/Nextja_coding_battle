const Question = require("../model/question.js");

function createSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function sanitizeQuestion(question) {
  return {
    id: question._id?.toString?.() || question.id,
    title: question.title,
    slug: question.slug,
    difficulty: question.difficulty,
    description: question.description,
    category: question.category,
    examples: question.examples || [],
    constraints: question.constraints || [],
    starterCode: question.starterCode || {},
    supportedLanguages: question.supportedLanguages || [],
    tags: question.tags || [],
    companies: question.companies || [],
    sampleTestCases: question.sampleTestCases || [],
    hiddenTestCases: question.hiddenTestCases || [],
    hints: question.hints || [],
    explanation: question.explanation || "",
    editorial: question.editorial || "",
    points: question.points || 100,
    timeLimit: question.timeLimit || 2000,
    memoryLimit: question.memoryLimit || 256,
  };
}

function buildQuery(filters = {}) {
  const query = { isActive: true };

  if (filters.difficulty && filters.difficulty !== "Random") {
    query.difficulty = filters.difficulty;
  }

  if (filters.category) {
    query.category = new RegExp(`^${filters.category}$`, "i");
  }

  if (filters.company) {
    query.companies = new RegExp(filters.company, "i");
  }

  if (filters.tags) {
    const tags = Array.isArray(filters.tags) ? filters.tags : String(filters.tags).split(",");
    query.tags = { $all: tags.map((tag) => tag.trim()).filter(Boolean) };
  }

  if (filters.search || filters.keyword || filters.q) {
    const search = filters.search || filters.keyword || filters.q;
    query.$text = { $search: search };
  }

  return query;
}

function buildSort(sortBy = "newest") {
  switch (sortBy) {
    case "oldest":
      return { createdAt: 1 };
    case "difficulty":
      return { difficulty: 1, createdAt: -1 };
    case "mostSolved":
      return { solvedCount: -1, createdAt: -1 };
    case "newest":
    default:
      return { createdAt: -1 };
  }
}

async function getQuestions(filters = {}) {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
  const skip = (page - 1) * limit;
  const query = buildQuery(filters);
  const sort = buildSort(filters.sortBy || "newest");

  const [questions, total] = await Promise.all([
    Question.find(query).sort(sort).skip(skip).limit(limit).lean(),
    Question.countDocuments(query),
  ]);

  return {
    questions,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

async function getRandomQuestions(count = 5, difficulty = "Random", category = "") {
  const filter = { isActive: true };

  if (difficulty && difficulty !== "Random") {
    filter.difficulty = difficulty;
  }

  if (category) {
    filter.category = new RegExp(`^${category}$`, "i");
  }

  const questions = await Question.find(filter).lean();
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(Math.max(1, Number(count) || 5), shuffled.length));
}

async function getBattleQuestions({ difficulty = "Random", questionCount = 5, category = "" } = {}) {
  return getRandomQuestions(questionCount, difficulty, category);
}

module.exports = {
  createSlug,
  sanitizeQuestion,
  getQuestions,
  getRandomQuestions,
  getBattleQuestions,
};
