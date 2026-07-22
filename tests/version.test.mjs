import assert from "node:assert/strict";
import test from "node:test";
import { selectNewerRelease } from "../node_modules/.cache/ecopaste-release-service-tests/src/version.js";

const release = (tagName) => ({ tag_name: tagName });

test("selects a newer stable release before an older nightly release", () => {
  const stable = release("v1.1.0");
  const nightly = release("v1.0.1-nightly.20260722.1");

  assert.equal(selectNewerRelease(stable, nightly), stable);
});

test("selects a newer stable release before an older beta release", () => {
  const stable = release("v1.1.0");
  const beta = release("v1.0.1-beta.3");

  assert.equal(selectNewerRelease(stable, beta), stable);
});

test("selects the stable release when both releases have the same core version", () => {
  const stable = release("v1.1.0");
  const releaseCandidate = release("v1.1.0-rc.1");

  assert.equal(selectNewerRelease(stable, releaseCandidate), stable);
});

test("selects a prerelease when its semantic version is newer", () => {
  const stable = release("v1.1.0");
  const nightly = release("v1.2.0-nightly.20260722.1");

  assert.equal(selectNewerRelease(stable, nightly), nightly);
});

test("keeps prerelease selection when a tag cannot be compared", () => {
  const stable = release("latest");
  const nightly = release("nightly");

  assert.equal(selectNewerRelease(stable, nightly), nightly);
});
