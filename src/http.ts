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

export const HTTPServerLive: Layer.Layer<
  HttpServer.HttpServer,
  ConfigError.ConfigError | HttpServerError.ServeError,
  _HttpServer
> = Layer.scoped(
  HttpServer.HttpServer,
  _HttpServer.pipe(
    Effect.zip(C.PORT),
    Effect.flatMap(([server, port]) =>
      NodeHttpServer.make(() => server, { port })
    )
  )
).pipe(HttpServer.withLogAddress);

export const HttpLive: Layer.Layer<
  never,
  never,
  HttpServer.HttpServer | CurrentConnections
> = HttpRouter.empty.pipe(
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
  ),
  HttpServer.serve(HttpMiddleware.logger)
);
