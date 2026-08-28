describe('Telegram configuration contract', () => {
  it('uses deployment environment variables rather than hardcoded credentials', () => {
    const source = require('fs').readFileSync(
      require('path').join(__dirname, '../config/configuration.ts'),
      'utf8',
    );

    expect(source).toContain('process.env.TELEGRAM_BOT_TOKEN');
    expect(source).toContain('process.env.TELEGRAM_DEFAULT_CHAT_ID');
    expect(source).not.toMatch(/TELEGRAM_BOT_TOKEN\s*:\s*["'`][^"'`]+["'`]/);
  });
});
