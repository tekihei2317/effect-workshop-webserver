import { Layer, pipe } from "effect";
import { NodeRuntime } from "@effect/platform-node";
import * as SERVER from "./shared.ts";
import * as HTTP from "./http.ts";
import * as WS from "./ws.ts";

const serverLayers = Layer.merge(HTTP.HttpLive, WS.WSServerLive);

const app = pipe(
  serverLayers,
  Layer.provide(SERVER.WSSServer.Live),
  Layer.provide(SERVER.CurrentConnections.Live),
  Layer.provide(SERVER.HttpServer.Live)
);

pipe(app, Layer.launch, NodeRuntime.runMain);
