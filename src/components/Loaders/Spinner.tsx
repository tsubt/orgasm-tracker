type Props = {
  color?: string;
  size?: number;
};

export default function Spinner({ color = "white", size = 5 }: Props) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div
        className="animate-[spin_2s_linear_infinite] rounded-full"
        style={{
          height: 8 * size + "px",
          width: 8 * size + "px",
          borderColor: `${color} ${color} ${color} transparent`,
          borderWidth: size + "px",
        }}
      ></div>
    </div>
  );
}
