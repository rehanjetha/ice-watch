import { HAZARD_CONFIG } from "../lib/hazardUtils";

export default function HazardLegend() {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Hazard Legend</h3>
      <div className="space-y-2.5">
        {Object.entries(HAZARD_CONFIG).map(([key, config]) => (
          <div key={key} className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${config.dotClass} shrink-0`} />
            <div>
              <span className="text-sm font-medium">{config.label}</span>
              <p className="text-[11px] text-muted-foreground leading-tight">{config.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}