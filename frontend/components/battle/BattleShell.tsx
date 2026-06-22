"use client";

import BattleHeader from "./BattleHeader";
import QuestionPanel from "./QuestionPanel";
import EditorPanel from "./EditorPanel";
import Leaderboard from "./Leaderboard";
import { BattleMeta, LeaderboardEntry, Question } from "./types";

interface BattleShellProps {
  battleMeta: BattleMeta | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  timeLeft: number | null;
  questions: Question[];
  leaderboard: LeaderboardEntry[];
  language: string;
  code: string;
  onLanguageChange: (value: string) => void;
  onCodeChange: (value: string | undefined) => void;
  onRun: () => void;
  onSubmit: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function BattleShell({
  battleMeta,
  currentQuestionIndex,
  totalQuestions,
  timeLeft,
  questions,
  leaderboard,
  language,
  code,
  onLanguageChange,
  onCodeChange,
  onRun,
  onSubmit,
  onPrev,
  onNext,
}: BattleShellProps) {
  const currentQuestion = questions[currentQuestionIndex] ?? null;

  function formatTime(seconds: number | null) {
    if (seconds == null) return "--:--";
    const minutes = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${secs}`;
  }

  return (
    <main className="min-h-screen bg-zinc-900 text-white flex flex-col">
      <BattleHeader
        battleMeta={battleMeta}
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={totalQuestions}
        timeLeft={timeLeft}
        formatTime={formatTime}
      />

      <div className="flex-1 p-6 overflow-hidden">
        <div className="h-full flex flex-col gap-6 xl:flex-row">
          <div className="xl:w-2/5">
            <QuestionPanel question={currentQuestion} />
          </div>

          <div className="xl:w-9/20">
            <EditorPanel
              language={language}
              code={code}
              onLanguageChange={onLanguageChange}
              onCodeChange={onCodeChange}
              onRun={onRun}
              onSubmit={onSubmit}
            />
          </div>

          <div className="xl:w-3/20">
            <Leaderboard leaderboard={leaderboard} />
          </div>
        </div>
      </div>

      <footer className="w-full border-t border-zinc-800 p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:w-1/3">
          <div className="h-2 bg-zinc-800 rounded overflow-hidden">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${((currentQuestionIndex + 1) / (totalQuestions || 1)) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onPrev}
            className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-sm"
          >
            Previous Question
          </button>
          <button
            onClick={onNext}
            className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-sm"
          >
            Next Question
          </button>
        </div>
      </footer>
    </main>
  );
}
