"use client";

interface StatusBannerProps {
  variant: "success" | "error";
  children: React.ReactNode;
}

export default function StatusBanner({ variant, children }: StatusBannerProps) {
  return (
    <div
      className={`mb-6 px-4 py-3 rounded-lg border text-sm ${
        variant === "success"
          ? "bg-emerald-950 border-emerald-800 text-emerald-400"
          : "bg-red-950 border-red-800 text-red-400"
      }`}
    >
      {children}
    </div>
  );
}
