import type { Course, PlannerTask, Reward } from "../types";

export const defaultCourses: Course[] = [
  {
    name: "Advanced Mathematics",
    startTime: "08:30",
    endTime: "10:00",
    weekday: 1,
  },
  {
    name: "Robot Systems",
    startTime: "14:00",
    endTime: "15:30",
    weekday: 3,
  },
  {
    name: "Signals and Systems",
    startTime: "10:20",
    endTime: "11:50",
    weekday: 4,
  },
];

export const defaultTasks: PlannerTask[] = [
  {
    id: "task-robot-core",
    name: "Robot core calibration",
    estimatedMinutes: 90,
    priority: 1,
    completed: false,
    rewardPoints: 80,
    importance: 0.95,
    urgency: 0.82,
    category: "competition",
    pinned: true,
    deleted: false,
    createdAt: "seed",
  },
  {
    id: "task-report",
    name: "Write weekly progress brief",
    estimatedMinutes: 60,
    priority: 2,
    completed: false,
    rewardPoints: 60,
    importance: 0.85,
    urgency: 0.76,
    category: "study",
    pinned: false,
    deleted: false,
    createdAt: "seed",
  },
  {
    id: "task-review",
    name: "Review lecture notes",
    estimatedMinutes: 45,
    priority: 3,
    completed: false,
    rewardPoints: 35,
    importance: 0.58,
    urgency: 0.48,
    category: "study",
    pinned: false,
    deleted: false,
    createdAt: "seed",
  },
];

export const defaultRewards: Reward[] = [
  { name: "Favorite thing", requiredPoints: 60, icon: "Star" },
  { name: "Walk outside", requiredPoints: 40, icon: "Sparkles" },
  { name: "Watch one episode", requiredPoints: 100, icon: "Play" },
];
