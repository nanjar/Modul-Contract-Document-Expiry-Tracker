export default () => ({
  n8n: {
    webhookUrl: process.env.N8N_WEBHOOK_URL,
    webhookSecret: process.env.N8N_WEBHOOK_SECRET,
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    defaultChatId: process.env.TELEGRAM_DEFAULT_CHAT_ID,
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'us-east-1',
    bucket: process.env.S3_BUCKET,
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
    maxFileSizeMb: Number(process.env.S3_MAX_FILE_SIZE_MB || 20),
  },
});
