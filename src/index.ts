import { Layer, pipe } from "effect";
import { BunRuntime } from "@effect/platform-bun";
import {
  CurrentConnections,
  HttpServer,
  WSServerLive,
  WSSServer,
} from "./shared";
import * as HTTP from "./http.ts";

const serverLayers = Layer.merge(HTTP.HttpLive, WSServerLive);

const app = pipe(
  serverLayers,
  Layer.provide(HTTP.HTTPServerLive),
  Layer.provide(CurrentConnections.Live),
  Layer.provide(WSSServer.Live),
  Layer.provide(HttpServer.Live)
);

pipe(app, Layer.launch, BunRuntime.runMain);
