import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseBangs } from "./utils.js";

const sharedBangCases = [
  ["single bang at start", "!google foo", "!", { bangNames: ["google"], query: "foo" }],
  ["single bang at end", "foo !google", "!", { bangNames: ["google"], query: "foo" }],
  [
    "middle bang is treated as query text when a leading bang exists",
    "!google foo !amazon bar",
    "!",
    { bangNames: ["google"], query: "foo !amazon bar" },
  ],
  [
    "middle bang is treated as query text when a trailing bang exists",
    "foo !google bar !amazon",
    "!",
    { bangNames: ["amazon"], query: "foo !google bar" },
  ],
  ["middle bang alone is treated as query text", "foo !google bar", "!", null],
  [
    "single bang at start and end — leading wins, trailing stays in query",
    "!google foo bar !amazon",
    "!",
    { bangNames: ["google"], query: "foo bar !amazon" },
  ],
  [
    "concatenated bangs stay as one name",
    "!g!a",
    "!",
    { bangNames: ["g!a"], query: "" },
  ],
  ["no bangs returns null", "foo bar", "!", null],
  ["empty search query returns null", "", "!", null],
  ["bare bang symbol returns null", "!", "!", null],
  ["empty bang name at start returns null", "! foo", "!", null],
  ["empty bang name at end returns null", "foo !", "!", null],
  ["trailing space defeats end bang", "foo !bar ", "!", null],
  ["leading space defeats leading bang", " !bar foo", "!", null],
  [
    "custom symbol bang at start",
    "acea foo",
    "ace",
    { bangNames: ["a"], query: "foo" },
  ],
  [
    "custom symbol bang at end",
    "foo aces",
    "ace",
    { bangNames: ["s"], query: "foo" },
  ],
  [
    "custom symbol — first wins over last",
    "acer computer acea",
    "ace",
    { bangNames: ["r"], query: "computer acea" },
  ],
];

describe("parseBangs", () => {
  describe("both modes", () => {
    for (const multiBang of [true, false]) {
      describe(multiBang ? "multi-bang mode" : "single-bang mode", () => {
        for (const [title, input, symbol, expected] of sharedBangCases) {
          it(title, () => {
            assert.deepStrictEqual(
              parseBangs(input, symbol, multiBang),
              expected,
            );
          });
        }
      });
    }
  });

  describe("multi-bang mode only", () => {
    const multiBang = true;
    const symbol = "!";

    it("multiple bangs at start", () => {
      assert.deepStrictEqual(
        parseBangs("!google !amazon foo bar", symbol, multiBang),
        { bangNames: ["google", "amazon"], query: "foo bar" },
      );
    });

    it("multiple bangs at end", () => {
      assert.deepStrictEqual(
        parseBangs("foo bar !google !amazon", symbol, multiBang),
        { bangNames: ["google", "amazon"], query: "foo bar" },
      );
    });

    it("bangs at both ends — leading wins, trailing stays in query", () => {
      assert.deepStrictEqual(
        parseBangs("!gm !osm Paris !m", symbol, multiBang),
        { bangNames: ["gm", "osm"], query: "Paris !m" },
      );
    });

    it("non-existent trailing bang stays in query", () => {
      assert.deepStrictEqual(
        parseBangs("!gm Paris !upss", symbol, multiBang),
        { bangNames: ["gm"], query: "Paris !upss" },
      );
    });

    it("end-only bangs still work when no leading bang", () => {
      assert.deepStrictEqual(
        parseBangs("test !a !g", symbol, multiBang),
        { bangNames: ["a", "g"], query: "test" },
      );
    });

    it("only bangs, no query", () => {
      assert.deepStrictEqual(
        parseBangs("!google !amazon", symbol, multiBang),
        { bangNames: ["google", "amazon"], query: "" },
      );
    });

    it("large leading run consumes all contiguous bangs", () => {
      assert.deepStrictEqual(
        parseBangs("!a !b !c !d !e foo", symbol, multiBang),
        { bangNames: ["a", "b", "c", "d", "e"], query: "foo" },
      );
    });

    it("trailing run stays in query when a leading run wins", () => {
      assert.deepStrictEqual(
        parseBangs("!a !b foo !c !d", symbol, multiBang),
        { bangNames: ["a", "b"], query: "foo !c !d" },
      );
    });

    it("large trailing run consumes all contiguous bangs", () => {
      assert.deepStrictEqual(
        parseBangs("foo !a !b !c !d !e", symbol, multiBang),
        { bangNames: ["a", "b", "c", "d", "e"], query: "foo" },
      );
    });

    it('custom symbol — false-positive on "acer"', () => {
      assert.deepStrictEqual(parseBangs("acea acer computer", "ace", true), {
        bangNames: ["a", "r"],
        query: "computer",
      });
    });
  });
});
