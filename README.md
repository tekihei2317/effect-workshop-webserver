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
