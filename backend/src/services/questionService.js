const Question = require("../model/question.js");

function sanitizeQuestion(question) {
  return {
    id: question._id?.toString?.() || question.id,
    title: question.title,
    slug: question.slug,
    difficulty: question.difficulty,
    description: question.description,
    examples: question.examples || [],
    constraints: question.constraints || [],
    starterCode: question.starterCode || {},
    supportedLanguages: question.supportedLanguages || [],
    tags: question.tags || [],
  };
}

async function getRandomQuestions(count, difficulty = "Random") {
  const filter = difficulty && difficulty !== "Random" ? { difficulty } : {};
  const questions = await Question.find(filter).lean();

  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

module.exports = {
  sanitizeQuestion,
  getRandomQuestions,
};
