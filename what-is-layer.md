# What is Layer?

[Managing Layers | Effect Documentation](https://effect.website/docs/requirements-management/layers/)


プログラムが依存するサービスが、また他のサービスに依存していたらどうするべき？と問題が提起されている。そのための仕組みがLayer。

### 用語の整理

- Service: 特定の機能を提供する、再利用可能なコンポーネント。アプリケーションの複数の箇所で横断して使用される。
- Tag: サービスの識別子
- Context: サービスを保有している場所。key = Tag、value = ServiceのMapだと考えればよい。
- Layer: サービスの作成を抽象化したもの（？）

"An abstraction for constructing services, managing dependencies during construction rather than at the service level." managing dependencies during constructionが鍵になっていそう。

### 以下のような状況の時にどうするべきか

- Config
- Logger→Config
- Database→Logger、Config

あー理解した気がする。サービスの実行時に依存を注入するインターフェイスに依存が現れてクリーンじゃないから、サービスの作成時に依存を注入できるようにしよう、そのための仕組みがLayerという感じかな。

Layerを~Liveと命名するのが慣習なのかな。先ほどのDatabaseの依存の問題については

- ConfigLive = Layer<Config>
- LoggerLive = Layer<Logger, never, Config>
- DatabaseLive = Layer<Database, never, Config | Logger>

DatabaseLiveは、Databaseサービスを作成する役割を担う。そして、サービスの作成にConfigサービスとLoggerサービスが必要（=Databaseサービス内で使用するので）ですよ、と言っている。

次は実装を見てみる。Databaseサービスのqueryが`query(sql: string) => Effect<unknown, never, Config | Logger>`みたいになってたけど、ConfigとLoggerに依存しながらインターフェイスから消すにはどういう実装になるのだろう？

→なるほど。というかそうするしかないけれど、Layerを定義するときに、依存を呼び出して、それからサービスを定義して返すような関数を書けばOK。これは`Layer.effect`という関数を使って実装する。

### レイヤーを組み合わせる

ここまででレイヤーを定義する方法を理解した。あとはレイヤーを実行する方法がわかれば良いが、その前にレイヤーを組み合わせる方法の説明があるので読む。

レイヤーの組み合わせ方には`merge`と`compose`の2つの方法がある。

```ts
import { Layer } from "effect"

declare const layer1: Layer.Layer<"Out1", never, "In1">
declare const layer2: Layer.Layer<"Out2", never, "In2">

// Layer.Layer<"Out1" | "Out2", never, "In1" | "In2">
const merging = Layer.merge(layer1, layer2)
```

`merge`は両方のサービスを作る新しいレイヤーを作る。必要な依存はもちろん、それぞれの依存を合わせたものになる。

```ts
import { Layer } from "effect"

declare const inner: Layer.Layer<"OutInner", never, "InInner">
declare const outer: Layer.Layer<"InInner", never, "InOuter">

// Layer.Layer<"OutInner" | "InOuter">
const composition = Layer.provide(inner, outer)
```

これは関数のパイプと同じで、出力と入力が一致する関数を直接に繋ぐイメージ。

### 先ほどの例でLayerを合成してみる

以上を元にDatabaseの依存の問題について、Layerを合成する方法を考えてみよう。登場人物は以下の通りだった。

- ConfigLive: Layer<Config, never, never>
- LoggerLive: Layer<Logger, never, Config>
- DatabaseLive: Layer<Database, never, Config | Logger>

これらを`MainLive`に合成し、ConfigとDatabaseサービスを出力するようにする（Loggerは消えてOK）。

パズルみたいで難しい。まずはConfigとLoggerをmergeする。それからDatabaseにprovideする...とDatabaseは得られるけどConfigが消えてしまう。

`provideMerge`という、出力を入力につないで依存を消しつつ（provide）、合成したレイヤーの出力に加える（merge）という、足して2で割ったような関数があるので、それを使えばいいようだ。

```ts
// Layer<Config | Logger, never, Config>
const AppConfigLive = Layer.merge(ConfigLive, LoggerLive)

// Layer<Config | Database, never, never>
const MainLive = DatabaseLive.pipe(
  Layer.provide(AppConfigLive), // Layer.Layer<Database, never, Config>になる
  Layer.provideMerge(ConfigLive) // Layer.Layer<Database | Config, never, never>になる
)
```

ドキュメントには上記が書かれているが、以下の方がシンプルだ。provideは必ずしも片方の出力がもう一方の入力に対応している必要はないっぽい。ここはちょっとわかっていない。ランタイムでもエラーは出なかった。

```ts
const mainLive = pipe(
  DatabaseLive,
  Layer.provide(LoggerLive), // Layer<Database, never, Config>になる
  Layer.provideMerge(ConfigLive) // Layer<Database | Config, never, never>になる
);
```

### ここまでのまとめ

ある程度理解できたのでここまでにする。まとめてみよう。

- Layerはサービスを作成するための関数（エフェクト）
- サービスが他のサービスに依存しているときに、その依存関係をサービスの実行時ではなく、サービスの作成時に解決しておくための仕組み
  - そうすることで、サービスのインターフェイスに他のサービスが現れないようにすることができる
- Layerを作成するには`Layer.effect`を使う。その引数に、依存している他のサービスを呼び出し、サービスを作成して返す処理を書く。
- Layer同士は`merge`や`provide`、`provideMerge`で合成することができる。`merge`は入力と出力の両方を合わせる。`provide`は片方の出力をもう一方の入力に繋ぐ。`provideMerge`は`provide`しながら出力も合わせる。
