/**
 * Calculate ice/snow hazard level based on temperature and ground moisture.
 * Moisture notes:
 *   - moisture is an analog reading (0-4095), lower = wetter
 *   - moistureThreshold default is 3300
 */
export const DEMO_FREEZING_REFERENCE_TEMPERATURE_C = 20;

export function calculateHazardLevel(
  temperature,
  moisture,
  moistureThreshold = 3300,
  freezingReferenceTemperature = 0
) {
  if (!Number.isFinite(temperature) || !Number.isFinite(moisture)) {
    return "safe";
  }

  const isWet = moisture < (moistureThreshold - 50);
  const calibratedTemperature = temperature - freezingReferenceTemperature;

  if (!isWet || calibratedTemperature > 3) return "safe";
  if (calibratedTemperature > 0) return "caution";
  if (calibratedTemperature > -2) return "warning";
  return "danger";
}

export const HAZARD_CONFIG = {
  safe: {
    label: "Safe",
    color: "green-500",
    bgClass: "bg-green-500/20",
    textClass: "text-green-500",
    borderClass: "border-green-500",
    dotClass: "bg-green-500",
    mapColor: "#22c55e",
    mapOpacity: 0.15,
    description: "No ice or snow risk detected"
  },
  caution: {
    label: "Caution",
    color: "yellow-500",
    bgClass: "bg-yellow-500/20",
    textClass: "text-yellow-500",
    borderClass: "border-yellow-500",
    dotClass: "bg-yellow-500",
    mapColor: "#eab308",
    mapOpacity: 0.25,
    description: "Possible frost or light ice formation"
  },
  warning: {
    label: "Warning",
    color: "orange-500",
    bgClass: "bg-orange-500/20",
    textClass: "text-orange-500",
    borderClass: "border-orange-500",
    dotClass: "bg-orange-500",
    mapColor: "#f97316",
    mapOpacity: 0.35,
    description: "Ice likely — walk with caution"
  },
  danger: {
    label: "Danger",
    color: "red-500",
    bgClass: "bg-red-500/20",
    textClass: "text-red-500",
    borderClass: "border-red-500",
    dotClass: "bg-red-500",
    mapColor: "#ef4444",
    mapOpacity: 0.45,
    description: "Severe ice/snow — avoid if possible"
  }
};

export function getHazardConfig(level) {
  return HAZARD_CONFIG[level] || HAZARD_CONFIG.safe;
}
