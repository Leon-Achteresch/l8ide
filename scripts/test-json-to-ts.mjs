import assert from "node:assert/strict";
import { jsonToTs } from "../src/lib/json-to-ts-core.ts";

const out = jsonToTs(
  JSON.stringify({
    id: 1,
    name: "x",
    active: true,
    tags: ["a", "b"],
    profile: { age: 30, city: "B" },
    note: null,
    "weird key": 1,
  }),
  "User",
);

assert.ok(out.includes("interface User {"));
assert.ok(out.includes("id: number;"));
assert.ok(out.includes("name: string;"));
assert.ok(out.includes("active: boolean;"));
assert.ok(out.includes("tags: string[];"));
assert.ok(out.includes("profile: Profile;"));
assert.ok(out.includes("interface Profile {"));
assert.ok(out.includes("age: number;"));
assert.ok(out.includes("note?: null;")); // null → optional
assert.ok(out.includes('"weird key": number;')); // non-ident quoted

// array of objects at root
const arr = jsonToTs(JSON.stringify([{ x: 1 }]), "List");
assert.ok(arr.includes("interface List {"));
assert.ok(arr.includes("items: Item[];"));
assert.ok(arr.includes("interface Item {"));

// nested interface appears before its user (root last)
assert.ok(out.indexOf("interface Profile") < out.indexOf("interface User"));

// invalid input throws
assert.throws(() => jsonToTs("not json"));
assert.throws(() => jsonToTs("42"));

console.log("test-json-to-ts: ok");
