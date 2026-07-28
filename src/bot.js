const { Telegraf } = require('telegraf');
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
      '🧠 *ELSA Task Bot*\n\n' +
      'Manage your work tasks from Telegram.\n\n' +
      '*/list* — show all tasks\n' +
      '*/add <title>* — add a new task\n' +
      '*/done <id>* — mark task complete\n' +
      '*/undo <id>* — unmark task\n' +
      '*/delete <id>* — remove a task',
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('list', async (ctx) => {
    try {
      const tasks = await ElsaTask.find().sort({ createdAt: -1 });
      if (tasks.length === 0) {
        return ctx.reply('No tasks yet. Use /add to create one.');
      }

      const pending = tasks.filter(t => !t.completed);
      const done = tasks.filter(t => t.completed);

      const pendingLines = pending.map(t => `▫️ \`${t._id.toString().slice(-4)}\` ${t.title}`);
      const doneLines = done.map(t => `✅ \`${t._id.toString().slice(-4)}\` ${t.title}`);

      const msg = [
        pending.length ? `📋 *Pending (${pending.length})*\n${pendingLines.join('\n')}` : '',
        done.length ? `\n✅ *Done (${done.length})*\n${doneLines.join('\n')}` : '',
      ].filter(Boolean).join('\n');

      await ctx.reply(msg, { parse_mode: 'Markdown' });
    } catch (err) {
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
    } catch (err) {
      await ctx.reply('Failed to create task.');
    }
  });

  bot.command('done', async (ctx) => {
    const idSuffix = ctx.message.text.replace(/^\/done\s*/, '').trim();
    if (!idSuffix) return ctx.reply('Usage: /done <id> (last 4 chars of task ID from /list)');

    try {
      const task = await matchTask(idSuffix);
      if (!task) return ctx.reply('Task not found. Use /list to see valid IDs.');

      task.completed = true;
      task.completedAt = new Date();
      await task.save();
      await ctx.reply(`✅ Marked done: *${task.title}*`, { parse_mode: 'Markdown' });
    } catch (err) {
      await ctx.reply('Failed to update task.');
    }
  });

  bot.command('undo', async (ctx) => {
    const idSuffix = ctx.message.text.replace(/^\/undo\s*/, '').trim();
    if (!idSuffix) return ctx.reply('Usage: /undo <id> (last 4 chars of task ID from /list)');

    try {
      const task = await matchTask(idSuffix);
      if (!task) return ctx.reply('Task not found. Use /list to see valid IDs.');

      task.completed = false;
      task.completedAt = null;
      await task.save();
      await ctx.reply(`↩️ Reopened: *${task.title}*`, { parse_mode: 'Markdown' });
    } catch (err) {
      await ctx.reply('Failed to update task.');
    }
  });

  bot.command('delete', async (ctx) => {
    const idSuffix = ctx.message.text.replace(/^\/delete\s*/, '').trim();
    if (!idSuffix) return ctx.reply('Usage: /delete <id> (last 4 chars of task ID from /list)');

    try {
      const task = await matchTask(idSuffix);
      if (!task) return ctx.reply('Task not found. Use /list to see valid IDs.');

      const title = task.title;
      await ElsaTask.findByIdAndDelete(task._id);
      await ctx.reply(`🗑️ Deleted: *${title}*`, { parse_mode: 'Markdown' });
    } catch (err) {
      await ctx.reply('Failed to delete task.');
    }
  });

  bot.launch();
  console.log('Telegram bot started (polling)');
}

async function matchTask(suffix) {
  const tasks = await ElsaTask.find();
  return tasks.find(t => t._id.toString().endsWith(suffix));
}

module.exports = { start };
