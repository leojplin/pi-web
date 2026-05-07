import { describe, expect, it } from "vitest";
import { mergeChatHistory, type RawMessagePage } from "./chatHistoryCache";

function page(start: number, total: number, messages: string[]): RawMessagePage {
  return { start, total, messages };
}

describe("mergeChatHistory", () => {
  it("merges adjacent cached and incoming pages", () => {
    const merged = mergeChatHistory(page(2, 5, ["c", "d", "e"]), page(0, 5, ["a", "b"]));

    expect(merged).toEqual(page(0, 5, ["a", "b", "c", "d", "e"]));
  });

  it("uses incoming history when totals changed", () => {
    const incoming = page(0, 2, ["fresh-a", "fresh-b"]);

    expect(mergeChatHistory(page(0, 1, ["stale"]), incoming)).toEqual(incoming);
  });
});
