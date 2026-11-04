import { test } from "node:test";
import assert from "node:assert/strict";
import { ANCHORS, SET_IDS } from "./anchors";
import { SETS, PENDING } from "./index";

test("every built set has exactly the anchors the validator knows", () => {
  for (const id of SET_IDS) {
    if (PENDING.includes(id)) { assert.throws(() => SETS[id].build(null as never, {}), /ainda não implementado/); continue; }
    const s = SETS[id];
    assert.equal(s.id, id);
    assert.deepEqual(Object.keys(s.spots).sort(), [...ANCHORS[id].spots].sort(), `${id} spots`);
    assert.deepEqual(Object.keys(s.views).sort(), [...ANCHORS[id].views].sort(), `${id} views`);
  }
});
