/* *
 * このサンプルは、Alexa Skills Kit SDK (v2)を使用してAlexaスキルのインテントを処理する方法を示しています。
 * スロット、ダイアログ管理、セッション永続化、APIコールなどの実装例については、
 * https://alexa.design/cookbook をご覧ください。
 * */
// 必要なモジュールをインポート
const Alexa = require('ask-sdk-core');
const config = require('./keys.js');
const axios = require('axios');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

// セッション属性の管理
const getSelectedLLM = (handlerInput) => {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    return attributes.selectedLLM || config.default_llm;
};

const setSelectedLLM = (handlerInput, llmType) => {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    attributes.selectedLLM = llmType;
    handlerInput.attributesManager.setSessionAttributes(attributes);
};

// Gemini APIを呼び出す関数（既存のコード）
async function callGeminiAPI(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.llm_configs.gemini.api_key}`;
    const data = {
        contents: [{
            parts: [{
                text: config.llm_configs.gemini.system_message + "\n" + prompt
            }]
        }]
    };

    try {
        const response = await axios.post(url, data);
        return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw error;
    }
}

// ChatGPT APIを呼び出す関数
async function callChatGPTAPI(prompt) {
    const openai = new OpenAI({ apiKey: config.llm_configs.chatgpt.api_key });
    try {
        const response = await openai.chat.completions.create({
            model: config.llm_configs.chatgpt.model,
            messages: [
                { role: 'system', content: config.llm_configs.chatgpt.system_message },
                { role: 'user', content: prompt }
            ]
        });
        return response.choices[0].message.content;
    } catch (error) {
        console.error('Error calling ChatGPT API:', error);
        throw error;
    }
}

// Claude APIを呼び出す関数
async function callClaudeAPI(prompt) {
    const claude = new Anthropic({ apiKey: config.llm_configs.claude.api_key });
    try {
        const response = await claude.messages.create({
            model: config.llm_configs.claude.model,
            system: config.llm_configs.claude.system_message,
            messages: [{ role: 'user', content: prompt }]
        });
        return response.content[0].text;
    } catch (error) {
        console.error('Error calling Claude API:', error);
        throw error;
    }
}

// APIキーが設定されているかチェックする関数
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

// LLMの切り替えインテントハンドラーを修正
const ChangeLLMIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ChangeLLMIntent';
    },
    handle(handlerInput) {
        const llmSlot = Alexa.getSlotValue(handlerInput.requestEnvelope, 'llm_type');
        
        // LLM名のマッピング
        const llmMapping = {
            'クロード': 'claude',
            'チャットジーピーティー': 'chatgpt',
            'チャットgpt': 'chatgpt',
            'ジェミニ': 'gemini'
        };
        
        const llmType = llmMapping[llmSlot.toLowerCase()] || llmSlot.toLowerCase();
        
        // LLMタイプの存在チェック
        if (!config.llm_configs[llmType]) {
            return handlerInput.responseBuilder
                .speak(`申し訳ありません。${llmSlot}は利用できません。ChatGPT、Claude、またはGeminiを指定してください。`)
                .reprompt('他のAIモデルを指定してください。')
                .getResponse();
        }

        // APIキーの有効性チェック
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

        setSelectedLLM(handlerInput, llmType);
        const llmNames = {
            'chatgpt': 'ChatGPT',
            'gemini': 'Gemini',
            'claude': 'Claude'
        };
        return handlerInput.responseBuilder
            .speak(`${llmNames[llmType]}モードに切り替えました。`)
            .reprompt('質問してください。')
            .getResponse();
    }
};

// 質問応答インテントハンドラーも修正
const ChatGPTIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ChatGPTIntent';
    },
    async handle(handlerInput) {
        try {
            const question = Alexa.getSlotValue(handlerInput.requestEnvelope, 'question');
            const llmType = getSelectedLLM(handlerInput);

            // 選択されているLLMのAPIキーが無効な場合
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
                    response = await callGeminiAPI(question);
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

// LaunchRequestHandlerを追加
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'ようこそ。質問してください。';
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// SessionEndedRequestHandlerも追加
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        return handlerInput.responseBuilder.getResponse();
    }
};

// ErrorHandlerも追加
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);
        const speakOutput = '申し訳ありません。エラーが発生しました。もう一度お試しください。';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

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
