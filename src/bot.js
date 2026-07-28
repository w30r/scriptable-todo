const { Telegraf } = require('telegraf');
const { processMessage } = require('./ai');

let bot = null;

function start() {
  const TOKEN = process.env.BOT_TOKEN;
  if (!TOKEN) {
    console.warn('BOT_TOKEN not set — Telegram bot disabled');
    return;
  }

  bot = new Telegraf(TOKEN);

  bot.start(async (ctx) => {
    await ctx.reply(
      '🧠 *ELSA — AI Work Assistant*\n\n' +
      'I\'m here to help with your work tasks and knowledge cards. ' +
      'Just chat naturally — no commands needed.\n\n' +
      '*Examples:*\n' +
      '• "what tasks do I have?"\n' +
      '• "add review Q3 report"\n' +
      '• "mark the deployment task as done"\n' +
      '• "show me my workflow docs"\n' +
      '• "how many cards do I have?"',
      { parse_mode: 'Markdown' }
    );
  });

  bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    if (!text.startsWith('/')) {
      try {
        ctx.sendChatAction('typing');
        const reply = await processMessage(text);
        if (reply) {
          await ctx.reply(reply, { parse_mode: 'Markdown' });
        }
      } catch (err) {
        console.error('AI error:', err.message);
        await ctx.reply(
          'I couldn\'t process that right now. Make sure `GEMINI_API_KEY` is set in `.env`.\n\n' +
          'Type /start to see what I can do.',
          { parse_mode: 'Markdown' }
        );
      }
    }
  });

  bot.launch();
  console.log('Telegram bot started (AI polling)');
}

module.exports = { start };
