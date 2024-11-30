// ChatGPT用の設定（参考用）
/*
module.exports.OPEN_AI_KEY = 'ここにAPIキーを入れる';
module.exports.system_message = '40文字以内で答えて。';
module.exports.model = 'gpt-3.5-turbo';
*/

// Gemini用の新しい設定
module.exports = {
    GEMINI_API_KEY: 'あなたのGemini APIキー',
//    model: 'gemini-1.5-pro',
    model: 'gemini-1.5-flash',
    system_message: '２００字以内で答えて。漢字の読み方を間違えないようにふりがなを振ってください。'
};