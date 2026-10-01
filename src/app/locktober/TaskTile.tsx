import type { CSSProperties, ReactNode } from "react";
import type { SerializedTask } from "@/lib/locktober/load";
import { taskCardDetail, taskPointsText } from "@/lib/locktober/taskLabel";
import UseCount from "./UseCount";

const taskGridClass =
  "grid grid-cols-2 gap-2 @min-[24rem]:grid-cols-3 @min-[44rem]:grid-cols-6";

export function TaskGrid({ children }: { children: ReactNode }) {
  return <ul className={taskGridClass}>{children}</ul>;
}

function mix(from: [number, number, number], to: [number, number, number], t: number) {
  const blend = (start: number, end: number) => Math.round(start + (end - start) * t);
  return `rgb(${blend(from[0], to[0])}, ${blend(from[1], to[1])}, ${blend(from[2], to[2])})`;
}

function tileStyle(task: Pick<SerializedTask, "kind" | "points">): CSSProperties {
  const t = Math.min(1, Math.abs(task.points ?? 0) / 50);
  if (task.kind === "PENALTY") {
    return {
      backgroundColor: mix([255, 214, 184], [224, 140, 132], t),
      borderColor: "rgb(196, 148, 124)",
      color: "#6b3a28",
    };
  }
  return {
    backgroundColor: mix([254, 249, 195], [220, 252, 231], t),
    borderColor: mix([250, 204, 21], [34, 197, 94], t),
    color: mix([113, 63, 18], [20, 83, 45], t),
  };
}

export default function TaskTile({
  task,
  detail,
  disabled = false,
  onClick,
}: {
  task: SerializedTask;
  detail?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const points = taskPointsText(task);
  const tip = task.description?.trim().replace(/\s+/g, " ") || undefined;
  const className = `flex h-full min-h-[7.5rem] w-full flex-col items-center rounded-lg border-2 px-1.5 py-1.5 text-center shadow-sm ${
    onClick ? "transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100" : ""
  }`;
  const body = (
    <>
      <span className="flex w-full justify-end">
        <UseCount count={task.useCount} />
      </span>
      <span className="flex w-full flex-1 flex-col items-center justify-center gap-0.5">
        <span className="line-clamp-2 text-[11px] font-medium leading-tight">
          {task.title}
        </span>
        <span
          className={`font-bold leading-none tabular-nums ${
            points.length >= 4 ? "text-xl" : "text-2xl"
          }`}
        >
          {points}
        </span>
      </span>
      <span className="text-[10px] leading-tight opacity-80">
        {detail ?? taskCardDetail(task)}
      </span>
    </>
  );

  if (!onClick) {
    return (
      <div className={className} style={tileStyle(task)} title={tip}>
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={className}
      style={tileStyle(task)}
      title={tip}
    >
      {body}
    </button>
  );
}
