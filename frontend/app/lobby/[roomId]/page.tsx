"use client";

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

import LobbyShell from "@/components/lobby/LobbyShell";
import { useLobbyRoom } from "@/components/lobby/useLobbyRoom";

export default function LobbyPage() {
  const params = useParams() as { roomId?: string };

  const router = useRouter();

  const roomId = String(params?.roomId ?? "")
    .trim()
    .toUpperCase();

  const handleBattleStarted = useCallback(
    (roomCode: string) => {
      router.push(`/battle/${roomCode}`);
    },
    [router]
  );

  const {
    battle,
    loading,
    error,
    successMessage,
    actionError,
    isSubmittingReady,
    isSubmittingStart,
    currentUsername,
    isHost,
    fetchBattle,
    handleReady,
    handleStart,
  } = useLobbyRoom(roomId, handleBattleStarted);

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-400 text-sm">
          Loading lobby…
        </div>
      </main>
    );
  }

  if (error || !battle) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">

          <p className="text-zinc-500 text-sm mb-1">
            Something went wrong
          </p>

          <p className="text-white text-lg mb-6">
            {error ?? "Room not found."}
          </p>

          <button
            onClick={() => router.push("/")}
            className="
              text-sm
              text-zinc-400
              hover:text-white
              border
              border-zinc-800
              hover:border-zinc-600
              rounded-lg
              px-5
              py-2
              transition-colors
            "
          >
            Go home
          </button>

        </div>
      </main>
    );
  }

  return (
    <LobbyShell
      battle={battle}
      currentUsername={currentUsername}
      successMessage={successMessage}
      actionError={actionError}
      isSubmittingReady={isSubmittingReady}
      isSubmittingStart={isSubmittingStart}
      isHost={isHost}
      onReady={handleReady}
      onStart={handleStart}
      onRefresh={fetchBattle}
    />
  );
}