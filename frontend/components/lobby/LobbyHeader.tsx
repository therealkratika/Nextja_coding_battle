"use client";

import { Battle } from "@/lib/api";

interface LobbyHeaderProps {
  battle: Battle;
}

export default function LobbyHeader({ battle }: LobbyHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-10">
      <div>
        <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Lobby</p>
        <h1 className="text-2xl font-semibold tracking-tight">{battle.battleName}</h1>
      </div>
      <div className="text-right">
        <p className="text-zinc-500 text-xs mb-1">Room Code</p>
        <span className="font-mono text-lg tracking-widest text-white">{battle.roomCode}</span>
      </div>
    </div>
  );
}
