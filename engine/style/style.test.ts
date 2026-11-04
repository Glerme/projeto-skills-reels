import { test } from "node:test";
import assert from "node:assert/strict";
import { INK } from "./toon";
import { LIGHTS } from "./lights";

test("style modules import without the bridge", () => {
  assert.equal(INK, "#241726");
  assert.ok(LIGHTS.day);
  assert.ok(LIGHTS.golden);
});
