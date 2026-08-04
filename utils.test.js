import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseBangs } from "./utils.js";

describe("parseBangs", () => {
  describe("multi-bang mode", () => {
    const multiBang = true;
    const symbol = "!";

    it("single bang at start", () => {
      assert.deepStrictEqual(parseBangs("!google foo", symbol, multiBang), {
        bangNames: ["google"],
        query: "foo",
      });
    });

    it("multiple bangs at start", () => {
      assert.deepStrictEqual(
        parseBangs("!google !amazon foo bar", symbol, multiBang),
        { bangNames: ["google", "amazon"], query: "foo bar" },
      );
    });

    it("single bang at end", () => {
      assert.deepStrictEqual(parseBangs("foo !google", symbol, multiBang), {
        bangNames: ["google"],
        query: "foo",
      });
    });

    it("multiple bangs at end", () => {
      assert.deepStrictEqual(
        parseBangs("foo bar !google !amazon", symbol, multiBang),
        { bangNames: ["google", "amazon"], query: "foo bar" },
      );
    });

    it("rejects scattered bangs — prefix only wins", () => {
      assert.deepStrictEqual(
        parseBangs("!google foo !amazon bar", symbol, multiBang),
        { bangNames: ["google"], query: "foo !amazon bar" },
      );
    });

    it("rejects scattered bangs — suffix when end has bang", () => {
      assert.deepStrictEqual(
        parseBangs("foo !google bar !amazon", symbol, multiBang),
        { bangNames: ["amazon"], query: "foo !google bar" },
      );
    });

    it("no bangs returns null", () => {
      assert.strictEqual(parseBangs("foo bar", symbol, multiBang), null);
    });

    it("only bangs, no query", () => {
      assert.deepStrictEqual(
        parseBangs("!google !amazon", symbol, multiBang),
        { bangNames: ["google", "amazon"], query: "" },
      );
    });

    it("empty search query returns null", () => {
      assert.strictEqual(parseBangs("", symbol, multiBang), null);
    });
  });

  describe("single-bang mode (multiBang: false)", () => {
    const multiBang = false;
    const symbol = "!";

    it("single bang at start", () => {
      assert.deepStrictEqual(parseBangs("!google foo", symbol, multiBang), {
        bangNames: ["google"],
        query: "foo",
      });
    });

    it("single bang at end", () => {
      assert.deepStrictEqual(parseBangs("foo !google", symbol, multiBang), {
        bangNames: ["google"],
        query: "foo",
      });
    });

    it("concatenated bangs stay as one name", () => {
      assert.deepStrictEqual(parseBangs("!g!a", symbol, multiBang), {
        bangNames: ["g!a"],
        query: "",
      });
    });

    it("no bangs returns null", () => {
      assert.strictEqual(parseBangs("foo bar", symbol, multiBang), null);
    });

    it("empty search query returns null", () => {
      assert.strictEqual(parseBangs("", symbol, multiBang), null);
    });
  });

  describe("custom bang symbol", () => {
    it('multi-bang with "ace" symbol — false-positive on "acer"', () => {
      assert.deepStrictEqual(parseBangs("acea acer computer", "ace", true), {
        bangNames: ["a", "r"],
        query: "computer",
      });
    });

    it('single-bang with "ace" symbol — only first word', () => {
      assert.deepStrictEqual(
        parseBangs("acea acer computer", "ace", false),
        { bangNames: ["a"], query: "acer computer" },
      );
    });

    it('single-bang with "ace" symbol — first wins over last', () => {
      assert.deepStrictEqual(
        parseBangs("acer computer acea", "ace", false),
        { bangNames: ["r"], query: "computer acea" },
      );
    });
  });
});
