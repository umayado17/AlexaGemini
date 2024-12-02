/* *
 * このサンプルは、Alexa Skills Kit SDK (v2)を使用してAlexaスキルのインテントを処理する方法を示しています。
 * スロット、ダイアログ管理、セッション永続化、APIコールなどの実装例については、
 * https://alexa.design/cookbook をご覧ください。
 * */
// 必要なモジュールをインポート
const Alexa = require('ask-sdk-core');
// const { Configuration, OpenAIApi } = require("openai");  // ChatGPT用
const keys = require('keys');
const persistenceAdapter = require('ask-sdk-s3-persistence-adapter');
const axios = require('axios');

// ChatGPT用の設定（参考用にコメントとして保持）
/*
const configuration = new Configuration({
    apiKey: keys.OPEN_AI_KEY
});
const openai = new OpenAIApi(configuration);
*/

// API応答取得関数
async function getAnswer(messages) {
    const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${keys.model}:generateContent`;
    
    try {
      // 会話履歴をGemini APIの形式に変換
      const formattedMessages = messages.map(msg => {
        if (msg.role === 'system') {
          return {
            role: 'user',
            parts: [{
              text: `Instructions: ${msg.content}`
            }]
          };
        }
        return {
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{
            text: msg.content
          }]
        };
      });

      console.log('Sending to Gemini:', JSON.stringify(formattedMessages, null, 2));

      const response = await axios.post(
        `${API_ENDPOINT}?key=${keys.GEMINI_API_KEY}`,
        {
          contents: formattedMessages,
          generationConfig: {
            maxOutputTokens: 800,
            temperature: 0.7
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data.candidates || !response.data.candidates[0]?.content?.parts?.[0]?.text) {
        console.error('Unexpected Gemini response:', JSON.stringify(response.data, null, 2));
        throw new Error('Invalid response format from Gemini API');
      }

      return {
        choices: [{
          message: {
            content: response.data.candidates[0].content.parts[0].text
          }
        }],
        usage: {
          total_tokens: 0
        }
      };
    } catch (error) {
      console.error('Gemini API Error:', error.response?.data || error.message);
      throw error;
    }
}

// 文字列内の改行を空白に置換する関数
function formatString(text) {
  return text.replace(/\n+/g, " ");
}

// スキル起動時のハンドラー
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'ようこそ。何が知りたいですか？';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// ChatGPTとの対話を処理するハンドラー
// インテント名はChatGPTIntentのままにしている

// インテント名はinteractionModels/custom/ja-JP.jsonのChatGPTIntentのnameと一致させる
// スロット名はinteractionModels/custom/ja-JP.jsonのquestionのnameと一致させる
// ハンドラーのcanHandle関数では、リクエストタイプがIntentRequestで、
// インテント名がChatGPTIntentであるかをチェックしている

const ChatGPTIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ChatGPTIntent';
    },
    async handle(handlerInput) {
        // セッション属性から会話履歴を取得
        let attr = await handlerInput.attributesManager.getSessionAttributes();
        if(!attr.conversation){
            attr.conversation = [{role: 'system', content: keys.system_message}];
        }
        
        try {
            // ユーザーの質問を取得して会話履歴に追加
            const question = Alexa.getSlotValue(handlerInput.requestEnvelope, 'question');
            attr.conversation.push({ role : 'user', content : question });
            
            // Geminiに質問を送信して回答を取得
            const response = await getAnswer(attr.conversation);
            
            if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
                throw new Error('Invalid response format from Gemini API');
            }
            
            const speakOutput = formatString(response.choices[0].message.content);
            
            // Geminiの回答を会話履歴に追加
            attr.conversation.push({ role : 'assistant', content: speakOutput });
            
            // 会話履歴が長くなりすぎた場合、古い会話を削除
            if(attr.conversation.length > 10) {
                attr.conversation.shift();
                attr.conversation.shift();
            }
            
            // セッション属性を更新
            handlerInput.attributesManager.setSessionAttributes(attr);
            
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt('他に質問はありますか？')
                .getResponse();
                
        } catch (error) {
            console.error('Error in ChatGPTIntentHandler:', error);
            return handlerInput.responseBuilder
                .speak('申し訳ありません。エラーが発生しました。もう一度お試しください。')
                .reprompt('他の質問はありますか？')
                .getResponse();
        }
    }
};

// ヘルプインテントのハンドラー
const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// キャンセルと停止インテントのハンドラー
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
/* *
 * FallbackIntentは、ユーザーの発話がスキル内のどのインテントにもマッピングされない場合にトリガーされます
 * 言語モデルでも定義する必要があります（そのロケールでサポートされている場合）
 * このハンドラーは安全に追加できますが、まだサポートされていないロケールでは無視されます
 * */
// フォールバックインテントのハンドラー（認識できない発話の処理）
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Sorry, I don\'t know about that. Please try again.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
/* *
 * SessionEndedRequestは、セッションが終了したことを通知します。このハンドラーは、現在開いているセッションが
 * 以下のいずれかの理由で終了した場合にトリガーされます: 1) ユーザーが「終了」または「終わり」と発話した場合
 * 2) ユーザーが応答しないか、音声モデルで定義されたインテントに一致しない発話をした場合 3) エラーが発生した場合
 * */
// セッション終了時のハンドラー
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};
/* *
 * インテントリフレクターは、インタラクションモデルのテストとデバッグに使用されます。
 * これは単にユーザーが発話したインテントを繰り返すだけです。カスタムハンドラーは
 * 上記で定義し、下記のリクエストハンドラーチェーンに追加することで作成できます
 * */
// インテントリフレクターハンドラー（デバッグ用）
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};
/* *
 * 構文やルーティングのエラーを捕捉するための汎用的なエラー処理です。
 * リクエストハンドラーチェーンが見つからないというエラーを受け取った場合、
 * 呼び出されたインテントのハンドラーが実装されていないか、
 * 以下のスキルビルダーに含まれていないことを意味します
 * */
// エラーハンドラー（全般的なエラー処理）
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

/* *
 * このハンドラーはスキルのエントリーポイントとして機能し、すべてのリクエストとレスポンスの
 * ペイロードを上記のハンドラーにルーティングします。新しく定義したハンドラーやインターセプターが
 * 以下に含まれていることを確認してください。順序は重要です - 上から下に処理されます
 * */
// スキルのメインエントリーポイント
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        ChatGPTIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    .withCustomUserAgent('sample/hello-world/v1.2')
    .lambda();
