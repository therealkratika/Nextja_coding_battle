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
    isHidden: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Easy",
    },
    description: {
      type: String,
      required: true,
    },
    examples: {
      type: [String],
      default: [],
    },
    constraints: {
      type: [String],
      default: [],
    },
    starterCode: {
      type: Object,
      default: {
        "C++": "",
        Java: "",
        Python: "",
        JavaScript: "",
      },
    },
    supportedLanguages: {
      type: [String],
      default: ["C++", "Java", "Python", "JavaScript"],
    },
    sampleTestCases: {
      type: [testCaseSchema],
      default: [],
    },
    hiddenTestCases: {
      type: [testCaseSchema],
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
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

questionSchema.index({ title: "text" });
questionSchema.index({ tags: 1 });

const Question = mongoose.model("Question", questionSchema);

module.exports = Question;
