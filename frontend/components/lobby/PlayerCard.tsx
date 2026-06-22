"use client";

import { Player } from "@/lib/api";

interface PlayerCardProps {
  player: Player;
  isHost: boolean;
  isCurrentUser: boolean;
}

export default function PlayerCard({ player, isHost, isCurrentUser }: PlayerCardProps) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
        isCurrentUser ? "border-zinc-700 bg-zinc-900" : "border-zinc-800 bg-zinc-950"
      }`}
    >
      <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-zinc-300 font-medium flex-shrink-0">
        {player.username[0]?.toUpperCase()}
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-white text-sm truncate">{player.username}</span>
        {isHost && (
          <span className="text-zinc-500 text-xs border border-zinc-700 rounded px-1.5 py-px flex-shrink-0">host</span>
        )}
        {isCurrentUser && (
          <span className="text-zinc-600 text-xs flex-shrink-0">(you)</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className={`w-1.5 h-1.5 rounded-full ${player.ready ? "bg-emerald-500" : "bg-zinc-700"}`} />
        <span className={`text-xs ${player.ready ? "text-emerald-500" : "text-zinc-600"}`}>
          {player.ready ? "Ready" : "Not ready"}
        </span>
      </div>
    </div>
  );
}
