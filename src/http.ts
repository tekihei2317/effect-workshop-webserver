import { ConfigError, Effect, Layer, pipe } from "effect";
import {
  HttpMiddleware,
  HttpRouter,
  HttpServer,
  HttpServerError,
  HttpServerResponse,
} from "@effect/platform";
import { NodeHttpServer } from "@effect/platform-node";

import {
  HttpServer as _HttpServer,
  CurrentConnections,
  getAvailableColors,
} from "./shared.ts";
import * as C from "./config.ts";
import * as M from "./model.ts";

const router = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/colors",
    Effect.gen(function* () {
      const currentConnections = yield* CurrentConnections;

      return yield* pipe(
        M.AvailableColorsResponse.make({
          _tag: "availableColors",
          colors: getAvailableColors(currentConnections),
        }),
        HttpServerResponse.schemaJson(M.AvailableColorsResponse)
      );
    })
  )
);

const ServerLive = Layer.scoped(
  HttpServer.HttpServer,
  Effect.gen(function* () {
    const http = yield* _HttpServer;
    const port = yield* C.PORT;
    return yield* NodeHttpServer.make(() => http, { port });
  })
);

export const HttpLive: Layer.Layer<
  never,
  ConfigError.ConfigError | HttpServerError.ServeError,
  _HttpServer | CurrentConnections
> = pipe(
  router.pipe(HttpServer.serve(), HttpServer.withLogAddress),
  Layer.provide(ServerLive)
);
