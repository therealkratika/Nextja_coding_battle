"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BackgroundGrid from "@/components/common/BackgroundGrid";
import { createBattle, storeUsername, ApiError } from "@/lib/api";

type Difficulty = "Easy" | "Medium" | "Hard" | "Random";
type QuestionCount = 1 | 3 | 5;
type TimeLimit = 15 | 30 | 45;
type MaxPlayers = 4 | 6 | 8;

export default function CreateBattleForm() {
  const router = useRouter();
  const [battleName, setBattleName] = useState("");
  const [username, setUsername] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Easy");
  const [questions, setQuestions] = useState<QuestionCount>(3);
  const [timeLimit, setTimeLimit] = useState<TimeLimit>(30);
  const [maxPlayers, setMaxPlayers] = useState<MaxPlayers>(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    if (!battleName.trim()) {
      setError("Battle name is required");
      setLoading(false);
      return;
    }

    if (!username.trim()) {
      setError("Username is required");
      setLoading(false);
      return;
    }

    if (username.trim().length < 2) {
      setError("Username must be at least 2 characters");
      setLoading(false);
      return;
    }

    if (username.trim().length > 20) {
      setError("Username cannot exceed 20 characters");
      setLoading(false);
      return;
    }

    try {
      const battle = await createBattle(
        battleName.trim(),
        username.trim(),
        difficulty,
        questions,
        timeLimit,
        maxPlayers
      );

      storeUsername(username.trim());
      router.push(`/lobby/${battle.roomCode.trim().toUpperCase()}`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.serverMessage || err.message);
      } else {
        setError("Failed to create battle. Please try again.");
      }
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-black text-gray-100 flex flex-col justify-center items-center p-6 overflow-hidden select-none">
      <BackgroundGrid />
      <div className="relative z-10 w-full max-w-xl bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-8 shadow-2xl shadow-purple-500/5 backdrop-blur-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-wider bg-gradient-to-r from-white via-zinc-400 to-zinc-600 bg-clip-text text-transparent uppercase">
            Create Battle
          </h1>
          <p className="text-sm text-zinc-500 mt-2">Configure your arena and challenge others</p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-950 border border-red-800 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-400 block">
              Your Username
            </label>
            <input
              type="text"
              required
              placeholder="Enter your username..."
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(null);
              }}
              disabled={loading}
              className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-400 block">
              Battle Name
            </label>
            <input
              type="text"
              required
              placeholder="Enter an epic battle name..."
              value={battleName}
              onChange={(e) => {
                setBattleName(e.target.value);
                setError(null);
              }}
              disabled={loading}
              className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-400 block">
              Difficulty
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(["Easy", "Medium", "Hard", "Random"] as Difficulty[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => {
                    setDifficulty(level);
                    setError(null);
                  }}
                  disabled={loading}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    difficulty === level
                      ? "bg-white text-black border-white font-bold"
                      : "bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-zinc-400 block">
                Questions
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([1, 3, 5] as QuestionCount[]).map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => {
                      setQuestions(count);
                      setError(null);
                    }}
                    disabled={loading}
                    className={`py-2.5 rounded-xl text-sm font-medium border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      questions === count
                        ? "bg-purple-600 text-white border-purple-500 font-bold shadow-lg shadow-purple-600/20"
                        : "bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-zinc-400 block">
                Time Limit <span className="text-zinc-600 text-[10px]">(mins)</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([15, 30, 45] as TimeLimit[]).map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => {
                      setTimeLimit(time);
                      setError(null);
                    }}
                    disabled={loading}
                    className={`py-2.5 rounded-xl text-sm font-medium border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      timeLimit === time
                        ? "bg-purple-600 text-white border-purple-500 font-bold shadow-lg shadow-purple-600/20"
                        : "bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-zinc-400 block">
              Max Players
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([4, 6, 8] as MaxPlayers[]).map((players) => (
                <button
                  key={players}
                  type="button"
                  onClick={() => {
                    setMaxPlayers(players);
                    setError(null);
                  }}
                  disabled={loading}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    maxPlayers === players
                      ? "bg-zinc-100 text-black border-zinc-100 font-bold"
                      : "bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white"
                  }`}
                >
                  {players} Players
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-xl shadow-purple-900/30 transition-all transform active:scale-[0.99] tracking-wider uppercase text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating battle…" : "Create Battle"}
          </button>
        </form>
      </div>
    </div>
  );
}
