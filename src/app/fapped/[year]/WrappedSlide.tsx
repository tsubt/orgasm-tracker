"use client";

import { Orgasm } from "@prisma/client";
import { PlotDescription } from "./plotDescriptions";
import { ProcessedData } from "./dataProcessing";
import WrappedMainChart from "./WrappedMainChart";
import WrappedDailyChart from "./WrappedDailyChart";
import WrappedDelayChart from "./WrappedDelayChart";
import WrappedWeekHeatmap from "./WrappedWeekHeatmap";
import WrappedCommitHeatmap from "./WrappedCommitHeatmap";
import WrappedTimeline from "./WrappedTimeline";

interface WrappedSlideProps {
  plot: PlotDescription;
  orgasms: Orgasm[];
  processedData: ProcessedData;
  year: number;
  onTimelineHoverChange?: (isHovering: boolean) => void;
}

export default function WrappedSlide({
  plot,
  orgasms,
  processedData,
  year,
  onTimelineHoverChange,
}: WrappedSlideProps) {
  const renderChart = () => {
    switch (plot.name) {
      case "p_main":
        return <WrappedMainChart orgasms={orgasms} year={year} />;
      case "p_nday":
        return <WrappedDailyChart orgasms={orgasms} processedData={processedData} />;
      case "p_delay":
        return <WrappedDelayChart orgasms={orgasms} processedData={processedData} />;
      case "p_week":
        return <WrappedWeekHeatmap orgasms={orgasms} processedData={processedData} />;
      case "p_commit_freq":
        return <WrappedCommitHeatmap orgasms={orgasms} year={year} />;
      case "p_timeline":
        return (
          <WrappedTimeline
            orgasms={orgasms}
            onHoverChange={onTimelineHoverChange}
          />
        );
      default:
        return null;
    }
  };

  const title = plot.title.replace("{year}", year.toString());

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-[#1c1c1c]">
      <div className="max-w-4xl w-full flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-[#e9e9e9] mb-4">
            {title}
          </h1>
          <p className="text-lg md:text-xl text-[#c9c9c9] max-w-2xl mx-auto">
            {plot.description}
          </p>
        </div>

        <div className="w-full max-w-5xl">{renderChart()}</div>
      </div>
    </div>
  );
}

