const { Telegraf } = require('telegraf');
const { processMessage, setModel, getModel } = require('./ai');
const ElsaTask = require('./models/ElsaTask');

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
      'Commands (no AI, instant):\n' +
      '*/list* — show all tasks\n' +
      '*/add <title>* — add a task\n' +
      '*/done <id>* — mark done\n' +
      '*/undo <id>* — reopen\n' +
      '*/delete <id>* — remove\n\n' +
      'Or just chat naturally and I\'ll use AI to help.',
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('list', async (ctx) => {
    try {
      const tasks = await ElsaTask.find().sort({ createdAt: -1 });
      if (tasks.length === 0) return ctx.reply('No tasks yet. Use /add to create one.');

      const pending = tasks.filter(t => !t.completed);
      const done = tasks.filter(t => t.completed);

      const pendingLines = pending.map(t => `▫️ \`${t._id.toString().slice(-4)}\` ${t.title}`);
      const doneLines = done.map(t => `✅ \`${t._id.toString().slice(-4)}\` ${t.title}`);

      const msg = [
        pending.length ? `📋 *Pending (${pending.length})*\n${pendingLines.join('\n')}` : '',
        done.length ? `\n✅ *Done (${done.length})*\n${doneLines.join('\n')}` : '',
      ].filter(Boolean).join('\n');

      await ctx.reply(msg, { parse_mode: 'Markdown' });
    } catch {
      await ctx.reply('Failed to load tasks.');
    }
  });

  bot.command('add', async (ctx) => {
    const title = ctx.message.text.replace(/^\/add\s*/, '').trim();
    if (!title) return ctx.reply('Usage: /add <task title>');

    try {
      const task = new ElsaTask({ title });
      const saved = await task.save();
      await ctx.reply(`✅ Added: *${saved.title}* (ID: \`${saved._id.toString().slice(-4)}\`)`, { parse_mode: 'Markdown' });
    } catch {
      await ctx.reply('Failed to create task.');
    }
  });

  bot.command('done', async (ctx) => {
    const idSuffix = ctx.message.text.replace(/^\/done\s*/, '').trim();
    if (!idSuffix) return ctx.reply('Usage: /done <id>');

    try {
      const task = await matchTask(idSuffix);
      if (!task) return ctx.reply('Task not found. Use /list to see IDs.');

      task.completed = true;
      task.completedAt = new Date();
      await task.save();
      await ctx.reply(`✅ Marked done: *${task.title}*`, { parse_mode: 'Markdown' });
    } catch {
      await ctx.reply('Failed to update task.');
    }
  });

  bot.command('undo', async (ctx) => {
    const idSuffix = ctx.message.text.replace(/^\/undo\s*/, '').trim();
    if (!idSuffix) return ctx.reply('Usage: /undo <id>');

    try {
      const task = await matchTask(idSuffix);
      if (!task) return ctx.reply('Task not found. Use /list to see IDs.');

      task.completed = false;
      task.completedAt = null;
      await task.save();
      await ctx.reply(`↩️ Reopened: *${task.title}*`, { parse_mode: 'Markdown' });
    } catch {
      await ctx.reply('Failed to update task.');
    }
  });

  bot.command('delete', async (ctx) => {
    const idSuffix = ctx.message.text.replace(/^\/delete\s*/, '').trim();
    if (!idSuffix) return ctx.reply('Usage: /delete <id>');

    try {
      const task = await matchTask(idSuffix);
      if (!task) return ctx.reply('Task not found. Use /list to see IDs.');

      const title = task.title;
      await ElsaTask.findByIdAndDelete(task._id);
      await ctx.reply(`🗑️ Deleted: *${title}*`, { parse_mode: 'Markdown' });
    } catch {
      await ctx.reply('Failed to delete task.');
    }
  });

  bot.command('model', async (ctx) => {
    const arg = ctx.message.text.replace(/^\/model\s*/, '').trim();
    if (!arg) {
      return ctx.reply(`Current model: \`${getModel()}\`\nUsage: /model <name>`, { parse_mode: 'Markdown' });
    }
    setModel(arg);
    await ctx.reply(`Model switched to \`${arg}\``, { parse_mode: 'Markdown' });
  });

  bot.command('debug', async (ctx) => {
    const key = process.env.GEMINI_API_KEY;
    const botToken = process.env.BOT_TOKEN;
    const parts = [
      `🤖 *Bot Token:* ${botToken ? '✅ set' : '❌ missing'}`,
      `🔑 *Gemini Key:* ${key ? `✅ set (\`${key.slice(0, 4)}...${key.slice(-4)}\`)` : '❌ missing'}`,
      `📡 *NODE_ENV:* ${process.env.NODE_ENV || 'not set'}`,
    ];
    await ctx.reply(parts.join('\n'), { parse_mode: 'Markdown' });
  });

  bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return;
    try {
      ctx.sendChatAction('typing');
      const reply = await processMessage(ctx.message.text);
      if (reply) await ctx.reply(reply, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('AI error:', err.message);
      await ctx.reply(
        `⚠️ *AI Error:* \`${err.message}\`\n\n` +
        'Type /debug to check environment variables.',
        { parse_mode: 'Markdown' }
      );
    }
  });

  try {
    bot.launch();
    console.log('Telegram bot started (commands + AI)');
  } catch (err) {
    console.error('Telegram bot failed to start:', err.message);
  }

  process.once('SIGTERM', () => bot?.stop?.());
  process.once('SIGINT', () => bot?.stop?.());
}

async function matchTask(suffix) {
  const tasks = await ElsaTask.find();
  return tasks.find(t => t._id.toString().endsWith(suffix));
}

module.exports = { start };
