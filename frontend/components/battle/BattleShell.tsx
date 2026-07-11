"use client";

import BattleHeader from "./BattleHeader";
import QuestionPanel from "./QuestionPanel";
import EditorPanel from "./EditorPanel";
import Leaderboard from "./Leaderboard";
import PeerReviewPanel from "./PeerReviewPanel";
import { BattleMeta, LeaderboardEntry, PlayerSubmission, PlayerSubmissions, Question } from "./types";

interface SubmissionResultShape {
  verdict?: string;
  executionTime?: number;
  memoryUsed?: number;
  passedTests?: number;
  totalTests?: number;
  results?: Array<{
    input: string;
    expectedOutput: string;
    actualOutput: string;
    passed: boolean;
    stderr: string;
    stdout: string;
  }>;
  submission?: {
    verdict?: string;
    executionTime?: number;
    memoryUsed?: number;
    points?: number;
    stdout?: string;
    stderr?: string;
  };
}

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
  submissionResult: SubmissionResultShape | null;
  isSubmitting: boolean;
  isBattleEnded: boolean;
  battleSummary: { winner?: string; message?: string } | null;
  peerReviewPlayers: PlayerSubmissions[];
  peerReviewAllowed: boolean;
  peerReviewLoading: boolean;
  peerReviewError: string | null;
  selectedPeer: string | null;
  selectedReviewSubmission: PlayerSubmission | null;
  onSelectPeer: (username: string) => void;
  onSelectReviewSubmission: (submission: PlayerSubmission) => void;
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
  submissionResult,
  isSubmitting,
  isBattleEnded,
  battleSummary,
  peerReviewPlayers,
  peerReviewAllowed,
  peerReviewLoading,
  peerReviewError,
  selectedPeer,
  selectedReviewSubmission,
  onSelectPeer,
  onSelectReviewSubmission,
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
            <div className="flex flex-col gap-4">
              <EditorPanel
                language={language}
                code={code}
                onLanguageChange={onLanguageChange}
                onCodeChange={onCodeChange}
                onRun={onRun}
                onSubmit={onSubmit}
                isSubmitting={isSubmitting}
                isBattleEnded={isBattleEnded}
              />

              <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
                {battleSummary ? (
                  <div className="mb-3 rounded border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200">
                    <div className="font-semibold">{battleSummary.message || "Battle complete"}</div>
                    {battleSummary.winner ? <div className="mt-1">Winner: {battleSummary.winner}</div> : null}
                  </div>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Verdict</div>
                    <div className="mt-1 font-semibold text-white">{submissionResult?.verdict || "Waiting for submission"}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Execution Time</div>
                    <div className="mt-1 font-semibold text-white">{submissionResult?.executionTime ?? 0} ms</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Memory Used</div>
                    <div className="mt-1 font-semibold text-white">{submissionResult?.memoryUsed ?? 0} MB</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Tests</div>
                    <div className="mt-1 font-semibold text-white">{submissionResult?.passedTests ?? 0}/{submissionResult?.totalTests ?? 0}</div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="text-xs uppercase tracking-wide text-zinc-500">Latest Output</div>
                  <pre className="max-h-28 overflow-auto rounded bg-black/70 p-3 text-xs text-zinc-200">
                    {submissionResult?.submission?.stdout || submissionResult?.results?.[0]?.actualOutput || "No output yet"}
                  </pre>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div>
                    <h4 className="text-xs uppercase tracking-wide text-zinc-500">Compilation / Stderr</h4>
                    <pre className="max-h-40 overflow-auto rounded bg-black/80 p-3 text-xs text-rose-300">
                      {submissionResult?.submission?.stderr || "No errors"}
                    </pre>
                  </div>

                  <div>
                    <h4 className="text-xs uppercase tracking-wide text-zinc-500">Failed Test Cases</h4>
                    <div className="max-h-40 overflow-auto rounded bg-black/80 p-3 text-xs text-zinc-200">
                      {submissionResult?.results && submissionResult.results.length > 0 ? (
                        submissionResult.results
                          .filter((r) => !r.passed)
                          .map((r, i) => (
                            <div key={i} className="mb-2">
                              <div className="font-semibold">Input</div>
                              <div className="whitespace-pre-wrap">{r.input}</div>
                              <div className="font-semibold mt-1">Expected</div>
                              <div className="whitespace-pre-wrap">{r.expectedOutput}</div>
                              <div className="font-semibold mt-1">Actual</div>
                              <div className="whitespace-pre-wrap text-rose-200">{r.actualOutput}</div>
                              {r.stderr ? (
                                <div className="mt-1 text-rose-300">Error: {r.stderr}</div>
                              ) : null}
                            </div>
                          ))
                      ) : (
                        <div className="text-zinc-500">No failing test cases</div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="xl:w-3/20">
            <div className="space-y-4">
              <Leaderboard leaderboard={leaderboard} />
              <PeerReviewPanel
                players={peerReviewPlayers}
                selectedPlayer={selectedPeer}
                selectedSubmission={selectedReviewSubmission}
                allowed={peerReviewAllowed}
                loading={peerReviewLoading}
                error={peerReviewError}
                onSelectPlayer={onSelectPeer}
                onSelectSubmission={onSelectReviewSubmission}
              />
            </div>
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
          {currentQuestionIndex < (totalQuestions - 1) ? (
            <button
              onClick={onNext}
              className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-sm"
            >
              Next Question
            </button>
          ) : (
            <button
              onClick={() => (window.location.href = `/battle/${battleMeta?.roomCode}/final`)}
              className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-sm"
            >
              Exit to Final Leaderboard
            </button>
          )}
        </div>
      </footer>
    </main>
  );
}
