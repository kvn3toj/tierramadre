import { describe, it, expect } from "vitest";
import { validateNewProduct } from "../src/utils/createProduct-validate";

describe("validateNewProduct", () => {
  it("requires itemId", () => {
    const result = validateNewProduct({ itemId: "" }, new Set(["10", "20"]));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/número/i);
  });

  it("rejects duplicate itemId", () => {
    const result = validateNewProduct({ itemId: "10" }, new Set(["10", "20"]));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/ya existe/i);
  });

  it("trims itemId whitespace before checking", () => {
    const result = validateNewProduct({ itemId: "  10  " }, new Set(["10"]));
    expect(result.ok).toBe(false);
  });

  it("accepts a unique non-empty itemId", () => {
    const result = validateNewProduct(
      { itemId: "999", nombre: "Test" },
      new Set(["10", "20"]),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.itemId).toBe("999");
  });

  it("normalizes empty optional fields to undefined", () => {
    const result = validateNewProduct(
      { itemId: "1", nombre: "  ", peso: "" },
      new Set(),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.nombre).toBeUndefined();
      expect(result.value.peso).toBeUndefined();
    }
  });
});
