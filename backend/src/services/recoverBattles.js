const Battle = require("../model/battle.js");
const redis = require("../config/redis");
const {
  scheduleBattleEnd,
} = require("../socket/handlers/startBattle.js");

const DEADLINE_TTL = 24 * 60 * 60;

async function recoverBattles(io) {
  const client = redis.client;
  const activeBattles = await Battle.find({
    status: "active",
  });

  for (const battle of activeBattles) {
    const deadlineKey = `battle:${battle.roomCode}:deadline`;
    let deadline = Number(await client.get(deadlineKey));

    if (!Number.isFinite(deadline) || deadline <= 0) {
      if (!battle.endedAt) {
        console.error(
          `Cannot recover timer for active battle ${battle.roomCode}: missing end time.`
        );
        continue;
      }

      deadline = new Date(battle.endedAt).getTime();
      if (!Number.isFinite(deadline)) {
        console.error(
          `Cannot recover timer for active battle ${battle.roomCode}: invalid end time.`
        );
        continue;
      }

      await client.set(
        deadlineKey,
        String(deadline),
        { EX: DEADLINE_TTL }
      );
    }

    scheduleBattleEnd(battle.roomCode, io, deadline);
  }

  console.log(
    `Recovered ${activeBattles.length} active battle timer(s)`
  );
}

module.exports = recoverBattles;
