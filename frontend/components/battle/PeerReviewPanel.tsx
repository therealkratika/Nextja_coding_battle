"use client";

import { PlayerSubmission, PlayerSubmissions } from "./types";

interface PeerReviewPanelProps {
  players: PlayerSubmissions[];
  selectedPlayer: string | null;
  selectedSubmission: PlayerSubmission | null;
  allowed: boolean;
  loading: boolean;
  error: string | null;
  onSelectPlayer: (username: string) => void;
  onSelectSubmission: (submission: PlayerSubmission) => void;
}

export default function PeerReviewPanel({
  players,
  selectedPlayer,
  selectedSubmission,
  allowed,
  loading,
  error,
  onSelectPlayer,
  onSelectSubmission,
}: PeerReviewPanelProps) {
  if (loading) {
    return (
      <aside className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-400">
        <div className="font-semibold mb-2">Peer Review</div>
        <div>Loading peer submissions…</div>
      </aside>
    );
  }

  if (error) {
    return (
      <aside className="w-full bg-zinc-950 border border-red-600/30 rounded-lg p-4 text-sm text-rose-300">
        <div className="font-semibold mb-2">Peer Review</div>
        <div>{error}</div>
      </aside>
    );
  }

  if (!allowed) {
    return (
      <aside className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-300">
        <div className="font-semibold mb-2">Peer Review</div>
        <div>Peer code review unlocks after all players finish submitting or when the battle ends.</div>
      </aside>
    );
  }

  if (players.length === 0) {
    return (
      <aside className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-300">
        <div className="font-semibold mb-2">Peer Review</div>
        <div>No peer submissions are available yet.</div>
      </aside>
    );
  }

  const activePlayer = players.find((player) => player.username === selectedPlayer) || players[0];

  return (
    <aside className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-300">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold">Peer Review</h4>
          <p className="text-xs text-zinc-500">Select a player to view their submitted code.</p>
        </div>
        <span className="text-xs uppercase tracking-wide text-emerald-400">Available</span>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-2">
          {players.map((player) => (
            <button
              key={player.username}
              type="button"
              onClick={() => onSelectPlayer(player.username)}
              className={`w-full rounded border px-3 py-2 text-left text-sm ${
                player.username === activePlayer.username
                  ? "border-emerald-500 bg-emerald-500/10 text-white"
                  : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
              }`}
            >
              <div className="font-medium">{player.username}</div>
              <div className="text-xs text-zinc-500">{player.submissions.length} submission{player.submissions.length === 1 ? "" : "s"}</div>
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {activePlayer.submissions.map((submission) => (
              <button
                key={`${activePlayer.username}:${submission.questionId}`}
                type="button"
                onClick={() => onSelectSubmission(submission)}
                className={`rounded border px-3 py-2 text-xs ${
                  selectedSubmission?.questionId === submission.questionId
                    ? "border-emerald-500 bg-emerald-500/10 text-white"
                    : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                }`}
              >
                {submission.questionTitle}
              </button>
            ))}
          </div>

          {selectedSubmission ? (
            <div className="rounded border border-zinc-800 bg-black/80 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-wide text-zinc-500">
                <span>{selectedSubmission.questionTitle}</span>
                <span>{selectedSubmission.language}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                <div>Verdict: {selectedSubmission.verdict}</div>
                <div>Points: {selectedSubmission.points}</div>
              </div>
              <pre className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap rounded bg-zinc-950 p-3 text-xs text-zinc-100">
                {selectedSubmission.code || "No code available."}
              </pre>
            </div>
          ) : (
            <div className="rounded border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-500">
              Select a submission to see the code.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
