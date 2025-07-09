# effect-workshop-webserver

[ethanniser/effect-workshop](https://github.com/ethanniser/effect-workshop/tree/main/src)のPart3のWebサーバーの実装をやってみます。

テストを書きながら進めていきたく、実装が多くなりそうなのでリポジトリを作って作業することにしました。

## 作業ログ

### セットアップ

index.tsとmodel.tsを持ってきた。"ws"モジュールの型定義がないとエラーになっている。元のリポジトリは`@types/bun`と一緒にインストールされていた。

`@types/bun`をインストールしても解決せず、原因を調べる。
