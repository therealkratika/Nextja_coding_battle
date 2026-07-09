export interface Player {
  username: string;
  socketId?: string;
  ready?: boolean;
  score?: number;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
}

export interface Question {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Random";
  description: string;
  examples?: string[];
  constraints?: string[];
  starterCode?: Record<string, string>;
  tags?: string[];
}

export interface BattleMeta {
  battleName: string;
  roomCode: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Random";
  totalQuestions: number;
}
