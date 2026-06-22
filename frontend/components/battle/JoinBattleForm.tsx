"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BackgroundGrid from "@/components/common/BackgroundGrid";
import { joinBattle, storeUsername, ApiError } from "@/lib/api";

interface FormFields {
  username: string;
  roomCode: string;
}

interface FormErrors {
  username?: string;
  roomCode?: string;
  server?: string;
}

function validate(fields: FormFields): FormErrors {
  const errors: FormErrors = {};

  if (!fields.username.trim()) {
    errors.username = "Username is required.";
  } else if (fields.username.trim().length < 2) {
    errors.username = "Username must be at least 2 characters.";
  } else if (fields.username.trim().length > 20) {
    errors.username = "Username cannot exceed 20 characters.";
  }

  if (!fields.roomCode.trim()) {
    errors.roomCode = "Room code is required.";
  } else if (fields.roomCode.trim().length !== 6) {
    errors.roomCode = "Room code must be exactly 6 characters.";
  }

  return errors;
}

export default function JoinBattleForm() {
  const router = useRouter();
  const [fields, setFields] = useState<FormFields>({ username: "", roomCode: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    const normalizedValue = name === "roomCode" ? value.toUpperCase() : value;

    setFields((prev) => ({ ...prev, [name]: normalizedValue }));
    setErrors((prev) => ({ ...prev, [name]: undefined, server: undefined }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const validationErrors = validate(fields);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const normalizedRoomCode = fields.roomCode.trim().toUpperCase();
      await joinBattle(normalizedRoomCode, fields.username.trim());
      storeUsername(fields.username.trim());
      router.push(`/lobby/${normalizedRoomCode}`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrors({ server: err.serverMessage || err.message });
      } else {
        setErrors({ server: "Failed to join room. Try again." });
      }
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      <BackgroundGrid />
      <main className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm mb-8 transition-colors"
          >
            <span>←</span>
            <span>Back</span>
          </Link>

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-8">
            <div className="mb-8">
              <h1 className="text-white text-2xl font-semibold tracking-tight">Join a Battle</h1>
              <p className="text-zinc-500 text-sm mt-1">Enter your username and the room code to join.</p>
            </div>

            {errors.server && (
              <div className="mb-6 px-4 py-3 rounded-lg bg-red-950 border border-red-800 text-red-400 text-sm">
                {errors.server}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div>
                <label className="block text-zinc-400 text-sm mb-1.5" htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. Kratika"
                  value={fields.username}
                  onChange={handleChange}
                  disabled={loading}
                  className={`w-full bg-zinc-900 text-white placeholder-zinc-600 border rounded-lg px-4 py-2.5 text-sm outline-none transition-colors ${
                    errors.username ? "border-red-700 focus:border-red-500" : "border-zinc-800 focus:border-zinc-600"
                  } disabled:opacity-50`}
                />
                {errors.username && <p className="mt-1.5 text-red-500 text-xs">{errors.username}</p>}
              </div>

              <div>
                <label className="block text-zinc-400 text-sm mb-1.5" htmlFor="roomCode">
                  Room Code
                </label>
                <input
                  id="roomCode"
                  name="roomCode"
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. A7KD9P"
                  maxLength={6}
                  value={fields.roomCode}
                  onChange={handleChange}
                  disabled={loading}
                  className={`w-full bg-zinc-900 text-white placeholder-zinc-600 border rounded-lg px-4 py-2.5 text-sm outline-none font-mono tracking-widest uppercase transition-colors ${
                    errors.roomCode ? "border-red-700 focus:border-red-500" : "border-zinc-800 focus:border-zinc-600"
                  } disabled:opacity-50`}
                />
                {errors.roomCode && <p className="mt-1.5 text-red-500 text-xs">{errors.roomCode}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-white text-black font-medium rounded-lg py-2.5 text-sm hover:bg-zinc-200 active:bg-zinc-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Joining…" : "Join Battle"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
