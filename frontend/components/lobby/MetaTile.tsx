"use client";

interface MetaTileProps {
  label: string;
  children: React.ReactNode;
}

export default function MetaTile({ label, children }: MetaTileProps) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3">
      <p className="text-zinc-500 text-xs mb-1">{label}</p>
      {children}
    </div>
  );
}
