import { test, expect, beforeAll, afterAll } from "bun:test";
import { spawn } from "bun";
import { joinUser as joinUserFactory } from "./helpers/websocket-client.ts";

const TEST_PORT = 3001;
let serverProcess: ReturnType<typeof spawn>;

beforeAll(async () => {
  // Start server on test port
  serverProcess = spawn({
    cmd: ["bun", "run", "src/index.ts"],
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

async function fetchColors(): Promise<Response> {
  return fetch(`http://localhost:${TEST_PORT}/colors`);
}

const joinUser = joinUserFactory(TEST_PORT);

test("/colors endpoint returns all colors when no users connected", async () => {
  const response = await fetchColors();

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("application/json");

  const data = await response.json();

  expect(data).toEqual({
    _tag: "availableColors",
    colors: ["red", "green", "yellow", "blue", "magenta", "cyan", "white"],
  });
});

test("/colors endpoint excludes color when 1 user joins", async () => {
  const ws = await joinUser("alice", "red");

  try {
    const response = await fetchColors();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/json");

    const data = await response.json();

    expect(data).toEqual({
      _tag: "availableColors",
      colors: ["green", "yellow", "blue", "magenta", "cyan", "white"],
    });
  } finally {
    ws.close();
  }
});

test("/colors endpoint excludes colors when multiple users join", async () => {
  const ws1 = await joinUser("alice", "red");
  const ws2 = await joinUser("bob", "blue");
  const ws3 = await joinUser("charlie", "green");

  try {
    const response = await fetchColors();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/json");

    const data = await response.json();

    expect(data).toEqual({
      _tag: "availableColors",
      colors: ["yellow", "magenta", "cyan", "white"],
    });
  } finally {
    ws1.close();
    ws2.close();
    ws3.close();
  }
});

test("/colors endpoint includes color again when user leaves", async () => {
  const ws = await joinUser("alice", "red");

  // Verify color is excluded
  let response = await fetchColors();
  let data = (await response.json()) as { colors: string[] };
  expect(data.colors).not.toContain("red");

  // Close connection and wait a bit for cleanup
  ws.close();
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Verify color is available again
  response = await fetchColors();
  data = (await response.json()) as { colors: string[] };
  expect(data.colors).toContain("red");
});

test("/colors endpoint returns 404 for invalid path", async () => {
  const response = await fetch(`http://localhost:${TEST_PORT}/invalid`);

  expect(response.status).toBe(404);

  const text = await response.text();
  expect(text).toBe("Not Found");
});
