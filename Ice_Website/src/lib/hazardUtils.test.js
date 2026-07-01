import { describe, expect, it } from "vitest";
import { calculateHazardLevel, getHazardConfig } from "./hazardUtils";

describe("calculateHazardLevel", () => {
  it("returns safe when sensor data is missing or dry", () => {
    expect(calculateHazardLevel(Number.NaN, 1200)).toBe("safe");
    expect(calculateHazardLevel(-5, Number.NaN)).toBe("safe");
    expect(calculateHazardLevel(-5, 3600)).toBe("safe");
  });

  it("separates caution, warning, and danger near freezing", () => {
    expect(calculateHazardLevel(2, 2800)).toBe("caution");
    expect(calculateHazardLevel(-1, 2800)).toBe("warning");
    expect(calculateHazardLevel(-4, 2800)).toBe("danger");
  });

  it("supports a demo freezing reference without changing raw readings", () => {
    expect(calculateHazardLevel(19, 2800, 3300, 20)).toBe("warning");
    expect(calculateHazardLevel(24, 2800, 3300, 20)).toBe("safe");
  });
});

describe("getHazardConfig", () => {
  it("falls back to the safe configuration for unknown levels", () => {
    expect(getHazardConfig("unknown").label).toBe("Safe");
    expect(getHazardConfig("danger").label).toBe("Danger");
  });
});
