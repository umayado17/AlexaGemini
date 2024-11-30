// AWS SDKをインポート
const AWS = require('aws-sdk');

// AWS S3クライアントを初期化（署名バージョン4を使用）
const s3SigV4Client = new AWS.S3({
    signatureVersion: 'v4',
    region: process.env.S3_PERSISTENCE_REGION
});

// S3の署名付きURLを取得する関数をエクスポート
module.exports.getS3PreSignedUrl = function getS3PreSignedUrl(s3ObjectKey) {

    // 環境変数からS3バケット名を取得
    const bucketName = process.env.S3_PERSISTENCE_BUCKET;
    // S3オブジェクトの署名付きURLを生成
    const s3PreSignedUrl = s3SigV4Client.getSignedUrl('getObject', {
        Bucket: bucketName,
        Key: s3ObjectKey,
        Expires: 60*1 // 有効期限を1分に設定
    });
    // 生成されたURLをログに出力
    console.log(`Util.s3PreSignedUrl: ${s3ObjectKey} URL ${s3PreSignedUrl}`);
    // 署名付きURLを返却
    return s3PreSignedUrl;

}