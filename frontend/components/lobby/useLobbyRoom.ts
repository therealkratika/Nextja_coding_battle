"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getBattle, Battle, ApiError } from "@/lib/api";

const socketUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

interface RoomJoinedPayload {
  battle?: Battle;
}

interface PlayerListUpdatedPayload {
  players: Battle["players"];
  host: string;
}

interface AllPlayersReadyPayload {
  message?: string;
}

interface BattleStartedPayload {
  battle?: Battle;
  roomCode?: string;
}

interface ErrorPayload {
  message?: string;
}

export function useLobbyRoom(roomId: string, onBattleStarted: (roomCode: string) => void) {
  const normalizedRoomId = String(roomId ?? "").trim().toUpperCase();
  const [battle, setBattle] = useState<Battle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmittingReady, setIsSubmittingReady] = useState(false);
  const [isSubmittingStart, setIsSubmittingStart] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const currentUsername =
    typeof window !== "undefined" ? sessionStorage.getItem("username") ?? "" : "";

  // Debug: surface normalized room id and current username for troubleshooting
  try {
    // eslint-disable-next-line no-console
    console.debug("useLobbyRoom init", { normalizedRoomId, currentUsername });
  } catch (e) {
    // ignore
  }

  const fetchBattle = useCallback(async () => {
    if (!normalizedRoomId) return;
    try {
      const battlePayload = await getBattle(normalizedRoomId);
      // Debug: successful fetch
      // eslint-disable-next-line no-console
      console.debug("fetchBattle success", { room: normalizedRoomId, battleId: battlePayload?._id });
      setBattle(battlePayload);
      setError(null);
    } catch (err: unknown) {
      // Debug: fetch error
      // eslint-disable-next-line no-console
      console.error("fetchBattle error", { room: normalizedRoomId, err });
      if (err instanceof ApiError) {
        setError(err.serverMessage || err.message);
      } else {
        setError("Cannot reach the server. Make sure the backend is running.");
      }
    } finally {
      setLoading(false);
    }
  }, [normalizedRoomId]);

  useEffect(() => {
    if (!normalizedRoomId) return;

    const controller = new AbortController();

    const loadBattle = async () => {
      try {
        const battlePayload = await getBattle(normalizedRoomId);
        if (controller.signal.aborted) return;
        setBattle(battlePayload);
        setError(null);
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError) {
          setError(err.serverMessage || err.message);
        } else {
          setError("Cannot reach the server. Make sure the backend is running.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadBattle();

    return () => {
      controller.abort();
    };
  }, [normalizedRoomId]);

  useEffect(() => {
    if (!normalizedRoomId || !currentUsername) {
      return;
    }

    const socket = io(socketUrl, {
      transports: ["websocket"],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      // Debug: socket connect and attempted join
      // eslint-disable-next-line no-console
      console.debug("socket connected, emitting join-room", { room: normalizedRoomId, username: currentUsername, socketId: socket.id });
      socket.emit("join-room", {
        roomCode: normalizedRoomId,
        username: currentUsername,
      });
    });

    socket.on("room-joined", ({ battle: joinedBattle }: RoomJoinedPayload) => {
      if (joinedBattle) {
        setBattle(joinedBattle);
      }
    });

    socket.on("player-list-updated", ({ players, host }: PlayerListUpdatedPayload) => {
      setBattle((current) =>
        current
          ? {
              ...current,
              players,
              host,
            }
          : current
      );
    });

    socket.on("all-players-ready", ({ message: readyMessage }: AllPlayersReadyPayload) => {
      setSuccessMessage(readyMessage ?? "All players are ready! Waiting for the host to start.");
      setActionError(null);
    });

    socket.on("battle-started", ({ battle: startedBattle, roomCode: emittedRoomCode }: BattleStartedPayload) => {
      setSuccessMessage(null);
      const targetRoomCode =
        startedBattle?.roomCode || emittedRoomCode || battle?.roomCode || normalizedRoomId;
      if (targetRoomCode) {
        onBattleStarted(targetRoomCode);
      }
    });

    socket.on("error", (payload: string | ErrorPayload) => {
      setSuccessMessage(null);
      if (typeof payload === "string") {
        setActionError(payload);
      } else if (payload && typeof payload === "object" && "message" in payload) {
        setActionError(String(payload.message));
      }
    });

    return () => {
      socket.off();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [normalizedRoomId, currentUsername, onBattleStarted, battle]);

  const handleReady = async () => {
    if (!battle || !socketRef.current) {
      setActionError("Socket is not connected yet. Please wait a moment and try again.");
      return;
    }

    setActionError(null);
    setSuccessMessage(null);
    setIsSubmittingReady(true);

    try {
      socketRef.current.emit("player-ready", {
        roomCode: battle.roomCode,
        username: currentUsername,
      });
    } catch {
      setActionError("Failed to update ready status.");
    } finally {
      setIsSubmittingReady(false);
    }
  };

  const handleStart = async () => {
    if (!battle || !socketRef.current) {
      setActionError("Socket is not connected yet. Please wait a moment and try again.");
      return;
    }

    setActionError(null);
    setSuccessMessage(null);
    setIsSubmittingStart(true);

    try {
      socketRef.current.emit("start-battle", {
        roomCode: battle.roomCode,
        host: currentUsername,
      });
    } catch {
      setActionError("Failed to start the battle.");
    } finally {
      setIsSubmittingStart(false);
    }
  };

  return {
    battle,
    loading,
    error,
    actionError,
    successMessage,
    isSubmittingReady,
    isSubmittingStart,
    currentUsername,
    isHost: battle?.host === currentUsername,
    fetchBattle,
    handleReady,
    handleStart,
  };
}
