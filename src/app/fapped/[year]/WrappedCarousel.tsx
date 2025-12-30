"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Orgasm } from "@prisma/client";
import { PLOT_DESCRIPTIONS } from "./plotDescriptions";
import WrappedSlide from "./WrappedSlide";
import { processYearData } from "./dataProcessing";

interface WrappedCarouselProps {
  orgasms: Orgasm[];
  year: number;
  username: string;
  joinedAt?: Date | null;
}

const AUTO_PROGRESS_DURATION = 10000; // 10 seconds per slide

export default function WrappedCarousel({
  orgasms,
  year,
  username,
  joinedAt,
}: WrappedCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const processedData = processYearData(orgasms, year);

  const totalSlides = PLOT_DESCRIPTIONS.length;

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
    setProgress(0);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
    setProgress(0);
  }, [totalSlides]);

  const goToSlide = useCallback(
    (index: number) => {
      setCurrentSlide(index);
      setProgress(0);
      setIsPaused(true);
      setTimeout(() => setIsPaused(false), 3000); // Resume after 3 seconds
    },
    []
  );

  // Handle swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
      setIsPaused(true);
      setTimeout(() => setIsPaused(false), 3000);
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Auto-progress with progress bar animation
  useEffect(() => {
    if (isPaused) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      return;
    }

    const startTime = Date.now();
    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / AUTO_PROGRESS_DURATION) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        nextSlide();
      }
    };

    progressIntervalRef.current = setInterval(updateProgress, 16); // ~60fps

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [currentSlide, isPaused, nextSlide]);

  const handleArrowClick = (direction: "left" | "right") => {
    if (direction === "left") {
      prevSlide();
    } else {
      nextSlide();
    }
    setIsPaused(true);
    // Permanently pause autoprogress after manual navigation
  };

  return (
    <div
      className="relative w-full h-screen overflow-hidden bg-[#1c1c1c]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Title */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
        <h1 className="text-3xl md:text-4xl font-bold text-[#e9e9e9] text-center whitespace-nowrap">
          {username}&apos;s {year} Fapped
        </h1>
      </div>

      {/* Progress indicators */}
      <div className="absolute top-20 md:top-16 left-1/2 -translate-x-1/2 z-50 flex gap-2">
        {PLOT_DESCRIPTIONS.map((_, index) => {
          const isCompleted = index < currentSlide;
          const isCurrent = index === currentSlide;

          return (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className="relative h-1 rounded-full transition-all duration-300 hover:opacity-80"
              style={{
                width: "32px",
                backgroundColor: isCompleted
                  ? "#e9e9e9"
                  : "rgba(233, 233, 233, 0.2)",
              }}
              aria-label={`Go to slide ${index + 1}`}
            >
              {isCurrent && (
                <motion.div
                  className="absolute top-0 left-0 h-full bg-[#e9e9e9] rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1, ease: "linear" }}
                  style={{ maxWidth: "100%" }}
                />
              )}
              {isCompleted && (
                <div className="absolute top-0 left-0 w-full h-full bg-[#e9e9e9] rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Arrow buttons */}
      <button
        onClick={() => handleArrowClick("left")}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-40 w-12 h-12 flex items-center justify-center bg-[#e9e9e9]/10 hover:bg-[#e9e9e9]/20 rounded-full transition-all"
        aria-label="Previous slide"
      >
        <svg
          className="w-6 h-6 text-[#e9e9e9]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      <button
        onClick={() => handleArrowClick("right")}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-40 w-12 h-12 flex items-center justify-center bg-[#e9e9e9]/10 hover:bg-[#e9e9e9]/20 rounded-full transition-all"
        aria-label="Next slide"
      >
        <svg
          className="w-6 h-6 text-[#e9e9e9]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      {/* Slides */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -300 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="w-full h-full"
        >
          <WrappedSlide
            plot={PLOT_DESCRIPTIONS[currentSlide]}
            orgasms={processedData.yearOrgasms}
            allOrgasms={orgasms}
            processedData={processedData}
            year={year}
            joinedAt={joinedAt}
            onTimelineHoverChange={setIsPaused}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
