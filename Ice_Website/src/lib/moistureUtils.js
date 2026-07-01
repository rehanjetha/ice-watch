export function getMoistureDescriptor(moisture, moistureThreshold = 3300) {
  if (moisture === null || moisture === undefined || moisture === "") {
    return {
      label: "--",
      detail: "No moisture data",
    };
  }

  const value = Number(moisture);
  if (!Number.isFinite(value)) {
    return {
      label: "--",
      detail: "No moisture data",
    };
  }

  if (value < moistureThreshold - 350) {
    return {
      label: "High",
      detail: "Wet surface",
    };
  }

  if (value < moistureThreshold + 100) {
    return {
      label: "Medium",
      detail: "Moderately damp",
    };
  }

  return {
    label: "Low",
    detail: "Mostly dry",
  };
}

export function describeAverageMoisture(readings, moistureThreshold = 3300) {
  if (!Array.isArray(readings) || readings.length === 0) {
    return {
      label: "--",
      detail: "No live readings",
      rawAverage: null,
    };
  }

  const rawAverage = Math.round(
    readings.reduce((sum, reading) => sum + (reading.moisture ?? 0), 0) / readings.length
  );
  const descriptor = getMoistureDescriptor(rawAverage, moistureThreshold);

  return {
    ...descriptor,
    rawAverage,
  };
}
