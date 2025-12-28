export interface PlotDescription {
  id: number;
  name: string;
  type: string;
  title: string;
  description: string;
  subtitle?: string;
}

export const PLOT_DESCRIPTIONS: PlotDescription[] = [
  {
    id: 1,
    name: "p_main",
    type: "Main Bar Chart",
    title: "Your orgasm breakdown",
    description:
      "A breakdown of your orgasms by type and category, showing your patterns across the year.",
  },
  {
    id: 2,
    name: "p_nday",
    type: "Number Per Day",
    title: "Your daily rhythm",
    description:
      "See how your activity varied day by day throughout the year, with your busiest days highlighted.",
  },
  {
    id: 3,
    name: "p_delay",
    type: "Time Between",
    title: "Your pacing patterns",
    description:
      "The intervals between your sessions reveal your unique rhythm and timing preferences.",
  },
  {
    id: 4,
    name: "p_week",
    type: "Day/Hour Heatmap",
    title: "When you were most active",
    description:
      "Discover the times of day and days of the week when you were most engaged throughout the year.",
  },
  {
    id: 5,
    name: "p_commit_freq",
    type: "Commit Frequency",
    title: "Your consistency",
    description:
      "A year-long view of your activity patterns, showing your streaks and habits across all months.",
  },
  {
    id: 6,
    name: "p_timeline",
    type: "Timeline",
    title: "Your year in moments",
    description:
      "A complete timeline of your journey through the year, colored by type and organized by category.",
  },
];

