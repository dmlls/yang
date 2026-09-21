import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseBangs } from "./utils.js";

const EMPTY = { bangs: [], snap: null, query: null };

function hit(bangs, query, snap = null) {
  return { bangs, snap, query };
}

// Basic single bang cases, without snaps.
const basicBangCases = [
  ["single bang at start", "!osm foo", "!", null, hit(["osm"], "foo")],
  ["single bang at end", "foo !osm", "!", null, hit(["osm"], "foo")],
  [
    "only leading bang is considered",
    "!osm foo !wiki bar",
    "!",
    null,
    hit(["osm"], "foo !wiki bar"),
  ],
  [
    "only trailing bang is considered",
    "foo !osm bar !wiki",
    "!",
    null,
    hit(["wiki"], "foo !osm bar"),
  ],
  [
    "bangs in the middle do nothing",
    "foo !osm bar",
    "!",
    null,
    hit([], "foo !osm bar"),
  ],
  [
    "single bang at start and end: only leading is considered",
    "!osm foo bar !wiki",
    "!",
    null,
    hit(["osm"], "foo bar !wiki"),
  ],
  [
    "concatenated bangs are considered as one",
    "!g!a",
    "!",
    null,
    hit(["g!a"], ""),
  ],
  ["no bangs does nothing", "foo bar", "!", null, hit([], "foo bar")],
  ["empty search query returns null results", "", "!", null, EMPTY],
  ["bare bang symbol does nothing", "!", "!", null, hit([], "!")],
  ["empty bang name does nothing", "! foo", "!", null, hit([], "! foo")],
  ["empty bang name does nothing", "foo !", "!", null, hit([], "foo !")],
  [
    "trailing space(s) escape bang triggering",
    "foo !bar ",
    "!",
    null,
    hit([], "foo !bar "),
  ],
  [
    "leading space(s) escape bang triggering",
    " !bar foo",
    "!",
    null,
    hit([], " !bar foo"),
  ],
  [
    "leading and trailing space(s) escape bang triggering",
    " !bar foo ",
    "!",
    null,
    hit([], " !bar foo "),
  ],
  // Custom symbols
  ["custom bang symbol at start", "#a foo", "#", null, hit(["a"], "foo")],
  ["custom bang symbol at end", "foo .s", ".", null, hit(["s"], "foo")],
  [
    "custom symbol: leading bang is preferred over trailing",
    "-r foo -a",
    "-",
    null,
    hit(["r"], "foo -a"),
  ],
];

