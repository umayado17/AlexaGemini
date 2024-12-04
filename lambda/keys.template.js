module.exports = {
    llm_configs: {
        chatgpt: {
            api_key: 'YOUR_OPENAI_API_KEY',
            model: 'gpt-4o-mini',
            system_message: '200字以内で答えて。漢字の読み方を間違えないようにふりがなを振ってください。'
        },
        gemini: {
            api_key: 'YOUR_GEMINI_API_KEY',
            model: 'gemini-1.5-flash',
            system_message: '200字以内で答えて。漢字の読み方を間違えないようにふりがなを振ってください。'
        },
        claude: {
            api_key: 'YOUR_CLAUDE_API_KEY',
            model: 'claude-3-5-haiku-latest',
            system_message: '200字以内で答えて。漢字の読み方を間違えないようにふりがなを振ってください。'
        }
    },
    default_llm: 'gemini',
    enable_llm_selection: true
}; 