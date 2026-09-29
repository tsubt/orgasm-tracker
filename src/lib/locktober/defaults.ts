import { OrgasmType } from "@prisma/client";

export const DEFAULT_TIERS: {
  label: string;
  points: number;
  orgasmType: OrgasmType | null;
  expectsLocked: boolean;
  sortOrder: number;
}[] = [
  {
    label: "Tapping release",
    points: 10,
    orgasmType: "RUINED",
    expectsLocked: true,
    sortOrder: 0,
  },
  {
    label: "Ruined (locked)",
    points: 50,
    orgasmType: "RUINED",
    expectsLocked: true,
    sortOrder: 1,
  },
  {
    label: "Full (locked)",
    points: 100,
    orgasmType: "FULL",
    expectsLocked: true,
    sortOrder: 2,
  },
  {
    label: "Full (unlocked)",
    points: 200,
    orgasmType: "FULL",
    expectsLocked: false,
    sortOrder: 3,
  },
];

export const DEFAULT_TASKS = [
  {
    title: "Cage check",
    kind: "REWARD" as const,
    points: 1,
    mode: "FIXED" as const,
    cadence: "DAILY" as const,
    maxCompletions: 1,
    maxPoints: null,
    noteRequired: false,
    sortOrder: 0,
  },
  {
    title: "Dildo play",
    kind: "REWARD" as const,
    points: 1,
    mode: "PER_MINUTE" as const,
    cadence: "DAILY" as const,
    maxCompletions: null,
    maxPoints: 15,
    noteRequired: false,
    sortOrder: 1,
  },
  {
    title: "Locked and plugged supermarket shop",
    kind: "REWARD" as const,
    points: 10,
    mode: "FIXED" as const,
    cadence: "WEEKLY" as const,
    maxCompletions: 1,
    maxPoints: null,
    noteRequired: false,
    sortOrder: 2,
  },
  {
    title: "Broke a rule",
    kind: "PENALTY" as const,
    points: null,
    mode: "ENTER_AMOUNT" as const,
    cadence: "DAILY" as const,
    maxCompletions: 1,
    maxPoints: null,
    noteRequired: true,
    sortOrder: 3,
  },
  {
    title: "Time locked",
    kind: "REWARD" as const,
    points: 1,
    mode: "TIME_LOCKED" as const,
    cadence: "DAILY" as const,
    maxCompletions: null,
    maxPoints: null,
    noteRequired: false,
    rateEvery: 1,
    rateUnit: "HOUR" as const,
    sortOrder: 4,
  },
];