describe("parseBangs", () => {
  describe("basic cases", () => {
    for (const multiBang of [true, false]) {
      describe(multiBang ? "multi-bang mode" : "single-bang mode", () => {
        for (const [
          title,
          input,
          bangSymbol,
          snapSymbol,
          expected,
        ] of basicBangCases) {
          it(title, () => {
            assert.deepStrictEqual(
              parseBangs(input, bangSymbol, snapSymbol, multiBang),
              expected,
            );
          });
        }
      });
    }
  });

  // Single-bang mode
  describe("single-bang mode only", () => {
    const multiBang = false;
    const bangSymbol = "!";
    const snapSymbol = ".";

    it("only first leading bang is considered", () => {
      assert.deepStrictEqual(
        parseBangs("!osm !wiki foo", bangSymbol, snapSymbol, multiBang),
        hit(["osm"], "!wiki foo"),
      );
    });

    it("only first trailing bang is considered", () => {
      assert.deepStrictEqual(
        parseBangs("foo !osm !wiki", bangSymbol, snapSymbol, multiBang),
        hit(["osm"], "foo"),
      );
    });

    it("only first leading bang and snap are considered", () => {
      assert.deepStrictEqual(
        parseBangs("!osm .s !wiki foo", bangSymbol, snapSymbol, multiBang),
        hit(["osm"], "!wiki foo", "s"),
      );
    });

    it("only first trailing bang and snap are considered", () => {
      assert.deepStrictEqual(
        parseBangs("foo !osm .s !wiki", bangSymbol, snapSymbol, multiBang),
        hit(["osm"], "foo", "s"),
      );
    });
  });

  // Multi-bang mode
  describe("multi-bang mode only", () => {
    const multiBang = true;
    const bangSymbol = "!";
    const snapSymbol = ".";

    it("multiple bangs at start", () => {
      assert.deepStrictEqual(
        parseBangs("!osm !wiki foo bar", bangSymbol, snapSymbol, multiBang),
        hit(["osm", "wiki"], "foo bar"),
      );
    });

    it("multiple bangs at end", () => {
      assert.deepStrictEqual(
        parseBangs("foo bar !osm !wiki", bangSymbol, snapSymbol, multiBang),
        hit(["osm", "wiki"], "foo bar"),
      );
    });

    it("bangs at both ends: leading is preferred", () => {
      assert.deepStrictEqual(
        parseBangs("!gm !osm Paris !m", bangSymbol, snapSymbol, multiBang),
        hit(["gm", "osm"], "Paris !m"),
      );
    });

    it("end-only bangs still work when no leading bang", () => {
      assert.deepStrictEqual(
        parseBangs("test !a !g", bangSymbol, snapSymbol, multiBang),
        hit(["a", "g"], "test"),
      );
    });

    it("only bangs, no query", () => {
      assert.deepStrictEqual(
        parseBangs("!osm !wiki", bangSymbol, snapSymbol, multiBang),
        hit(["osm", "wiki"], ""),
      );
    });

    it("large leading run consumes all contiguous bangs", () => {
      assert.deepStrictEqual(
        parseBangs("!a !b !c !d !e foo", bangSymbol, snapSymbol, multiBang),
        hit(["a", "b", "c", "d", "e"], "foo"),
      );
    });

    it("trailing run stays in query when a leading run is present", () => {
      assert.deepStrictEqual(
        parseBangs("!a !b foo !c !d", bangSymbol, snapSymbol, multiBang),
        hit(["a", "b"], "foo !c !d"),
      );
    });

    it("large trailing run consumes all contiguous bangs", () => {
      assert.deepStrictEqual(
        parseBangs("foo !a !b !c !d !e", bangSymbol, snapSymbol, multiBang),
        hit(["a", "b", "c", "d", "e"], "foo"),
      );
    });

    it("leading single bang and snap", () => {
      assert.deepStrictEqual(
        parseBangs("!a .s foo", bangSymbol, snapSymbol, multiBang),
        hit(["a"], "foo", "s"),
      );
    });

    it("trailing single bang and snap", () => {
      assert.deepStrictEqual(
        parseBangs("foo !a .s", bangSymbol, snapSymbol, multiBang),
        hit(["a"], "foo", "s"),
      );
    });

    it("leading snap and single bang", () => {
      assert.deepStrictEqual(
        parseBangs(".s !a foo", bangSymbol, snapSymbol, multiBang),
        hit(["a"], "foo", "s"),
      );
    });

    it("trailing snap and single bang", () => {
      assert.deepStrictEqual(
        parseBangs("foo .s !a", bangSymbol, snapSymbol, multiBang),
        hit(["a"], "foo", "s"),
      );
    });

    it("multiple leading bangs and single snap", () => {
      assert.deepStrictEqual(
        parseBangs("!a !b !c !d .s foo", bangSymbol, snapSymbol, multiBang),
        hit(["a", "b", "c", "d"], "foo", "s"),
      );
    });

    it("multiple trailing bangs and single snap", () => {
      assert.deepStrictEqual(
        parseBangs("foo !a !b !c !d .s", bangSymbol, snapSymbol, multiBang),
        hit(["a", "b", "c", "d"], "foo", "s"),
      );
    });

    it("only first snap is considered", () => {
      assert.deepStrictEqual(
        parseBangs("foo !a .s !b !c !d .x", bangSymbol, snapSymbol, multiBang),
        hit(["a", "b", "c", "d"], "foo", "s"),
      );
    });

    it("intercalated snap and bangs", () => {
      assert.deepStrictEqual(
        parseBangs("!a .s !b !c foo !a .s", bangSymbol, snapSymbol, multiBang),
        hit(["a", "b", "c"], "foo !a .s", "s"),
      );
    });

    it("leading space(s) escape bang and snap triggering", () => {
      assert.deepStrictEqual(
        parseBangs(" !a .s !b !c foo !a .s", bangSymbol, snapSymbol, multiBang),
        hit([], " !a .s !b !c foo !a .s"),
      );
    });

    it("trailing space(s) escape bang and snap triggering", () => {
      assert.deepStrictEqual(
        parseBangs("!a .s !b !c foo !a .s ", bangSymbol, snapSymbol, multiBang),
        hit([], "!a .s !b !c foo !a .s "),
      );
    });

    it("leading and trailing space(s) escape bang and snap triggering", () => {
      assert.deepStrictEqual(
        parseBangs(
          " !a .s !b !c foo !a .s ",
          bangSymbol,
          snapSymbol,
          multiBang,
        ),
        hit([], " !a .s !b !c foo !a .s "),
      );
    });
  });

  // Snaps
  describe("snap symbol", () => {
    const bangSymbol = "!";
    const snapSymbol = ".";

    it("snap at start", () => {
      assert.deepStrictEqual(
        parseBangs(".maps foo", bangSymbol, snapSymbol, false),
        hit([], "foo", "maps"),
      );
    });

    it("snap at end", () => {
      assert.deepStrictEqual(
        parseBangs("foo .maps", bangSymbol, snapSymbol, false),
        hit([], "foo", "maps"),
      );
    });

    it("snap and bang together at start", () => {
      assert.deepStrictEqual(
        parseBangs("!osm .maps foo", bangSymbol, snapSymbol, true),
        hit(["osm"], "foo", "maps"),
      );
    });

    it("snap and bang together at end", () => {
      assert.deepStrictEqual(
        parseBangs("foo !osm .maps", bangSymbol, snapSymbol, true),
        hit(["osm"], "foo", "maps"),
      );
    });

    it("second snap stops collection, only first snap is kept", () => {
      assert.deepStrictEqual(
        parseBangs(".maps .osm foo", bangSymbol, snapSymbol, true),
        hit([], ".osm foo", "maps"),
      );
    });

    it("snap-only, no query", () => {
      assert.deepStrictEqual(
        parseBangs(".maps", bangSymbol, snapSymbol, false),
        hit([], "", "maps"),
      );
    });

    it("bang before snap at start, both captured", () => {
      assert.deepStrictEqual(
        parseBangs("!g .maps Paris", bangSymbol, snapSymbol, true),
        hit(["g"], "Paris", "maps"),
      );
    });

    it("empty query returns null-result", () => {
      assert.deepStrictEqual(
        parseBangs("", bangSymbol, snapSymbol, false),
        EMPTY,
      );
    });
  });
});
