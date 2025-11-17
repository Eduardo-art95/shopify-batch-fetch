import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn utility function", () => {
  it("should merge class names correctly", () => {
    const result = cn("px-2", "py-1");
    expect(result).toBe("px-2 py-1");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    const result = cn("base-class", isActive && "active-class");
    expect(result).toBe("base-class active-class");
  });

  it("should remove falsy values", () => {
    const result = cn("base", false, null, undefined, "final");
    expect(result).toBe("base final");
  });

  it("should merge Tailwind classes and resolve conflicts", () => {
    const result = cn("px-2 py-1", "px-4");
    expect(result).toBe("py-1 px-4");
  });

  it("should handle empty inputs", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("should handle array of classes", () => {
    const result = cn(["px-2", "py-1"]);
    expect(result).toBe("px-2 py-1");
  });
});
