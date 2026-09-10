import { cn } from "@/lib/cn";

const VARIANT_CLASSES = {
  error: "bg-bad-soft text-bad",
  success: "bg-good-soft text-good",
};

export function Banner({
  variant,
  children,
}: {
  variant: "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-control px-3 py-2 text-sm font-medium",
        VARIANT_CLASSES[variant],
      )}
    >
      {children}
    </div>
  );
}
