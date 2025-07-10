import { Effect, Layer, Schema } from "effect";
import { CurrentConnections, WSSServer } from "./shared.ts";
import * as M from "./model.ts";

export const WSServerLive: Layer.Layer<
  never,
  never,
  WSSServer | CurrentConnections
> = Layer.effectDiscard(
  Effect.gen(function* () {
    const wss = yield* WSSServer;
    const currentConnections = yield* CurrentConnections;

    function broadcastMessage(message: M.ServerOutgoingMessage) {
      const messageString = JSON.stringify(message);
      currentConnections.forEach((conn) => conn._rawWS.send(messageString));
    }

    wss.on("connection", (ws) => {
      let connectionName: string;

      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());

          const parsedMessage = Schema.decodeUnknownSync(
            Schema.Union(M.ServerIncomingMessage, M.StartupMessage)
          )(message);

          switch (parsedMessage._tag) {
            case "startup": {
              const { color, name } = parsedMessage;

              if (!M.colors.includes(color) || currentConnections.has(name)) {
                ws.close(); // Close the connection if the color is not available or the name is already taken

                return;
              }

              connectionName = name;

              console.log(`New connection: ${name}`);

              currentConnections.set(name, {
                _rawWS: ws,
                name,
                color,
                timeConnected: Date.now(),
              });

              broadcastMessage({ _tag: "join", name, color });

              break;
            }

            case "message": {
              if (connectionName) {
                const conn = currentConnections.get(connectionName);

                if (conn) {
                  broadcastMessage({
                    _tag: "message",
                    name: conn.name,
                    color: conn.color,
                    message: parsedMessage.message,
                    timestamp: Date.now(),
                  });
                }
              }

              break;
            }
          }
        } catch (err) {
          console.error("Failed to process message:", err);
          ws.close(); // Close connection for invalid messages
        }
      });

      ws.on("close", () => {
        if (connectionName) {
          const conn = currentConnections.get(connectionName);

          if (conn) {
            broadcastMessage({
              _tag: "leave",
              name: conn.name,
              color: conn.color,
            });

            currentConnections.delete(connectionName);

            console.log(`Connection closed: ${connectionName}`);
          }
        }
      });
    });

    setInterval(
      () => console.log("Current connections:", currentConnections.size),
      1000
    );
  })
);
