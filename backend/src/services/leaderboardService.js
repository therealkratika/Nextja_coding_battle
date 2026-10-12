const Battle = require("../model/battle");
const Submission = require("../model/submission");
const Question = require("../model/question");
async function getFinalLeaderboard(roomCode) {
  const battle = await Battle.findOne({
    roomCode: roomCode.toUpperCase()
  }).lean();
  if (!battle) {
    throw new Error("Battle not found");
  }
  const submissions = await Submission.find({
    battleId: battle._id
  }).lean();
  const questions = await Question.find({
    _id: {
      $in: battle.questions || []
    }
  }).lean();

  // Question metadata
  const questionMap = {};
  questions.forEach(question => {
    questionMap[question._id.toString()] = {
      totalTests: question.hiddenTestCases?.length || 0,
      points: question.points || 100,
    };
  });

  // Group submissions by username
  const submissionsByUser = {};
  submissions.forEach(submission => {
    if (!submissionsByUser[submission.username]) {
      submissionsByUser[submission.username] = [];
    }
    submissionsByUser[submission.username].push(submission);
  });
  const playerUsernames = [...new Set([...(battle.players || []).map(p => p.username), ...submissions.map(s => s.username)])];
  const leaderboard = playerUsernames.map(username => {
    const userSubmissions = submissionsByUser[username] || [];
    const bestSubmissionPerQuestion = {};
    userSubmissions.forEach(submission => {
      const qid = submission.questionId.toString();
      const currentBest = bestSubmissionPerQuestion[qid];
      const submissionPassed = submission.passedCount || 0;
      const currentPassed = currentBest?.passedCount || 0;
      const submissionTime = new Date(submission.createdAt || 0).getTime();
      const currentTime = new Date(currentBest?.createdAt || 0).getTime();

      if (
        !currentBest ||
        submissionPassed > currentPassed ||
        (submissionPassed === currentPassed &&
          submissionTime > 0 &&
          (!currentTime || submissionTime < currentTime))
      ) {
        bestSubmissionPerQuestion[qid] = submission;
      }
    });
    let totalScore = 0;
    let totalPassed = 0;
    let totalPossible = 0;
    let fullSolved = 0;
    let solveTimeSum = 0;
    Object.values(bestSubmissionPerQuestion).forEach(submission => {
      const qid = submission.questionId.toString();
      const info = questionMap[qid];
      if (!info) return;
      const totalTests = Math.max(
        submission.totalTests || info.totalTests,
        1
      );
      const passed = submission.passedCount || 0;
      totalPassed += passed;
      totalPossible += totalTests;
      totalScore += Math.round(passed / totalTests * info.points);
      if (passed === totalTests) {
        fullSolved++;
        if (battle.startedAt && submission.createdAt) {
          solveTimeSum += Math.max(
            0,
            new Date(submission.createdAt).getTime() -
              new Date(battle.startedAt).getTime()
          );
        }
      }
    });
    return {
      username,
      totalPassed,
      totalPossible,
      fullSolved,
      totalScore,
      solveTimeSum
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
    await Battle.updateOne({
      _id: battle._id
    }, {
      winner: leaderboard[0].username
    });
  }
  return leaderboard;
}
module.exports = {
  getFinalLeaderboard
};