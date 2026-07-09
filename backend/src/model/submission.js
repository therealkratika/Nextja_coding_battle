const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    battleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Battle",
      required: true,
    },
    roomCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    language: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      default: "",
    },
    verdict: {
      type: String,
      enum: ["Accepted", "Wrong Answer", "Compilation Error", "Runtime Error"],
      default: "Wrong Answer",
    },
    executionTime: {
      type: Number,
      default: 0,
    },
    memoryUsed: {
      type: Number,
      default: 0,
    },
    points: {
      type: Number,
      default: 0,
    },
    stdout: {
      type: String,
      default: "",
    },
    stderr: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

submissionSchema.index({ battleId: 1, username: 1, questionId: 1 });

const Submission = mongoose.model("Submission", submissionSchema);

module.exports = Submission;
