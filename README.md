# Alexa Skill with Generative AI

ノーコードでアレクサにAIアシスタントのスキルを作成することができます。現在、以下の3つのAIモデルに対応しています：

- Gemini (デフォルト)
- ChatGPT
- Claude

音声コマンドで簡単にAIモデルを切り替えることができます：
- 「ジェミニに切り替えて」
- 「クロードを使って」
- 「チャットGPTモードに変更して」

## 必要な環境

- AWS Lambda Node.js ランタイム

## セットアップ手順

1. `lambda/keys.template.js`を`lambda/keys.js`にコピー
2. `keys.js`内の各LLMのAPI keyを自分のものに置き換え
   - Gemini API key: https://aistudio.google.com/app/apikey
   - OpenAI API key: https://platform.openai.com/api-keys
   - Claude API key: https://console.anthropic.com/settings/keys
3. その他の設定を必要に応じて調整

基本的には
https://note.com/eito_hijikata/n/nd81a26f26faa
に書いてある手順を踏んでください。

相違点は以下の通りです：

- デフォルトモデル：
  - Gemini: gemini-1.5-flash
  - ChatGPT: gpt-4o-mini
  - Claude: claude-3-5-haiku-latest
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
    - lambda/keys.jsの各LLMのapi_keyを自分のものに置き換え
    - 「デプロイ」をクリック
  - 「テスト」ページ
    - スキルテストが有効になっているステージ: 「開発中」をクリック
    - 「Alexaシミュレータ」のテキスト入力フィールドを選択
    - 「ジェミニ」と入力
    
## 注意
`keys.js`は`.gitignore`に含まれており、APIキーなどの機密情報はGitHubにアップロードされません。

## 使用例

```
ユーザー：「アレクサ、ジェミニを開いて」
Alexa: 「ようこそ。質問してください。」

ユーザー：「クロードに切り替えて」
Alexa: 「Claudeモードに切り替えました。」

ユーザー：「チャットGPTを使って」
Alexa: 「ChatGPTモードに切り替えました。」
```

## 参考

https://note.com/eito_hijikata/n/nd81a26f26faa
で紹介されていたものをベースに作成しています。
