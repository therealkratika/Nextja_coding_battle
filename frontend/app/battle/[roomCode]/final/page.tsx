"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ApiError, API_BASE_URL, getBattleSubmissions } from "@/lib/api";
import { PlayerSubmissionsResponse } from "@/lib/api";

interface FinalRow {
  username: string;
  totalPassed: number;
  totalPossible: number;
  fullSolved: number;
  totalScore: number;
  solveTimeSum: number;
}

function formatMs(ms: number) {
  const s = Math.floor(Math.max(0, ms) / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function FinalLeaderboardPage() {
  const params = useParams() as { roomCode?: string };
  const roomCode = params.roomCode ?? "";
  const [rows, setRows] = useState<FinalRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codeReview, setCodeReview] =
    useState<PlayerSubmissionsResponse | null>(null);
  const [codeReviewError, setCodeReviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomCode) return;
    fetch(`${API_BASE_URL}/api/battle/${roomCode}/final-leaderboard`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) throw new Error(data.message || "Failed");
        setRows(data.data || []);
      })
      .catch((err: Error | ApiError) => setError(err.message))
      .finally(() => setLoading(false));
    getBattleSubmissions(roomCode)
      .then(setCodeReview)
      .catch((err: Error | ApiError) => setCodeReviewError(err.message));
  }, [roomCode]);

  if (loading) return <div className="p-6">Loading final leaderboard…</div>;
  if (error) return <div className="p-6 text-rose-400">Error: {error}</div>;

  return (
    <main className="min-h-screen bg-zinc-900 text-white p-6">
      <h2 className="text-2xl font-semibold mb-4">Final Leaderboard — {roomCode}</h2>
      <div className="bg-zinc-950 border border-zinc-800 rounded p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-400 text-left">
              <th className="p-2">Rank</th>
              <th className="p-2">Player</th>
              <th className="p-2">Score</th>
              <th className="p-2">Solved (full)</th>
              <th className="p-2">Passed Tests</th>
              <th className="p-2">Time to Solve</th>
            </tr>
          </thead>
          <tbody>
            {rows && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-zinc-500">
                  No submissions yet.
                </td>
              </tr>
            ) : (
              rows?.map((r, i) => (
                <tr key={r.username} className={i === 0 ? "bg-emerald-900/20" : ""}>
                  <td className="p-2">{i + 1}</td>
                  <td className="p-2">{r.username}</td>
                  <td className="p-2">{r.totalScore}</td>
                  <td className="p-2">{r.fullSolved}</td>
                  <td className="p-2">{r.totalPassed}/{r.totalPossible}</td>
                  <td className="p-2">
                    {r.fullSolved > 0
                      ? formatMs(r.solveTimeSum)
                      : "Not solved"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <section className="mt-8 rounded border border-zinc-800 bg-zinc-950 p-4">
        <h3 className="mb-4 text-xl font-semibold">Players’ Submitted Code</h3>
        {codeReviewError ? (
          <p className="text-rose-400">{codeReviewError}</p>
        ) : !codeReview?.revealAllowed ? (
          <p className="text-zinc-400">Loading submitted code…</p>
        ) : (
          <div className="space-y-6">
            {codeReview.players.map((player) => (
              <article
                key={player.username}
                className="rounded border border-zinc-800 p-4"
              >
                <h4 className="mb-3 text-lg font-medium">{player.username}</h4>
                {player.submissions.length === 0 ? (
                  <p className="text-sm text-zinc-500">No code submitted.</p>
                ) : (
                  <div className="space-y-4">
                    {player.submissions.map((submission) => (
                      <div key={submission.questionId}>
                        <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm text-zinc-300">
                          <span>{submission.questionTitle}</span>
                          <span>
                            {submission.language} · {submission.verdict} ·{" "}
                            {submission.points} points
                          </span>
                        </div>
                        <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded bg-black p-4 text-sm text-zinc-100">
                          {submission.code || "No code available."}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
