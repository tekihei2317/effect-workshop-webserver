import { test, expect, beforeAll, afterAll, describe } from "bun:test";
import { spawn } from "bun";
import {
  createWebSocketClient,
  sendMessage,
  waitForMessage,
  joinUser as joinUserFactory,
} from "./helpers/websocket-client.ts";

const TEST_PORT = 3001;
let serverProcess: ReturnType<typeof spawn>;

beforeAll(async () => {
  // Start server on test port
  serverProcess = spawn({
    cmd: ["bun", "src/index.ts"],
    env: { ...process.env, PORT: TEST_PORT.toString() },
    stdout: "pipe",
    stderr: "pipe",
  });

  // Wait for server to start
  await new Promise<void>((resolve) => {
    const checkServer = async () => {
      try {
        const response = await fetch(`http://localhost:${TEST_PORT}/colors`);
        if (response.ok) {
          resolve();
        } else {
          setTimeout(checkServer, 100);
        }
      } catch {
        setTimeout(checkServer, 100);
      }
    };
    checkServer();
  });
});

afterAll(() => {
  serverProcess.kill();
});

const joinUser = joinUserFactory(TEST_PORT);

describe("Startup Message Tests", () => {
  test("user can join with valid color", async () => {
    const ws = await createWebSocketClient(TEST_PORT);

    try {
      sendMessage(ws, { _tag: "startup", name: "alice", color: "red" });

      const joinMessage = await waitForMessage(ws);

      expect(joinMessage).toEqual({
        _tag: "join",
        name: "alice",
        color: "red",
      });
    } finally {
      ws.close();
    }
  });

  test("名前が既存のユーザーと重複している場合は、接続が切れること", async () => {
    const ws1 = await joinUser("alice", "red");
    const ws2 = await createWebSocketClient(TEST_PORT);

    try {
      // Set up close listener before sending message
      const closePromise = new Promise<void>((resolve) => {
        ws2.on("close", () => resolve());
      });

      // Try to join with same name but different color
      sendMessage(ws2, { _tag: "startup", name: "alice", color: "blue" });
      await closePromise;

      expect(ws2.readyState).toBe(ws2.CLOSED);
    } finally {
      ws1.close();
      if (ws2.readyState !== ws2.CLOSED) {
        ws2.close();
      }
    }
  });

  test("無効な色で参加しようとした場合は、接続が切れること", async () => {
    const ws = await createWebSocketClient(TEST_PORT);

    // Set up close listener before sending message
    const closePromise = new Promise<void>((resolve) => {
      ws.on("close", () => resolve());
    });

    // Try to join with invalid color
    sendMessage(ws, { _tag: "startup", name: "alice", color: "invalidColor" });
    await closePromise;

    expect(ws.readyState).toBe(ws.CLOSED);
  });
});
