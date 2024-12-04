// Alexa Skills Kit SDK (v2)を使用したAlexaスキルのインテント処理サンプル
// 必要なモジュールをインポート
const Alexa = require('ask-sdk-core');
const config = require('./keys.js');
const axios = require('axios');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

// セッション属性から現在選択されているLLMを取得する関数
const getSelectedLLM = (handlerInput) => {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    return attributes.selectedLLM || config.default_llm;
};

// セッション属性に選択されたLLMを保存する関数
const setSelectedLLM = (handlerInput, llmType) => {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    attributes.selectedLLM = llmType;
    handlerInput.attributesManager.setSessionAttributes(attributes);
};

// セッション属性に会話履歴を保存・取得する関数を追加
const getConversationHistory = (handlerInput) => {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    return attributes.conversationHistory || [];
};

const updateConversationHistory = (handlerInput, newMessage) => {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const history = attributes.conversationHistory || [];
    history.push(newMessage);
    
    // 履歴を最新の5件に制限
    if (history.length > 5) {
        history.shift();
    }
    
    attributes.conversationHistory = history;
    handlerInput.attributesManager.setSessionAttributes(attributes);
};

// Gemini APIを呼び出して応答を取得する関数を改善
async function callGeminiAPI(prompt, handlerInput) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.llm_configs.gemini.model}:generateContent?key=${config.llm_configs.gemini.api_key}`;
    
    // 会話履歴を取得
    const history = getConversationHistory(handlerInput);
    
    // システムメッセージとこれまでの会話履歴を含めたメッセージを構築
    const formattedMessages = [
        {
            role: 'user',
            parts: [{
                text: `Instructions: ${config.llm_configs.gemini.system_message}`
            }]
        },
        // 会話履歴を追加
        ...history.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{
                text: msg.content
            }]
        })),
        // 新しいプロンプトを追加
        {
            role: 'user',
            parts: [{
                text: prompt
            }]
        }
    ];

    const data = {
        contents: formattedMessages,
        generationConfig: {
            maxOutputTokens: 800,
            temperature: 0.7,
            topP: 0.8,
            topK: 40
        },
        safetySettings: [
            {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
        ]
    };

    try {
        console.log('Sending to Gemini:', JSON.stringify(formattedMessages, null, 2));
        
        const response = await axios.post(url, data, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.data.candidates || !response.data.candidates[0]?.content?.parts?.[0]?.text) {
            console.error('Unexpected Gemini response:', JSON.stringify(response.data, null, 2));
            throw new Error('Invalid response format from Gemini API');
        }

        const responseText = response.data.candidates[0].content.parts[0].text;
        
        // 会話履歴を更新
        updateConversationHistory(handlerInput, { role: 'user', content: prompt });
        updateConversationHistory(handlerInput, { role: 'assistant', content: responseText });

        return responseText;
    } catch (error) {
        console.error('Error calling Gemini API:', error.response?.data || error.message);
        throw error;
    }
}

// ChatGPT APIを呼び出して応答を取得する関数
async function callChatGPTAPI(prompt) {
    // OpenAIクライアントを初期化
    const openai = new OpenAI({ apiKey: config.llm_configs.chatgpt.api_key });
    try {
        // チャット完了リクエストを作成
        const response = await openai.chat.completions.create({
            model: config.llm_configs.chatgpt.model,
            messages: [
                { role: 'system', content: config.llm_configs.chatgpt.system_message },
                { role: 'user', content: prompt }
            ]
        });
        return response.choices[0].message.content;
    } catch (error) {
        // エラーをログに記録し、上位に伝播
        console.error('Error calling ChatGPT API:', error);
        throw error;
    }
}

// Claude APIを呼び出して応答を取得する関数
async function callClaudeAPI(prompt) {
    // Anthropicクライアントを初期化
    const claude = new Anthropic({ apiKey: config.llm_configs.claude.api_key });
    try {
        // メッセージ生成リクエストを作成
        const response = await claude.messages.create({
            model: config.llm_configs.claude.model,
            system: config.llm_configs.claude.system_message,
            messages: [{ role: 'user', content: prompt }]
        });
        return response.content[0].text;
    } catch (error) {
        // エラーをログに記録し、上位に伝播
        console.error('Error calling Claude API:', error);
        throw error;
    }
}

// APIキーが有効に設定されているかチェックする関数
function isValidApiKey(llmType) {
    const apiKey = config.llm_configs[llmType].api_key;
    switch (llmType) {
        case 'chatgpt':
            return !apiKey.includes('OpenAI');
        case 'gemini':
            return !apiKey.includes('Gemini');
        case 'claude':
            return !apiKey.includes('Claude');
        default:
            return false;
    }
}

// LLM切り替えインテントを処理するハンドラー
const ChangeLLMIntentHandler = {
    // このハンドラーが処理すべきリクエストかどうかを判定
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ChangeLLMIntent';
    },
    // LLM切り替えの実際の処理を行う
    handle(handlerInput) {
        // スロットから指定されたLLM名を取得
        const llmSlot = Alexa.getSlotValue(handlerInput.requestEnvelope, 'llm_type');
        
        // 日本語LLM名を内部識別子にマッピング
        const llmMapping = {
            'クロード': 'claude',
            'チャットジーピーティー': 'chatgpt',
            'チャットgpt': 'chatgpt',
            'ジェミニ': 'gemini'
        };
        
        // マッピングされた識別子を取得
        const llmType = llmMapping[llmSlot.toLowerCase()] || llmSlot.toLowerCase();
        
        // 指定されたLLMが存在するかチェック
        if (!config.llm_configs[llmType]) {
            return handlerInput.responseBuilder
                .speak(`申し訳ありません。${llmSlot}は利用できません。ChatGPT、Claude、またはGeminiを指定してください。`)
                .reprompt('他のAIモデルを指定してください。')
                .getResponse();
        }

        // APIキーが有効かチェック
        if (!isValidApiKey(llmType)) {
            const llmNames = {
                'chatgpt': 'ChatGPT',
                'gemini': 'Gemini',
                'claude': 'Claude'
            };
            return handlerInput.responseBuilder
                .speak(`${llmNames[llmType]}のAPIキーが設定されていませんので、このAIモデルには切り替えられません。`)
                .reprompt('他のAIモデルを指定してください。')
                .getResponse();
        }

        // 選択されたLLMをセッションに保存
        setSelectedLLM(handlerInput, llmType);
        const llmNames = {
            'chatgpt': 'ChatGPT',
            'gemini': 'Gemini',
            'claude': 'Claude'
        };
        // 切り替え完了応答を返す
        return handlerInput.responseBuilder
            .speak(`${llmNames[llmType]}モードに切り替えました。`)
            .reprompt('質問してください。')
            .getResponse();
    }
};

// 質問応答インテントを処理するハンドラー
const ChatGPTIntentHandler = {
    // このハンドラーが処理すべきリクエストかどうかを判定
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ChatGPTIntent';
    },
    // 質問応答の実際の処理を行う
    async handle(handlerInput) {
        try {
            const question = Alexa.getSlotValue(handlerInput.requestEnvelope, 'question');
            const llmType = getSelectedLLM(handlerInput);

            if (!isValidApiKey(llmType)) {
                const llmNames = {
                    'chatgpt': 'ChatGPT',
                    'gemini': 'Gemini',
                    'claude': 'Claude'
                };
                return handlerInput.responseBuilder
                    .speak(`${llmNames[llmType]}のAPIキーが設定されていません。別のLLMに切り替えてください。`)
                    .getResponse();
            }

            let response;
            switch (llmType) {
                case 'chatgpt':
                    response = await callChatGPTAPI(question);
                    break;
                case 'claude':
                    response = await callClaudeAPI(question);
                    break;
                case 'gemini':
                default:
                    response = await callGeminiAPI(question, handlerInput);  // handlerInputを渡す
                    break;
            }

            return handlerInput.responseBuilder
                .speak(response)
                .reprompt('他に質問はありますか？')
                .getResponse();
        } catch (error) {
            console.error('Error:', error);
            return handlerInput.responseBuilder
                .speak('申し訳ありません。エラーが発生しました。')
                .getResponse();
        }
    }
};

// スキル起動時のリクエストを処理するハンドラー
const LaunchRequestHandler = {
    // このハンドラーが処理すべきリクエストかどうかを判定
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    // 起動時の応答を返す
    handle(handlerInput) {
        const speakOutput = 'ようこそ。質問してください。';
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// セッション終了時のリクエストを処理するハンドラー
const SessionEndedRequestHandler = {
    // このハンドラーが処理すべきリクエストかどうかを判定
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    // セッション終了時の処理を行う
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        return handlerInput.responseBuilder.getResponse();
    }
};

// エラー発生時のリクエストを処理するハンドラー
const ErrorHandler = {
    // すべてのエラーをキャッチ
    canHandle() {
        return true;
    },
    // エラー時の応答を返す
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);
        const speakOutput = '申し訳ありません。エラーが発生しました。もう一度お試しください。';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// Lambdaハンドラーの設定
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        ChangeLLMIntentHandler,
        ChatGPTIntentHandler,
        // ... その他のハンドラー
        SessionEndedRequestHandler
    )
    .addErrorHandlers(ErrorHandler)
    .lambda();
