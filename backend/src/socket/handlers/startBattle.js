const { randomUUID } = require("node:crypto");

const Battle = require("../../model/battle.js");
const Question = require("../../model/question.js");
const redis = require("../../config/redis");
const {
  invalidateBattleCache,
} = require("../../services/battleCache");

const START_LOCK_TTL = 30;
const END_LOCK_TTL = 30;
const DEADLINE_TTL = 24 * 60 * 60;
const RETRY_DELAY = 5000;

function shuffleArray(items) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [
      copy[randomIndex],
      copy[index],
    ];
  }

  return copy;
}

function getBattleKeys(roomCode) {
  return {
    lock: `battle:${roomCode}:start-lock`,
    deadline: `battle:${roomCode}:deadline`,
    endLock: `battle:${roomCode}:end-lock`,
  };
}

async function releaseLock(client, key, token, errorLabel) {
  try {
    await client.eval(
      `if redis.call("GET", KEYS[1]) == ARGV[1] then
         return redis.call("DEL", KEYS[1])
       else
         return 0
       end`,
      {
        keys: [key],
        arguments: [token],
      }
    );
  } catch (error) {
    console.error(errorLabel, error?.message || error);
  }
}

module.exports = function registerStartBattle(socket, io) {
  socket.on("start-battle", async ({ roomCode, host } = {}) => {
    if (
      typeof roomCode !== "string" ||
      typeof host !== "string" ||
      !roomCode.trim() ||
      !host.trim()
    ) {
      return socket.emit("error", {
        message: "roomCode and host are required.",
      });
    }

    const normalizedCode = roomCode.trim().toUpperCase();
    const client = redis.client;
    const keys = getBattleKeys(normalizedCode);
    const lockToken = randomUUID();
    let lockAcquired = false;
    let battleStarted = false;
    let battleDeadline;

    try {
      const lockResult = await client.set(
        keys.lock,
        lockToken,
        { NX: true, EX: START_LOCK_TTL }
      );

      if (lockResult !== "OK") {
        return socket.emit("error", {
          message: "Battle is already being started. Please wait.",
        });
      }

      lockAcquired = true;

      const battle = await Battle.findOne({
        roomCode: normalizedCode,
      });

      if (!battle) {
        return socket.emit("error", {
          message: "Room not found.",
        });
      }

      if (battle.host.toLowerCase() !== host.trim().toLowerCase()) {
        return socket.emit("error", {
          message: "Only the host can start the battle.",
        });
      }

      if (battle.players.length < 2) {
        return socket.emit("error", {
          message: "Need at least 2 players to start the battle.",
        });
      }

      const notReady = battle.players.filter(
        (player) => !player.ready
      );

      if (notReady.length > 0) {
        return socket.emit("error", {
          message: `These players are not ready yet: ${notReady
            .map((player) => player.username)
            .join(", ")}`,
        });
      }

      if (battle.status !== "waiting") {
        return socket.emit("error", {
          message: "Battle has already started.",
        });
      }

      const filter = {
        isActive: true,
        ...(battle.difficulty && battle.difficulty !== "Random"
          ? { difficulty: battle.difficulty }
          : {}),
      };

      const availableQuestions = await Question.find(filter).lean();
      const questionCount = battle.questionCount || 1;

      if (availableQuestions.length < questionCount) {
        return socket.emit("error", {
          message: `Only ${availableQuestions.length} active question(s) are available for this battle. Add at least ${questionCount} matching question(s) before starting.`,
        });
      }

      const selectedQuestions = shuffleArray(
        availableQuestions
      ).slice(0, questionCount);

      const startedAt = new Date();
      battleDeadline =
        startedAt.getTime() + battle.timeLimit * 60 * 1000;

      battle.status = "active";
      battle.startedAt = startedAt;
      battle.endedAt = new Date(battleDeadline);
      battle.questions = selectedQuestions.map(
        (question) => question._id
      );
      battle.currentQuestion = 0;
      battle.winner = null;

      await battle.save();
      battleStarted = true;

      await client.set(
        keys.deadline,
        String(battleDeadline),
        { EX: DEADLINE_TTL }
      );

      try {
        await invalidateBattleCache(normalizedCode);
      } catch (cacheError) {
        console.error(
          "Start-battle cache invalidation failed:",
          cacheError?.message || cacheError
        );
      }

      io.to(normalizedCode).emit("battle-started", {
        message: "The battle has begun! Good luck! ⚔️",
        roomCode: normalizedCode,
        battle: {
          roomCode: normalizedCode,
          questionCount: battle.questionCount,
          timeLimit: battle.timeLimit,
          difficulty: battle.difficulty,
          battleName: battle.battleName,
          startedAt: battle.startedAt,
          endsAt: battle.endedAt,
        },
      });

      scheduleBattleEnd(normalizedCode, io, battleDeadline);

      console.log(
        `⚔️ Battle STARTED in room: ${normalizedCode} (host: ${host})`
      );
    } catch (error) {
      console.error(
        "start-battle error:",
        error?.message || error
      );

      if (battleStarted) {
        scheduleBattleEnd(normalizedCode, io, battleDeadline, RETRY_DELAY);
      }

      socket.emit("error", {
        message: "Server error while starting the battle.",
      });
    } finally {
      if (lockAcquired) {
        await releaseLock(
          client,
          keys.lock,
          lockToken,
          "Start-lock cleanup failed:"
        );
      }
    }
  });
};

