// LLMの設定を一元管理するオブジェクト
module.exports = {
    // 各LLMのAPI設定
    llm_configs: {
        chatgpt: {
            api_key: 'ここにOpenAI APIキーを入れる',
            model: 'gpt-4o-mini',
            system_message: '200字以内で答えて。漢字の読み方を間違えないようにふりがなを振ってください。'
        },
        gemini: {
            api_key: 'ここにGemini APIキーを入れる',
            model: 'gemini-1.5-flash',
            system_message: '200字以内で答えて。漢字の読み方を間違えないようにふりがなを振ってください。'
        },
        claude: {
            api_key: 'ここにClaude APIキーを入れる',
            model: 'claude-3-5-haiku-latest',
            system_message: '200字以内で答えて。漢字の読み方を間違えないようにふりがなを振ってください。'
        }
    },

    // デフォルトで使用するLLM
    default_llm: 'gemini',

    // LLMの選択が有効かどうか
    enable_llm_selection: true
};