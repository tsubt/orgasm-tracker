export default function UseCount({ count }: { count: number }) {
  const label = `Used ${count} ${count === 1 ? "time" : "times"}`;
  return (
    <span
      className="min-w-4 rounded-full bg-black/10 px-1 text-center text-[10px] font-semibold tabular-nums leading-4"
      title={label}
      aria-label={label}
    >
      {count}
    </span>
  );
}
