import { describe, expect, it } from "vitest";
import {
  DEFAULT_SENSOR_RADIUS,
  getCampusLocation,
  getDefaultRadiusForLocation,
  searchCampusLocations,
} from "./campusLocations";

describe("campus location helpers", () => {
  it("finds campus locations by label, code, and alias", () => {
    expect(getCampusLocation("Vari Hall").label).toBe("Vari Hall");
    expect(searchCampusLocations("VH")[0].label).toBe("Vari Hall");
    expect(searchCampusLocations("Bergeron Centre")[0].label).toBe(
      "Bergeron Centre for Engineering Excellence"
    );
    expect(searchCampusLocations("library").some((location) => location.label === "Scott Library")).toBe(true);
  });

  it("falls back to the default sensor radius for unknown locations", () => {
    expect(getDefaultRadiusForLocation("Vari Hall")).toBe(100);
    expect(getDefaultRadiusForLocation("Unknown Walkway")).toBe(DEFAULT_SENSOR_RADIUS);
  });
});
