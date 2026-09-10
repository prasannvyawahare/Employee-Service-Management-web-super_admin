import { cn } from "@/lib/cn";

export function Checkbox({
  label,
  description,
  className,
  ...props
}: {
  label: string;
  description?: string | null;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label
      className={cn(
        "flex items-start gap-2.5 py-1.5",
        props.disabled ? "cursor-not-allowed" : "cursor-pointer",
        className,
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-border-strong text-accent accent-accent disabled:opacity-50"
        {...props}
      />
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && (
          <span className="block text-xs text-ink-muted">{description}</span>
        )}
      </span>
    </label>
  );
}
