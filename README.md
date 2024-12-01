# Alexa Skill with Gemini AI

ノーコードでアレクサにGeminiのスキルを作成することができます。

## 必要な環境

- AWS Lambda Node.js ランタイム

## セットアップ手順

1. `lambda/keys.template.js`を`lambda/keys.js`にコピー
2. `keys.js`内のAPI keyを自分のものに置き換え
3. その他の設定を必要に応じて調整

基本的には
https://note.com/eito_hijikata/n/nd81a26f26faa
に書いてある手順を踏んでください。

相違点は以下の通りです：

- モデルはgemini-1.5-flashを使用
- Gemini APIキーを使用
  - こちらで作成する:
    https://aistudio.google.com/app/apikey
- 「スキルの登録（約４～７分）について」の3.の手順に修正あり：
  - エクスペリエンスのタイプ：ゲーム＆トリビア
  - 3. ホスティングサービス: Alexa-hosted (Node.js)
  - ホスト地域: 米国西部（オレゴン）
- 次の画面の右手のほうに「スキルをインポート」というボタンがあるので、それをクリック
　- GithubのURLを貼り付ける画面になるので、
    https://github.com/umayado17/AlexaGemini.git
    を貼り付けて「インポート」をクリック
- インポート後は、
  - 「ビルド」ページ
    - Invocationをクリック
    - Skill Invocation Nameをクリック
    - 「ジェミニ」と入力
    - 「Build skill」をクリック
  - 「コードエディタ」ページ
    - lambda/keys.jsのGEMINI_API_KEYを自分のものに置き換え
    - 「デプロイ」をクリック
  - 「テスト」ページ
    - スキルテストが有効になっているステージ: 「開発中」をクリック
    - 「Alexaシミュレータ」のテキスト入力フィールドを選択
    - 「ジェミニ」と入力
    
## 注意
`keys.js`は`.gitignore`に含まれており、APIキーなどの機密情報はGitHubにアップロードされません。

## 参考

https://note.com/eito_hijikata/n/nd81a26f26faa
で紹介されていたものをベースに作成しています。
