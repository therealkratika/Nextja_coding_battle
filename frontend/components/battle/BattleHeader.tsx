"use client";

import { BattleMeta } from "./types";
import Timer from "./Timer";

interface BattleHeaderProps {
  battleMeta: BattleMeta | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  timeLeft: number | null;
  formatTime: (seconds: number | null) => string;
}

export default function BattleHeader({
  battleMeta,
  currentQuestionIndex,
  totalQuestions,
  timeLeft,
  formatTime,
}: BattleHeaderProps) {
  return (
    <header className="w-full border-b border-zinc-800 p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            {battleMeta?.battleName ?? "Coding Battle Arena"}
          </h2>
          <p className="text-sm text-zinc-500">Live coding battle room</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 rounded bg-zinc-800 text-sm font-mono">
            {battleMeta?.roomCode ?? "UNKNOWN"}
          </span>
          <span className="px-2 py-1 rounded text-sm border border-zinc-700">
            {battleMeta?.difficulty ?? "Random"}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <div className="text-sm text-zinc-400">
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </div>
        <Timer timeLeft={timeLeft} formatTime={formatTime} />
      </div>
    </header>
  );
}
