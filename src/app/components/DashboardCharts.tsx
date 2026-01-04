"use client";

import { useEffect, useState, useMemo } from "react";
import { PencilIcon } from "@heroicons/react/24/outline";
import ChartsClient from "./charts/ChartsClient";
import { Orgasm, ChastitySession } from "@prisma/client";
import dayjs from "dayjs";

const CHART_OPTIONS = ["Line", "Frequency", "Calendar", "Week", "Radial", "Timeline"];

interface DashboardChart {
  id: string;
  userId: string;
  chartName: string;
  chartPosition: number;
}

interface DashboardChartsProps {
  orgasms: Orgasm[];
  tz: string;
  userId: string;
  chastitySessions?: ChastitySession[];
}

export default function DashboardCharts({
  orgasms,
  tz,
  userId,
  chastitySessions = [],
}: DashboardChartsProps) {
  const [charts, setCharts] = useState<DashboardChart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingChartId, setEditingChartId] = useState<string | null>(null);

  // Calculate available years from orgasms
  const availableYears = useMemo(() => {
    const validOrgasms = orgasms.filter((o) => o.timestamp !== null);
    const years = new Set<number>();
    validOrgasms.forEach((o) => {
      if (o.timestamp) {
        years.add(dayjs(o.timestamp).year());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [orgasms]);

  const currentYear = new Date().getFullYear();
  const initialYear =
    availableYears.length > 0 && availableYears.includes(currentYear)
      ? currentYear
      : availableYears.length > 0
      ? availableYears[0]
      : currentYear;

  const [selectedYear, setSelectedYear] = useState<number>(initialYear);

  useEffect(() => {
    fetchCharts();
  }, []);

  useEffect(() => {
    setSelectedYear(initialYear);
  }, [initialYear]);

  const fetchCharts = async () => {
    try {
      const response = await fetch("/api/dashboard-charts");
      if (response.ok) {
        const data = await response.json();
        setCharts(data.charts || []);
      }
    } catch (error) {
      console.error("Error fetching dashboard charts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChartUpdate = async (chartId: string, newChartName: string) => {
    try {
      const response = await fetch("/api/dashboard-charts", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: chartId,
          chartName: newChartName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCharts((prev) =>
          prev.map((chart) =>
            chart.id === chartId ? data.chart : chart
          )
        );
        setEditingChartId(null);
      } else {
        console.error("Failed to update chart");
      }
    } catch (error) {
      console.error("Error updating chart:", error);
    }
  };

  const handleAddChart = async (chartName: string) => {
    try {
      const response = await fetch("/api/dashboard-charts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chartName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCharts((prev) => [...prev, data.chart].sort((a, b) => a.chartPosition - b.chartPosition));
      } else {
        console.error("Failed to add chart");
      }
    } catch (error) {
      console.error("Error adding chart:", error);
    }
  };

  if (isLoading) {
    return <div>Loading charts...</div>;
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {availableYears.length > 0 && (
        <div className="flex items-center gap-2 justify-end">
          <label
            htmlFor="year-select"
            className="text-sm font-semibold text-gray-700 dark:text-gray-300"
          >
            Year:
          </label>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-600"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      )}
      {charts.map((chart) => (
        <div
          key={chart.id}
          className="relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4"
        >
          <div className="absolute top-4 right-4 z-50">
            <div className="relative">
              <button
                onClick={() =>
                  setEditingChartId(editingChartId === chart.id ? null : chart.id)
                }
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-pink-500 dark:hover:text-pink-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors bg-white dark:bg-gray-800 shadow-sm"
                title="Edit chart"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
              {editingChartId === chart.id && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setEditingChartId(null)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                    <div className="py-1">
                      {CHART_OPTIONS.map((option) => (
                        <button
                          key={option}
                          onClick={() => handleChartUpdate(chart.id, option)}
                          className={`w-full text-left px-4 py-2 text-sm ${
                            chart.chartName === option
                              ? "bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <ChartsClient
            orgasms={orgasms}
            period={chart.chartName}
            selectedYear={selectedYear}
            tz={tz}
            chastitySessions={chastitySessions}
          />
        </div>
      ))}
      <AddChartTile onAddChart={handleAddChart} hasCharts={charts.length > 0} />
    </div>
  );
}

function AddChartTile({
  onAddChart,
  hasCharts,
}: {
  onAddChart: (chartName: string) => void;
  hasCharts: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (hasCharts) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full py-3 text-sm text-gray-500 dark:text-gray-400 hover:text-pink-500 dark:hover:text-pink-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 transition-colors"
        >
          + Add chart
        </button>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-20">
              <div className="py-1">
                {CHART_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      onAddChart(option);
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 p-8 min-h-[300px] flex items-center justify-center">
      <div className="text-center">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-6 py-3 bg-pink-500 dark:bg-pink-600 text-white rounded-md shadow hover:bg-pink-600 dark:hover:bg-pink-700 transition-colors text-sm font-semibold uppercase tracking-wide"
        >
          Add chart
        </button>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute left-1/2 transform -translate-x-1/2 mt-4 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-20">
              <div className="py-1">
                {CHART_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      onAddChart(option);
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
