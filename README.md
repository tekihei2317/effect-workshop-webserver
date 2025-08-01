# effect-workshop-webserver

[ethanniser/effect-workshop](https://github.com/ethanniser/effect-workshop/tree/main/src)のPart3のWebサーバーの実装をやってみます。

テストを書きながら進めていきたく、実装が多くなりそうなのでリポジトリを作って作業することにしました。

## 作業ログ

### セットアップ

index.tsとmodel.tsを持ってきた。"ws"モジュールの型定義がないとエラーになっている。元のリポジトリは`@types/bun`と一緒にインストールされていた。

`@types/bun`をインストールしても解決せず、`@types/ws`をインストールした。もしかするとエディタをリロードしたら解決していたかも。

最初にClaudeにテスト計画とテストコードを書いてもらった。これで安心してEffectへのリファクタリングを進められそう。

---

1→2

Layerを使ってhttp、wss、listenを書き換える。それぞれ`Layer.sync`、`Layer.effect`、`Layer.effectDiscard`を使っている。

よく分からないのでとりあえず写経。依存性注入をやっている。`Layer`の作り方、`LayerLive`とは、`Layer.provide`と`Layer.merge`などの使い方、あたりを押さえると良さそう。

---

2→3

`/colors`のレスポンスが毎回同じだという問題があった。`yield* availableColors`がLayer初期化時だけ実行されるようなコードになっていたので、リクエストハンドラの中に入れると解決した。

雰囲気で書いている今の理解を整理してみる。

- Context.Tagを継承して、サービスを定義する。この中で実際のインスタンスは`static readonly Live`、テスト用のインスタンスは`static readonly Test`と慣習的に命名する。
- サービス自体もエフェクトである。
- サービスの具体的な実装は~Liveと命名する。実装はLayer.sync、Layer.effect、Layer.effectDiscardなどを使う。
- Layer.mergeでサービスの実装を合成することができる。
- エフェクト内ではyield*でサービスを呼び出すことができ、呼び出すと依存に追加される。
- 実際に実行する前に、Layer.provide()でインスタンスを注入する。
- サービスはシングルトンで共有化されるので、そうして問題ないものだけを入れる

---

3→4

HttpServerに関して、`index.ts`で`HTTP.LIVE`、`HTTP.HTTPServerLive`、`SERVER.HttpServer.Live`と似たような名前のものが複数あり、とてもややこしい。

- `HTTP.LIVE` HTTPサーバーのサービスを、EffectのHTTPサーバーに変換している？
- `HTTP.HTTPServerLive` HTTPサーバーの具体的な実装
- `Server.HttpServer.Live` HTTPサーバーのインスタンス

`Server.HttpServer.Live`ではNodeのcreateServerを使っていて、`HTTP.LIVE`では`@effect/platform-node`の`NodeHttpServer`を使っていて冗長なので、絶対なんとかなるだろうという気がしている。

---

Claude Codeが落ちたので曖昧な理解のまま進むのが難しくなっている。Layerという概念について理解していないことに気づいたのでドキュメントを読む。

どうやらServiceとは違うものらしい。ServiceはEffectの依存に含まれるもので、あとから外部から注入するものと理解している。

[What is Layer?](./what-is-layer.md)

---

とりあえず写経&コピペしながら実装。HTTPサーバーの定義が冗長なので、なんとかしたい

```ts
const serverLayers = Layer.merge(HTTP.HttpLive, WS.WSServerLive);

const app = pipe(
  serverLayers,
  Layer.provide(HTTP.HTTPServerLive),
  Layer.provide(SERVER.WSSServer.Live),
  Layer.provide(SERVER.CurrentConnections.Live),
  Layer.provide(SERVER.HttpServer.Live)
);
```

- nodeのcreateServer使っているところ（Server.HttpServer.Live）
- platform-nodeのNodeHttpServer使っているところ（Http.HttpServerLive）
- platformのHttpServer使っているところ（同上）
- ルーティング定義しているところ（Http.HttpLive）

ルーティング定義するところと、@effect/platformのHttpServerを使うところは別にレイヤーに分けなくてもいいと思う。

nodeと@effect/platformで分ける必要があるのは、WebSocketのサーバーの方でnodeのHTTPサーバーを呼び出して使うから。

---

Part 5はEffectが提供するデータ構造（HashMap、Ref）への書き換えで、Part 6,7は高度な内容なのでここまでとする。
