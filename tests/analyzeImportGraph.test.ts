import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("analyze-conversations import safety", () => {
  it("does not import the writer module ghl-client", () => {
    const src = readFileSync("scripts/analyze-conversations.ts", "utf8");
    expect(src).not.toMatch(/ghl-client/);
    expect(src).toMatch(/ghl-read/);
  });
});

describe("analyze-conversations output directory safety", () => {
  it("writes a self-protecting .gitignore into scripts/.analysis-runs/ (defense-in-depth even if the repo-root .gitignore entry is ever missing or reverted)", () => {
    // The output tree holds real customer transcripts + PII (Global
    // Constraint: "Output dir scripts/.analysis-runs/<ts>/ is gitignored").
    // The script must not depend solely on the repo-root .gitignore for
    // that guarantee — it must drop its own ignore-everything file inside
    // the tree it creates, so a broad `git add` can never sweep it up.
    const src = readFileSync("scripts/analyze-conversations.ts", "utf8");
    // Must be an actual writeFileSync(...) call targeting a `.gitignore`
    // path (not just a comment mentioning gitignore).
    expect(src).toMatch(/writeFileSync\(\s*`[^`]*\.gitignore[^`]*`/);
    // ...with ignore-everything content.
    expect(src).toMatch(/["'`]\*\\n["'`]/);
  });
});
