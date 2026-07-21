import assert from "node:assert/strict";
import { curlToHttp } from "../src/lib/curl-to-http.ts";

// simple GET
assert.equal(curlToHttp("curl https://api.test/x"), "GET https://api.test/x");

// POST with headers and data
const out = curlToHttp(
  `curl -X POST https://api.test/login -H "Content-Type: application/json" -H "Authorization: Bearer xyz" -d '{"u":"a"}'`,
);
assert.ok(out.startsWith("POST https://api.test/login"));
assert.ok(out.includes("Content-Type: application/json"));
assert.ok(out.includes("Authorization: Bearer xyz"));
assert.ok(out.includes('{"u":"a"}'));
// blank line before body
assert.ok(/\n\n\{/.test(out));

// implicit POST when data present without -X
assert.ok(curlToHttp(`curl https://x/y -d 'a=1'`).startsWith("POST https://x/y"));

// line continuations
const multi = curlToHttp(`curl https://x/y \\
  -H "Accept: application/json"`);
assert.ok(multi.includes("Accept: application/json"));

// basic auth → header
const auth = curlToHttp("curl -u user:pass https://x/y");
assert.ok(auth.includes(`Authorization: Basic ${Buffer.from("user:pass").toString("base64")}`));

// --request and --url long forms
assert.ok(
  curlToHttp("curl --request DELETE --url https://x/y").startsWith("DELETE https://x/y"),
);

assert.throws(() => curlToHttp("wget https://x"));
assert.throws(() => curlToHttp("curl -X POST"));

console.log("test-curl-to-http: ok");
