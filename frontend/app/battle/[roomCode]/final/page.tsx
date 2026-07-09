"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ApiError } from "@/lib/api";

interface FinalRow {
  username: string;
  totalPassed: number;
  totalPossible: number;
  fullSolved: number;
  totalScore: number;
  solveTimeSum: number;
}

function formatMs(ms: number) {
  if (!ms) return "--:--";
  const s = Math.floor(ms / 1000);
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

  useEffect(() => {
    if (!roomCode) return;
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"}/api/battle/${roomCode}/final-leaderboard`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) throw new Error(data.message || "Failed");
        setRows(data.data || []);
      })
      .catch((err: Error | ApiError) => setError(err.message))
      .finally(() => setLoading(false));
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
                  <td className="p-2">{formatMs(r.solveTimeSum)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
