export type Severity = 1 | 2 | 3 | 4 | 5;

export type Mood = 'regulated' | 'fragile' | 'distressed' | 'shutdown' | 'agitated';

export interface ChildCheckIn {
  id: string;
  createdAt: string;
  mood: Mood;
  severity: Severity;
  sleepQuality: Severity;
  toiletingChange: boolean;
  schoolDay: boolean;
  notes?: string;
}

export interface Incident {
  id: string;
  createdAt: string;
  severity: Severity;
  durationMinutes: number;
  trigger?: string;
  behavior: string;
  intervention?: string;
  recovered: boolean;
  notes?: string;
}

export interface ParentCareLog {
  id: string;
  createdAt: string;
  brushedTeeth: boolean;
  ateMeal: boolean;
  drankWater: boolean;
  sleptEnough: boolean;
  stress: Severity;
  notes?: string;
}
