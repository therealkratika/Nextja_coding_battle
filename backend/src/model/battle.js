const mongoose = require("mongoose");

/*
 Each player inside a battle room
*/

const playerSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
    },

    socketId: {
      type: String,
      required: true,
    },

    ready: {
      type: Boolean,
      default: false,
    },

    score: {
      type: Number,
      default: 0,
    },

    solvedCount: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: false,
  }
);

/*
 Main battle schema
*/

const battleSchema = new mongoose.Schema(
  {
    battleName: {
      type: String,
      required: [true, "Battle name is required"],
      trim: true,
      maxlength: [60, "Battle name cannot exceed 60 characters"],
    },

    roomCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,

      // Example: A8KD3P
      match: [/^[A-Z0-9]{6}$/, "Room code must be 6 characters"],
    },

    difficulty: {
      type: String,

      enum: ["Easy", "Medium", "Hard", "Random"],

      default: "Random",
    },

    questionCount: {
      type: Number,

      required: true,

      min: [1, "Minimum 1 question"],

      max: [20, "Maximum 20 questions"],
    },

    // minutes
    timeLimit: {
      type: Number,

      required: true,

      min: [5, "Minimum 5 minutes"],

      max: [120, "Maximum 120 minutes"],
    },

    maxPlayers: {
      type: Number,

      required: true,

      min: [2, "Minimum 2 players"],

      max: [10, "Maximum 10 players"],
    },

    // Temporarily username
    // Later convert to User ObjectId after auth
    host: {
      type: String,

      required: true,
    },

    players: {
      type: [playerSchema],

      default: [],
    },

    status: {
      type: String,

      enum: ["waiting", "active", "completed"],

      default: "waiting",
    },

    startedAt: {
      type: Date,

      default: null,
    },

    endedAt: {
      type: Date,

      default: null,
    },
  },

  {
    timestamps: true,
  }
);

battleSchema.index({ roomCode: 1 });

const Battle = mongoose.model("Battle", battleSchema);

module.exports =  Battle;