async function finishBattle(roomCode, io, deadline) {
  const client = redis.client;
  const keys = getBattleKeys(roomCode);
  const endLockToken = randomUUID();
  let endLockAcquired = false;

  try {
    const lockResult = await client.set(
      keys.endLock,
      endLockToken,
      { NX: true, EX: END_LOCK_TTL }
    );

    if (lockResult !== "OK") {
      scheduleBattleEnd(roomCode, io, deadline, RETRY_DELAY);
      return;
    }

    endLockAcquired = true;

    let storedDeadline = await client.get(keys.deadline);
    let currentDeadline = Number(storedDeadline);

    if (!storedDeadline || !Number.isFinite(currentDeadline)) {
      const activeBattle = await Battle.findOne({
        roomCode,
        status: "active",
      });

      if (!activeBattle?.endedAt) {
        return;
      }

      currentDeadline = new Date(activeBattle.endedAt).getTime();
      if (!Number.isFinite(currentDeadline)) {
        console.error(
          `Invalid battle deadline in MongoDB for room: ${roomCode}`
        );
        return;
      }

      await client.set(
        keys.deadline,
        String(currentDeadline),
        { EX: DEADLINE_TTL }
      );
    }

    if (currentDeadline !== deadline) {
      return;
    }

    const currentBattle = await Battle.findOne({
      roomCode,
      status: "active",
    });

    if (!currentBattle) {
      await client.del(keys.deadline);
      return;
    }

    if (Date.now() < currentDeadline) {
      scheduleBattleEnd(roomCode, io, currentDeadline);
      return;
    }

    const sortedPlayers = [...currentBattle.players].sort(
      (a, b) => (b.score || 0) - (a.score || 0)
    );
    const winner = sortedPlayers[0]?.username || null;
    const completedBattle = await Battle.findOneAndUpdate(
      {
        roomCode,
        status: "active",
      },
      {
        $set: {
          status: "completed",
          endedAt: new Date(),
          winner,
        },
      },
      { new: true }
    );

    if (!completedBattle) {
      return;
    }

    try {
      await invalidateBattleCache(roomCode);
    } catch (cacheError) {
      console.error(
        "Battle-end cache invalidation failed:",
        cacheError?.message || cacheError
      );
    }

    const leaderboard = completedBattle.players
      .map((player) => ({
        username: player.username,
        score: player.score || 0,
        solvedCount: player.solvedCount || 0,
      }))
      .sort((a, b) => b.score - a.score);

    await client.del(keys.deadline);

    io.to(roomCode).emit("battle-ended", {
      message: "The battle has ended.",
      winner: completedBattle.winner,
      leaderboard,
    });

    console.log(`🏁 Battle ended in room: ${roomCode}`);
  } catch (error) {
    console.error(
      "Battle-end timer error:",
      error?.message || error
    );
    scheduleBattleEnd(roomCode, io, deadline, RETRY_DELAY);
  } finally {
    if (endLockAcquired) {
      await releaseLock(
        client,
        keys.endLock,
        endLockToken,
        "Battle-end lock cleanup failed:"
      );
    }
  }
}

function scheduleBattleEnd(roomCode, io, deadline, retryDelay) {
  const delay =
    retryDelay === undefined
      ? Math.max(0, deadline - Date.now())
      : retryDelay;

  setTimeout(() => {
    void finishBattle(roomCode, io, deadline);
  }, delay);
}

module.exports.scheduleBattleEnd = scheduleBattleEnd;
