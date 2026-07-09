const mongoose = require("mongoose");

const testCaseSchema = new mongoose.Schema(
  {
    input: {
      type: String,
      default: "",
    },
    expectedOutput: {
      type: String,
      default: "",
    },
    explanation: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const exampleSchema = new mongoose.Schema(
  {
    input: {
      type: String,
      default: "",
    },
    output: {
      type: String,
      default: "",
    },
    explanation: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: 3,
    },
    slug: {
      type: String,
      required: [true, "Slug is required"],
      trim: true,
      unique: true,
      lowercase: true,
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Easy",
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      minlength: 20,
    },
    examples: {
      type: [exampleSchema],
      default: [],
    },
    constraints: {
      type: [String],
      default: [],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    companies: {
      type: [String],
      default: [],
    },
    timeLimit: {
      type: Number,
      default: 2000,
    },
    memoryLimit: {
      type: Number,
      default: 256,
    },
    points: {
      type: Number,
      default: 100,
    },
    supportedLanguages: {
      type: [String],
      default: ["C++", "Java", "Python", "JavaScript"],
    },
    starterCode: {
      type: Object,
      default: {
        cpp: "",
        java: "",
        python: "",
        javascript: "",
      },
    },
    sampleTestCases: {
      type: [testCaseSchema],
      default: [],
    },
    hiddenTestCases: {
      type: [testCaseSchema],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    hints: {
      type: [String],
      default: [],
    },
    explanation: {
      type: String,
      default: "",
    },
    editorial: {
      type: String,
      default: "",
    },
    createdBy: {
      type: String,
      default: "admin",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    solvedCount: {
      type: Number,
      default: 0,
    },
    attemptedCount: {
      type: Number,
      default: 0,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

questionSchema.index({ title: "text", description: "text", tags: "text", category: "text", companies: "text" });
questionSchema.index({ difficulty: 1, category: 1, isActive: 1 });

const Question = mongoose.model("Question", questionSchema);

module.exports = Question;
