"use client";

import { useState } from "react";
import { PencilIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

const CHART_OPTIONS = ["Line", "Frequency", "Calendar", "Week", "Radial", "Timeline"];

interface ProfileChartEditorProps {
  currentChart: string;
  userId: string;
}

export default function ProfileChartEditor({
  currentChart,
  userId,
}: ProfileChartEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const handleChartChange = async (chartName: string) => {
    if (chartName === currentChart) {
      setIsOpen(false);
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch("/api/user/default-profile-chart", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          defaultProfileChart: chartName,
        }),
      });

      if (response.ok) {
        setIsOpen(false);
        router.refresh();
      } else {
        console.error("Failed to update default profile chart");
      }
    } catch (error) {
      console.error("Error updating default profile chart:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className="p-2 text-gray-500 dark:text-gray-400 hover:text-pink-500 dark:hover:text-pink-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50"
        title="Edit default chart"
      >
        <PencilIcon className="h-4 w-4" />
      </button>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-20">
            <div className="py-1">
              {CHART_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => handleChartChange(option)}
                  disabled={isUpdating}
                  className={`w-full text-left px-4 py-2 text-sm ${
                    currentChart === option
                      ? "bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  } disabled:opacity-50`}
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
