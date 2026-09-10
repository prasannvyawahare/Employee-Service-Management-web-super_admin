export function Avatar({
  name,
  color = "#6d5ae6",
  size = 40,
}: {
  name: string;
  color?: string;
  size?: number;
}) {
  const initial = name.trim() ? name.trim()[0]!.toUpperCase() : "?";
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full text-sm font-bold"
      style={{
        width: size,
        height: size,
        backgroundColor: `${color}1f`,
        color,
      }}
    >
      {initial}
    </div>
  );
}
