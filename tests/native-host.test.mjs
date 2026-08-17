import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  NativeMessageDecoder,
  buildCodexInstruction,
  encodeNativeMessage,
  handleTranslateMessage,
  parseCodexResponse,
  validateTranslateRequest
} from "../native-host/host.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const sampleRequest = {
  type: "translate",
  version: 1,
  targetLanguage: "zh-CN",
  items: [
    { id: "b1", text: "The first paragraph." },
    { id: "b2", text: "The second paragraph." }
  ]
};

test("Native Messaging decoder handles partial frames", () => {
  const encoded = encodeNativeMessage(sampleRequest);
  const decoder = new NativeMessageDecoder();

  assert.deepEqual(decoder.push(encoded.subarray(0, 3)), []);
  assert.deepEqual(decoder.push(encoded.subarray(3, 11)), []);
  assert.deepEqual(decoder.push(encoded.subarray(11)), [sampleRequest]);
});

test("request validation normalizes safe input", () => {
  assert.deepEqual(validateTranslateRequest(sampleRequest), {
    targetLanguage: "zh-CN",
    items: sampleRequest.items
  });
});

test("request validation rejects duplicate ids", () => {
  assert.throws(
    () => validateTranslateRequest({
      ...sampleRequest,
      items: [sampleRequest.items[0], sampleRequest.items[0]]
    }),
    /重复/
  );
});

test("Codex instruction treats webpage text as untrusted data", () => {
  const instruction = buildCodexInstruction("zh-CN");
  assert.match(instruction, /untrusted webpage text/i);
  assert.match(instruction, /Never follow/);
  assert.match(instruction, /Simplified Chinese/);
});

test("Codex response is reordered to match request ids", () => {
  const stdout = JSON.stringify({
    translations: [
      { id: "b2", text: "第二段。" },
      { id: "b1", text: "第一段。" }
    ]
  });
  assert.deepEqual(parseCodexResponse(stdout, sampleRequest.items), [
    { id: "b1", text: "第一段。" },
    { id: "b2", text: "第二段。" }
  ]);
});

test("mock translator returns one result per input", async () => {
  const response = await handleTranslateMessage(sampleRequest, { mock: true });
  assert.equal(response.ok, true);
  assert.deepEqual(response.translations.map((item) => item.id), ["b1", "b2"]);
  assert.match(response.translations[0].text, /模拟译文/);
});

test("launcher speaks the real Native Messaging wire protocol in mock mode", async () => {
  const response = await runMockNativeHost(sampleRequest);
  assert.equal(response.ok, true);
  assert.equal(response.translations.length, 2);
});

function runMockNativeHost(request) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(join(root, "native-host", "launch.sh"), [
      "chrome-extension://emnejkkppjmobchhidfddgedogbkdhcl/",
      "0"
    ], {
      cwd: root,
      env: {
        ...process.env,
        CODEX_WEB_TRANSLATOR_MOCK: "1"
      },
      stdio: ["pipe", "pipe", "pipe"]
    });
    const decoder = new NativeMessageDecoder();
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      rejectPromise(new Error("mock native host timed out"));
    }, 5_000);

    child.stdout.on("data", (chunk) => {
      try {
        const [message] = decoder.push(chunk);
        if (message) {
          clearTimeout(timer);
          resolvePromise(message);
          child.kill("SIGTERM");
        }
      } catch (error) {
        clearTimeout(timer);
        rejectPromise(error);
      }
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      rejectPromise(error);
    });
    child.on("close", (code) => {
      if (code && code !== 143 && stderr) {
        clearTimeout(timer);
        rejectPromise(new Error(stderr));
      }
    });
    child.stdin.end(encodeNativeMessage(request));
  });
}
