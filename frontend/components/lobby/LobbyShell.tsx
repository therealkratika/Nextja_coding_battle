"use client";

import { Battle } from "@/lib/api";
import LobbyHeader from "./LobbyHeader";
import PlayerCard from "./PlayerCard";
import MetaTile from "./MetaTile";
import StatusBanner from "./StatusBanner";

interface LobbyShellProps {
  battle: Battle;
  currentUsername: string;
  successMessage: string | null;
  actionError: string | null;
  isSubmittingReady: boolean;
  isSubmittingStart: boolean;
  isHost: boolean;
  onReady: () => void;
  onStart: () => void;
  onRefresh: () => void;
}

export default function LobbyShell({
  battle,
  currentUsername,
  successMessage,
  actionError,
  isSubmittingReady,
  isSubmittingStart,
  isHost,
  onReady,
  onStart,
  onRefresh,
}: LobbyShellProps) {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <LobbyHeader battle={battle} />

        {successMessage && (
          <StatusBanner variant="success">{successMessage}</StatusBanner>
        )}

        {actionError && (
          <StatusBanner variant="error">{actionError}</StatusBanner>
        )}

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <MetaTile label="Difficulty">
            <span className="text-xs font-medium px-2 py-0.5 rounded border border-zinc-700">
              {battle.difficulty}
            </span>
          </MetaTile>

          <MetaTile label="Questions">
            <span className="text-white text-sm font-medium">{battle.questionCount}</span>
          </MetaTile>

          <MetaTile label="Time Limit">
            <span className="text-white text-sm font-medium">{battle.timeLimit} min</span>
          </MetaTile>

          <MetaTile label="Host">
            <span className="text-white text-sm font-medium truncate">{battle.host}</span>
          </MetaTile>
        </section>

        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-zinc-400 text-sm uppercase tracking-widest">Players</h2>
            <span className="text-zinc-600 text-xs">
              {battle.players.length} / {battle.maxPlayers}
            </span>
          </div>

          <div className="space-y-2">
            {battle.players.map((player) => (
              <PlayerCard
                key={player.username}
                player={player}
                isHost={battle.host === player.username}
                isCurrentUser={player.username === currentUsername}
              />
            ))}

            {Array.from({ length: battle.maxPlayers - battle.players.length }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border border-zinc-900 border-dashed"
              >
                <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800" />
                <span className="text-zinc-700 text-sm">Waiting for player…</span>
              </div>
            ))}
          </div>
        </section>

        <div className="border-t border-zinc-900 mb-8" />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 grid grid-cols-1 gap-3 sm:flex sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onReady}
              disabled={isSubmittingReady}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-medium border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors ${
                isSubmittingReady ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isSubmittingReady ? "Updating…" : "Ready"}
            </button>

            {isHost && (
              <button
                type="button"
                onClick={onStart}
                disabled={
                  battle.players.length < 2 ||
                  !battle.players.every((player) => player.ready) ||
                  isSubmittingStart
                }
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-medium bg-white text-black hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmittingStart ? "Starting…" : "Start Battle"}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onRefresh}
            title="Refresh lobby"
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Refresh lobby
          </button>
        </div>

        {isHost && (
          <p className="mt-4 text-zinc-600 text-xs">
            You are the host. Start the battle once all players are ready.
          </p>
        )}
      </div>
    </main>
  );
}
