"use client";

import Link from "next/link";
import BackgroundGrid from "@/components/common/BackgroundGrid";
import Marquee from "@/components/common/Marquee";

export default function Hero() {
  return (
    <div className="relative min-h-screen bg-black overflow-hidden select-none">
      <BackgroundGrid />

      <nav className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2.5">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <rect width="11" height="11" rx="2" fill="#6366f1" />
            <rect x="15" width="11" height="11" rx="2" fill="#6366f1" opacity="0.45" />
            <rect y="15" width="11" height="11" rx="2" fill="#6366f1" opacity="0.45" />
            <rect x="15" y="15" width="11" height="11" rx="2" fill="#6366f1" />
          </svg>
          <span className="text-white font-extrabold text-lg tracking-tight">CBA</span>
        </div>

        <div className="hidden md:flex gap-8 text-sm text-white/40 font-medium">
          <a href="#" className="hover:text-white transition-colors">
            Leaderboard
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Challenges
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Community
          </a>
        </div>

        <button className="text-sm text-white/50 hover:text-white border border-white/10 hover:border-white/30 px-4 py-2 rounded-lg transition-all backdrop-blur-sm">
          Sign in
        </button>
      </nav>

      <main className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-16 pb-36">
        <h1 className="text-6xl md:text-8xl font-black leading-none tracking-tight mb-2">
          <span className="block text-white">CODING</span>
          <span
            className="block"
            style={{ WebkitTextStroke: "1.5px rgba(255,255,255,0.22)", color: "transparent" }}
          >
            BATTLE
          </span>
          <span
            className="block"
            style={{
              background: "linear-gradient(135deg, #06b6d4 0%, #38bdf8 50%, #2563eb 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            ARENA
          </span>
        </h1>

        <p className="mt-8 max-w-lg text-base md:text-lg text-white/30 leading-relaxed font-light">
          Enter a room. Face your opponent. Solve faster.
          <br />
          The best code wins — no mercy, no excuses.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row gap-4">
          <Link
            href="/create-battle"
            className="group relative w-52 py-4 rounded-xl font-bold text-white text-sm tracking-wide overflow-hidden transition-transform duration-150 hover:scale-[1.04] active:scale-[0.97] flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              boxShadow: "0 0 36px rgba(99,102,241,0.45), 0 0 0 1px rgba(99,102,241,0.25)",
            }}
          >
            <span className="flex items-center justify-center gap-2">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              Create Room
            </span>
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>

          <Link
            href="/join-battle"
            className="group w-52 py-4 rounded-xl font-bold text-sm text-white/60 hover:text-white border border-white/12 hover:border-white/35 transition-all duration-150 hover:scale-[1.04] active:scale-[0.97]"
            style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(8px)" }}
          >
            <span className="flex items-center justify-center gap-2">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Join Room
            </span>
          </Link>
        </div>

        <div className="mt-20 flex items-center gap-12">
          {[
            { val: "12K+", label: "Battles fought" },
            { val: "3.4K", label: "Active coders" },
            { val: "48", label: "Languages" },
          ].map(({ val, label }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <span className="text-2xl font-black text-white tracking-tight">{val}</span>
              <span className="text-xs text-white/25 uppercase tracking-widest">{label}</span>
            </div>
          ))}
        </div>
      </main>

      <Marquee />
    </div>
  );
}
