import { describe, expect, it } from "vitest";
import { describeAverageMoisture, getMoistureDescriptor } from "./moistureUtils";

describe("getMoistureDescriptor", () => {
  it("labels raw analog moisture readings for UI display", () => {
    expect(getMoistureDescriptor(null)).toEqual({
      label: "--",
      detail: "No moisture data",
    });
    expect(getMoistureDescriptor(2600).label).toBe("High");
    expect(getMoistureDescriptor(3200).label).toBe("Medium");
    expect(getMoistureDescriptor(3600).label).toBe("Low");
  });
});

describe("describeAverageMoisture", () => {
  it("averages readings before applying the descriptor", () => {
    const result = describeAverageMoisture([{ moisture: 3000 }, { moisture: 3400 }]);

    expect(result.rawAverage).toBe(3200);
    expect(result.label).toBe("Medium");
  });

  it("handles an empty reading list", () => {
    expect(describeAverageMoisture([])).toEqual({
      label: "--",
      detail: "No live readings",
      rawAverage: null,
    });
  });
});
