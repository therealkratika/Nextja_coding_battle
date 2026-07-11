"use client";

import { LeaderboardEntry } from "./types";

interface LeaderboardProps {
  leaderboard: LeaderboardEntry[];
}

export default function Leaderboard({ leaderboard }: LeaderboardProps) {
  const isEmpty = leaderboard.length === 0;

  return (
    <aside className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 overflow-auto">
      <h4 className="text-sm text-zinc-400 mb-3">Live Leaderboard</h4>

      {isEmpty ? (
        <div className="text-zinc-500 text-sm">No scores yet. Good luck!</div>
      ) : (
        <ol className="space-y-2">
          {leaderboard.map((entry) => (
            <li key={entry.username} className="flex items-center justify-between bg-zinc-900 p-2 rounded">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium">
                  {entry.rank}
                </div>
                <div className="text-sm truncate">{entry.username}</div>
              </div>
              <div className="font-mono text-sm text-emerald-400">{entry.score}</div>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
