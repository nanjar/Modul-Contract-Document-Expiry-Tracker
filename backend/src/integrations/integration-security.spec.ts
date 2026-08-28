describe('Telegram integration configuration', () => {
  const loadConfig = () => {
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../config/configuration').default();
  };

  afterEach(() => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_DEFAULT_CHAT_ID;
  });

  it('loads Telegram parameters from environment variables', () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    process.env.TELEGRAM_DEFAULT_CHAT_ID = '123456';

    const config = loadConfig();

    expect(config.telegram).toEqual({
      botToken: 'test-token',
      defaultChatId: '123456',
    });
  });

  it('does not expose Telegram parameters through the n8n configuration', () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    process.env.TELEGRAM_DEFAULT_CHAT_ID = '123456';

    const config = loadConfig();

    expect(config.n8n).not.toHaveProperty('botToken');
    expect(config.n8n).not.toHaveProperty('defaultChatId');
  });
});
