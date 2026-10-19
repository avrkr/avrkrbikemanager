import { describe, expect, it } from "vitest";
import { addDaysToDate, dateInIndia, getMaintenanceStatus } from "./maintenance";

describe("maintenance interval calculations", () => {
  it("adds calendar days across month and leap-year boundaries", () => {
    expect(addDaysToDate("2028-02-27", 2)).toBe("2028-02-29");
    expect(addDaysToDate("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("classifies date-based work as upcoming, due today, or overdue", () => {
    const today = new Date("2026-10-19T12:00:00Z");
    expect(getMaintenanceStatus({ next_due_date: "2026-10-20" }, 0, today)).toBe("upcoming");
    expect(getMaintenanceStatus({ next_due_date: "2026-10-19" }, 0, today)).toBe("due");
    expect(getMaintenanceStatus({ next_due_date: "2026-10-18" }, 0, today)).toBe("overdue");
  });

  it("uses a visible 200 km approaching threshold and detects mileage overdue", () => {
    expect(getMaintenanceStatus({ next_due_odometer: 1200 }, 1000)).toBe("due");
    expect(getMaintenanceStatus({ next_due_odometer: 1201 }, 1000)).toBe("upcoming");
    expect(getMaintenanceStatus({ next_due_odometer: 999 }, 1000)).toBe("overdue");
  });

  it("keeps completed tasks completed and formats India-local dates", () => {
    expect(getMaintenanceStatus({ status: "completed" }, 1000)).toBe("completed");
    expect(dateInIndia(new Date("2026-10-18T20:00:00Z"))).toBe("2026-10-19");
  });
});