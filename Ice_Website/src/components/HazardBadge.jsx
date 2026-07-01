import { getHazardConfig } from "../lib/hazardUtils";

export default function HazardBadge({ level, size = "sm" }) {
  const config = getHazardConfig(level);
  const sizeClasses = size === "lg" ? "px-3 py-1.5 text-sm" : "px-2 py-0.5 text-xs";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${config.bgClass} ${config.textClass} ${sizeClasses}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />
      {config.label}
    </span>
  );
}