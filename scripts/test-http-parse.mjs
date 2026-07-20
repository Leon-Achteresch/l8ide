import assert from "node:assert/strict";
import {
  applyEnv,
  interpolate,
  missingVars,
  parseHttpFile,
  requestAtLine,
  toCurlArgs,
} from "../src/lib/http-parse.ts";

const src = `### Login
POST https://api.test/login
Content-Type: application/json
Authorization: Bearer xyz

{
  "user": "a"
}

### Liste
GET https://api.test/items
Accept: application/json
`;

const reqs = parseHttpFile(src);
assert.equal(reqs.length, 2);

const [login, list] = reqs;
assert.equal(login.method, "POST");
assert.equal(login.url, "https://api.test/login");
assert.equal(login.name, "Login");
assert.equal(login.headers.length, 2);
assert.deepEqual(login.headers[1], ["Authorization", "Bearer xyz"]);
assert.ok(login.body.includes('"user": "a"'));

assert.equal(list.method, "GET");
assert.equal(list.headers.length, 1);
assert.equal(list.body, "");

const at = requestAtLine(reqs, 3);
assert.equal(at.name, "Login");
const at2 = requestAtLine(reqs, 12);
assert.equal(at2.name, "Liste");

const args = toCurlArgs(login);
assert.ok(args.includes("-X"));
assert.ok(args.includes("POST"));
assert.ok(args.includes("--data-raw"));
assert.equal(args[args.length - 1], "https://api.test/login");

const bare = parseHttpFile("GET https://x.test/ping\n");
assert.equal(bare.length, 1);
assert.equal(bare[0].method, "GET");

const vars = { baseUrl: "https://api.dev", token: "abc" };
assert.equal(
  interpolate("{{baseUrl}}/items?t={{token}}", vars),
  "https://api.dev/items?t=abc",
);
assert.equal(interpolate("{{ baseUrl }}/x", vars), "https://api.dev/x");
assert.equal(interpolate("{{unknown}}/x", vars), "{{unknown}}/x");

const envReq = parseHttpFile(
  "GET {{baseUrl}}/me\nAuthorization: Bearer {{token}}\n",
)[0];
const applied = applyEnv(envReq, vars);
assert.equal(applied.url, "https://api.dev/me");
assert.deepEqual(applied.headers[0], ["Authorization", "Bearer abc"]);
assert.deepEqual(missingVars(envReq, vars), []);
assert.deepEqual(missingVars(envReq, { baseUrl: "x" }), ["token"]);

console.log("test-http-parse: ok");
