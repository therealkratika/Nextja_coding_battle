const Battle = require("../model/battle.js");

/**
 * Registers all Socket.io event handlers for battle room management.
 * Called once per connected socket in server.js.
 *
 * @param {import("socket.io").Socket} socket - The connected socket instance
 * @param {import("socket.io").Server} io     - The Socket.io server instance
 */
const battleSocket = (socket, io) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // ─────────────────────────────────────────────────────────────────
  // EVENT: join-room
  //
  // Fired right after the frontend calls POST /api/battle/join.
  // At this point the player is already in MongoDB (added by the HTTP
  // handler), but their socketId is still empty. This event fills it in
  // and broadcasts the refreshed player list to everyone in the room.
  //
  // Payload: { roomCode: string, username: string }
  // ─────────────────────────────────────────────────────────────────
  socket.on("join-room", async ({ roomCode, username }) => {
    try {
      // Guard: make sure we received the required fields
      if (!roomCode || !username) {
        return socket.emit("error", {
          message: "roomCode and username are required to join a room.",
        });
      }

      const normalizedCode = roomCode.trim().toUpperCase();

      const battle = await Battle.findOne({ roomCode: normalizedCode });

      if (!battle) {
        return socket.emit("error", { message: "Room not found." });
      }

      if (battle.status !== "waiting") {
        return socket.emit("error", {
          message: "Cannot join — this battle has already started or ended.",
        });
      }

      // Find this player in the players array (they were added by the HTTP handler)
      const player = battle.players.find(
        (p) => p.username.toLowerCase() === username.trim().toLowerCase()
      );

      if (!player) {
        // Edge case: someone tried to connect via socket without going through HTTP first
        return socket.emit("error", {
          message: "Player not found in room. Please join via the join form first.",
        });
      }

      // Stamp the player's current socket ID so we can identify them on disconnect
      player.socketId = socket.id;
      await battle.save();

      // Subscribe this socket to the room's channel (roomCode = channel name)
      socket.join(normalizedCode);

      // ── Tell the joining player their own lobby snapshot ──
      socket.emit("room-joined", {
        message: `Welcome to the lobby, ${username}!`,
        battle,
      });

      // ── Tell EVERYONE (including the new player) the refreshed player list ──
      io.to(normalizedCode).emit("player-list-updated", {
        players: battle.players,
        host: battle.host,
      });

      // Also broadcast a "someone joined" notification to the others
      socket.to(normalizedCode).emit("player-joined", {
        username,
        message: `${username} joined the battle!`,
      });

      console.log(`👤 ${username} joined room: ${normalizedCode} (socket: ${socket.id})`);
    } catch (error) {
      console.error("join-room error:", error.message);
      socket.emit("error", { message: "Server error while joining room." });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // EVENT: player-ready
  //
  // Fired when a player clicks the "Ready" button in the lobby.
  // Toggles their ready status, saves to DB, and broadcasts the
  // updated list. If ALL players are ready, also fires "all-players-ready".
  //
  // Payload: { roomCode: string, username: string }
  // ─────────────────────────────────────────────────────────────────
  socket.on("player-ready", async ({ roomCode, username }) => {
    try {
      if (!roomCode || !username) {
        return socket.emit("error", { message: "roomCode and username are required." });
      }

      const normalizedCode = roomCode.trim().toUpperCase();
      const battle = await Battle.findOne({ roomCode: normalizedCode });

      if (!battle) {
        return socket.emit("error", { message: "Room not found." });
      }

      if (battle.status !== "waiting") {
        return socket.emit("error", { message: "Battle has already started." });
      }

      // Find the player who clicked Ready
      const player = battle.players.find(
        (p) => p.username.toLowerCase() === username.trim().toLowerCase()
      );

      if (!player) {
        return socket.emit("error", { message: "Player not found in room." });
      }

      // Toggle: if already ready → unready, if unready → ready
      player.ready = !player.ready;
      await battle.save();

      // Broadcast the fresh player list to everyone in the room
      io.to(normalizedCode).emit("player-list-updated", {
        players: battle.players,
        host: battle.host,
      });

      console.log(
        `${player.ready ? "✅" : "⬜"} ${username} is ${player.ready ? "READY" : "NOT READY"} in room: ${normalizedCode}`
      );

      // ── Check if ALL players are ready (need at least 2) ──
      const totalPlayers = battle.players.length;
      const readyCount = battle.players.filter((p) => p.ready).length;
      const allReady = totalPlayers >= 2 && readyCount === totalPlayers;

      if (allReady) {
        // Notify the room — the host can now click "Start Battle"
        io.to(normalizedCode).emit("all-players-ready", {
          message: "All players are ready! Waiting for the host to start.",
          readyCount,
          totalPlayers,
        });
        console.log(`🟢 All ${totalPlayers} players ready in room: ${normalizedCode}`);
      }
    } catch (error) {
      console.error("player-ready error:", error.message);
      socket.emit("error", { message: "Server error while updating ready status." });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // EVENT: leave-room
  //
  // Fired when a player voluntarily clicks "Leave" in the lobby.
  // Also called internally when a socket disconnects unexpectedly.
  //
  // Payload: { roomCode: string, username: string }
  // ─────────────────────────────────────────────────────────────────
  socket.on("leave-room", async ({ roomCode, username }) => {
    try {
      if (!roomCode || !username) {
        return socket.emit("error", { message: "roomCode and username are required." });
      }

      await handlePlayerLeave({
        socket,
        io,
        roomCode: roomCode.trim().toUpperCase(),
        username: username.trim(),
        reason: "left",
      });
    } catch (error) {
      console.error("leave-room error:", error.message);
      socket.emit("error", { message: "Server error while leaving room." });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // EVENT: start-battle
  //
  // Fired when the host clicks "Start Battle".
  // Guards:
  //   - Only the host can start
  //   - At least 2 players must be present
  //   - All players must be ready
  // On success: sets status → "active" and emits "battle-started" to
  // everyone so the frontend can navigate to the battle screen.
  //
  // Payload: { roomCode: string, host: string }
  // ─────────────────────────────────────────────────────────────────
  socket.on("start-battle", async ({ roomCode, host }) => {
    try {
      if (!roomCode || !host) {
        return socket.emit("error", { message: "roomCode and host are required." });
      }

      const normalizedCode = roomCode.trim().toUpperCase();
      const battle = await Battle.findOne({ roomCode: normalizedCode });

      if (!battle) {
        return socket.emit("error", { message: "Room not found." });
      }

      // Guard 1: Only the host can trigger the start
      if (battle.host.toLowerCase() !== host.trim().toLowerCase()) {
        return socket.emit("error", {
          message: "Only the host can start the battle.",
        });
      }

      // Guard 2: Need at least 2 players
      if (battle.players.length < 2) {
        return socket.emit("error", {
          message: "Need at least 2 players to start the battle.",
        });
      }

      // Guard 3: Every player must be ready
      const notReady = battle.players.filter((p) => !p.ready);
      if (notReady.length > 0) {
        const names = notReady.map((p) => p.username).join(", ");
        return socket.emit("error", {
          message: `These players are not ready yet: ${names}`,
        });
      }

      // Guard 4: Can't start a battle that's already running
      if (battle.status !== "waiting") {
        return socket.emit("error", { message: "Battle has already started." });
      }

      // All guards passed — flip the status to active
      battle.status = "active";
      await battle.save();

      // Tell every player in the room to navigate to the battle screen
      io.to(normalizedCode).emit("battle-started", {
        message: "The battle has begun! Good luck! ⚔️",
        roomCode: normalizedCode,
        battle: {
          roomCode: normalizedCode,
          questionCount: battle.questionCount,
          timeLimit: battle.timeLimit,
          difficulty: battle.difficulty,
          battleName: battle.battleName,
        },
      });

      console.log(`⚔️  Battle STARTED in room: ${normalizedCode} (host: ${host})`);
    } catch (error) {
      console.error("start-battle error:", error.message);
      socket.emit("error", { message: "Server error while starting battle." });
    }
  });

  // ─────────────────────────────────────────────────────────────────
  // EVENT: disconnect  (built-in Socket.io event)
  //
  // Fires automatically when a socket loses its connection for any
  // reason (browser closed, network drop, page refresh, etc.).
  // We look up which room this socket belonged to and clean up.
  // ─────────────────────────────────────────────────────────────────
  socket.on("disconnect", async () => {
    try {
      // Find any battle that has a player with this socket ID
      const battle = await Battle.findOne({ "players.socketId": socket.id });

      if (battle) {
        const player = battle.players.find((p) => p.socketId === socket.id);
        if (player) {
          console.log(
            `⚠️  ${player.username} disconnected from room: ${battle.roomCode}`
          );
          await handlePlayerLeave({
            socket,
            io,
            roomCode: battle.roomCode,
            username: player.username,
            reason: "disconnected",
          });
        }
      }
    } catch (error) {
      console.error("disconnect cleanup error:", error.message);
    }

    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
};

// ─────────────────────────────────────────────────────────────────
// HELPER: handlePlayerLeave
//
// Shared logic used by both "leave-room" event and "disconnect" event.
// Removes the player from MongoDB, handles host transfer, deletes
// empty rooms, and broadcasts the updated state to remaining players.
//
// @param {object} opts
//   socket   – the socket of the player leaving
//   io       – the Socket.io server
//   roomCode – uppercased room code string
//   username – the player's username
//   reason   – "left" | "disconnected" (used in log messages)
// ─────────────────────────────────────────────────────────────────
const handlePlayerLeave = async ({ socket, io, roomCode, username, reason }) => {
  const battle = await Battle.findOne({ roomCode });
  if (!battle) return; // Room already gone — nothing to do

  // Remove this player from the array
  battle.players = battle.players.filter(
    (p) => p.username.toLowerCase() !== username.toLowerCase()
  );

  // ── If the host left, promote the next player ──
  const hostLeft = battle.host.toLowerCase() === username.toLowerCase();
  if (hostLeft && battle.players.length > 0) {
    battle.host = battle.players[0].username;

    // Tell the room who the new host is
    io.to(roomCode).emit("host-changed", {
      newHost: battle.host,
      message: `${battle.host} is now the host.`,
    });

    console.log(`👑 Host transferred to: ${battle.host} in room: ${roomCode}`);
  }

  // ── If the room is now empty, delete it entirely ──
  if (battle.players.length === 0) {
    await Battle.deleteOne({ roomCode });
    console.log(` Room ${roomCode} deleted — no players remaining.`);
    return; // Nothing left to broadcast
  }

  await battle.save();

  // Unsubscribe this socket from the room channel
  socket.leave(roomCode);

  // Tell remaining players someone left + send them the fresh list
  io.to(roomCode).emit("player-left", {
    username,
    message: `${username} has ${reason === "disconnected" ? "disconnected" : "left the lobby"}.`,
    players: battle.players,
    host: battle.host,
  });

  // Also send a full player-list-updated for lobbies that listen to that event
  io.to(roomCode).emit("player-list-updated", {
    players: battle.players,
    host: battle.host,
  });

  console.log(`👋 ${username} ${reason} from room: ${roomCode}`);
};

module.exports = battleSocket;