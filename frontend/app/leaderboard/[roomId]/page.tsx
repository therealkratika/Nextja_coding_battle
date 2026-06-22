"use client";

import { useParams } from "next/navigation";

export default function LeaderboardPage() {
  const { roomId } = useParams<{ roomId: string }>();

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <p className="text-sm text-zinc-400 mb-2">Leaderboard placeholder</p>
        <h1 className="text-3xl font-semibold">Room: {roomId}</h1>
      </div>
    </main>
  );
}
