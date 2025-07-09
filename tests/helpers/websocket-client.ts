import { WebSocket } from "ws";

export function createWebSocketClient(port: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    ws.on("open", () => resolve(ws));
    ws.on("error", reject);
  });
}

export function sendMessage(ws: WebSocket, message: object): void {
  ws.send(JSON.stringify(message));
}

export function waitForMessage(ws: WebSocket): Promise<any> {
  return new Promise((resolve) => {
    ws.once("message", (data) => {
      resolve(JSON.parse(data.toString()));
    });
  });
}

export function joinUser(
  port: number
): (name: string, color: string) => Promise<WebSocket> {
  return async (name: string, color: string) => {
    const ws = await createWebSocketClient(port);
    sendMessage(ws, { _tag: "startup", name, color });
    await waitForMessage(ws); // Wait for join message
    return ws;
  };
}
