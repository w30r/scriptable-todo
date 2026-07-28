const { Telegraf } = require('telegraf');
const { processMessage, setModel, getModel } = require('./ai');
const ElsaTask = require('./models/ElsaTask');
const TimesheetEntry = require('./models/TimesheetEntry');

let bot = null;
const sessions = new Map();
const SYSTEM_PROMPT = { role: 'system', content: 'You are ELSA, an AI work assistant. You manage Elsa tasks (work to-dos), Elsa context cards (knowledge base), and timesheet entries (daily work logs). Be concise and helpful. Use the available tools to look up or modify data when needed.' };
const MAX_SESSION_MSGS = 20;

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
      '*/delete <id>* — remove\n' +
      '*/eod <text>* — log today\'s work\n' +
      '*/timesheet <date>* — show entries\n\n' +
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

  function todayStr() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  bot.command('eod', async (ctx) => {
    const text = ctx.message.text.replace(/^\/eod\s*/, '').trim();
    if (!text) {
      const entries = await TimesheetEntry.find({ date: todayStr() }).sort({ createdAt: -1 });
      if (entries.length === 0) return ctx.reply('No entries for today yet. Use `/eod <text>` to log.', { parse_mode: 'Markdown' });
      const lines = entries.map(e => `\`${e.createdAt ? new Date(e.createdAt).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }) : ''}\` ${e.text}`);
      await ctx.reply(`📋 *Today (${todayStr()})*\n${lines.join('\n')}`, { parse_mode: 'Markdown' });
      return;
    }
    try {
      const entry = new TimesheetEntry({ date: todayStr(), text });
      const saved = await entry.save();
      await ctx.reply(`✅ Logged for *${saved.date}*: "${saved.text}"`, { parse_mode: 'Markdown' });
    } catch {
      await ctx.reply('Failed to log entry.');
    }
  });

  bot.command('timesheet', async (ctx) => {
    const arg = ctx.message.text.replace(/^\/timesheet\s*/, '').trim();
    const date = arg || todayStr();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return ctx.reply('Usage: /timesheet YYYY-MM-DD');
    try {
      const entries = await TimesheetEntry.find({ date }).sort({ createdAt: -1 });
      if (entries.length === 0) return ctx.reply('No entries for *' + date + '*.', { parse_mode: 'Markdown' });
      const lines = entries.map(e => {
        const time = e.createdAt ? new Date(e.createdAt).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }) : '';
        return '`' + time + '` ' + e.text + ' — `/delete-eod ' + e._id.toString().slice(-4) + '`';
      });
      await ctx.reply('📋 *Entries for ' + date + '*\n' + lines.join('\n'), { parse_mode: 'Markdown' });
    } catch {
      await ctx.reply('Failed to load entries.');
    }
  });

  bot.command('debug', async (ctx) => {
    const dsKey = process.env.DEEPSEEK_API_KEY;
    const botToken = process.env.BOT_TOKEN;
    const parts = [
      '🤖 *Bot Token:* ' + (botToken ? '✅ set' : '❌ missing'),
      '🧠 *Model:* `' + getModel() + '`',
      '🔑 *DeepSeek Key:* ' + (dsKey ? '✅ set (`' + dsKey.slice(0, 4) + '...' + dsKey.slice(-4) + '`)' : '❌ missing'),
      '📡 *NODE_ENV:* ' + (process.env.NODE_ENV || 'not set'),
    ];
    await ctx.reply(parts.join('\n'), { parse_mode: 'Markdown' });
  });
    if (ctx.message.text.startsWith('/')) return;
    const chatId = ctx.chat.id;
    try {
      ctx.sendChatAction('typing');

      let messages = sessions.get(chatId);
      if (!messages) {
        messages = [SYSTEM_PROMPT];
        sessions.set(chatId, messages);
      }

      messages.push({ role: 'user', content: ctx.message.text });

      const reply = await processMessage(messages);

      if (messages.length > MAX_SESSION_MSGS) {
        const sys = messages[0];
        messages = [sys, ...messages.slice(-(MAX_SESSION_MSGS - 1))];
        sessions.set(chatId, messages);
      }

      if (reply) await ctx.reply(reply, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('AI error:', err.message);
      sessions.delete(chatId);
      await ctx.reply(
        `⚠️ *AI Error:* \`${err.message}\`\n\n` +
        'Type /debug to check environment variables.',
        { parse_mode: 'Markdown' }
      );
    }
  });

  bot.launch().then(() => {
    console.log('Telegram bot started (commands + AI)');
  }).catch(err => {
    console.error('Telegram bot failed to start:', err.message);
  });

  process.once('SIGTERM', () => bot?.stop?.());
  process.once('SIGINT', () => bot?.stop?.());
}

async function matchTask(suffix) {
  const tasks = await ElsaTask.find();
  return tasks.find(t => t._id.toString().endsWith(suffix));
}

module.exports = { start };
