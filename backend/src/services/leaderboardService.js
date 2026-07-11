const Battle = require("../model/battle");
const Submission = require("../model/submission");
const Question = require("../model/question");

async function getFinalLeaderboard(roomCode) {
  const battle = await Battle.findOne({
    roomCode: roomCode.toUpperCase(),
  }).lean();

  if (!battle) {
    throw new Error("Battle not found");
  }

  const submissions = await Submission.find({
    battleId: battle._id,
  }).lean();

  const questions = await Question.find({
    _id: { $in: battle.questions || [] },
  }).lean();

  // Question metadata
  const questionMap = {};

  questions.forEach((question) => {
    questionMap[question._id.toString()] = {
      totalTests:
        (question.sampleTestCases?.length || 0) +
        (question.hiddenTestCases?.length || 0),
      difficulty: question.difficulty,
    };
  });

  // Group submissions by username
  const submissionsByUser = {};

  submissions.forEach((submission) => {
    if (!submissionsByUser[submission.username]) {
      submissionsByUser[submission.username] = [];
    }

    submissionsByUser[submission.username].push(submission);
  });

  /**
   * IMPORTANT
   *
   * Do NOT use battle.players.
   * battle.players changes when users disconnect.
   *
   * Build the leaderboard from everyone who participated.
   */

  const playerUsernames = [
    ...new Set([
      ...(battle.players || []).map((p) => p.username),
      ...submissions.map((s) => s.username),
    ]),
  ];

  const leaderboard = playerUsernames.map((username) => {
    const userSubmissions = submissionsByUser[username] || [];

    const bestSubmissionPerQuestion = {};

    userSubmissions.forEach((submission) => {
      const qid = submission.questionId.toString();

      if (
        !bestSubmissionPerQuestion[qid] ||
        (submission.passedCount || 0) >
          (bestSubmissionPerQuestion[qid].passedCount || 0)
      ) {
        bestSubmissionPerQuestion[qid] = submission;
      }
    });

    let totalScore = 0;
    let totalPassed = 0;
    let totalPossible = 0;
    let fullSolved = 0;
    let solveTimeSum = 0;

    Object.values(bestSubmissionPerQuestion).forEach((submission) => {
      const qid = submission.questionId.toString();

      const info = questionMap[qid];

      if (!info) return;

      const totalTests = Math.max(info.totalTests, 1);

      const passed = submission.passedCount || 0;

      totalPassed += passed;
      totalPossible += totalTests;

      let maxPoints = 100;

      if (info.difficulty === "Medium") {
        maxPoints = 200;
      }

      if (info.difficulty === "Hard") {
        maxPoints = 300;
      }

      totalScore += Math.round((passed / totalTests) * maxPoints);

      if (passed === totalTests) {
        fullSolved++;

        if (battle.startedAt && submission.createdAt) {
          solveTimeSum +=
            new Date(submission.createdAt).getTime() -
            new Date(battle.startedAt).getTime();
        }
      }
    });

    return {
      username,
      totalPassed,
      totalPossible,
      fullSolved,
      totalScore,
      solveTimeSum,
    };
  });

  leaderboard.sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }

    return a.solveTimeSum - b.solveTimeSum;
  });

  leaderboard.forEach((player, index) => {
    player.rank = index + 1;
  });

  if (leaderboard.length > 0) {
    await Battle.updateOne(
      { _id: battle._id },
      {
        winner: leaderboard[0].username,
      }
    );
  }

  return leaderboard;
}

module.exports = {
  getFinalLeaderboard,
};