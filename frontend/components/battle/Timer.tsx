"use client";

interface TimerProps {
  timeLeft: number | null;
  formatTime: (seconds: number | null) => string;
}

export default function Timer({ timeLeft, formatTime }: TimerProps) {
  return (
    <div className="text-sm font-mono text-emerald-400">
      {formatTime(timeLeft)}
    </div>
  );
}
