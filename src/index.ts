import { Layer, pipe } from "effect";
import { BunRuntime } from "@effect/platform-bun";
import {
  CurrentConnections,
  HttpLive,
  HttpServer,
  ListenLive,
  WSServerLive,
  WSSServer,
} from "./shared";

const serverLayers = Layer.merge(HttpLive, WSServerLive);

pipe(
  Layer.merge(serverLayers, ListenLive),
  Layer.provide(CurrentConnections.Live),
  Layer.provide(WSSServer.Live),
  Layer.provide(HttpServer.Live),
  Layer.launch,
  BunRuntime.runMain
);
