const { GoogleGenerativeAI } = require('@google/generative-ai');
const ElsaTask = require('./models/ElsaTask');
const ElsaContext = require('./models/ElsaContext');

const tools = [
  {
    functionDeclarations: [
      {
        name: 'listElsaTasks',
        description: 'List Elsa tasks. Optionally filter by completion status.',
        parameters: {
          type: 'object',
          properties: {
            completed: { type: 'boolean', description: 'true for done tasks, false for pending, omit for all' }
          }
        }
      },
      {
        name: 'addElsaTask',
        description: 'Create a new Elsa task',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Task title' }
          },
          required: ['title']
        }
      },
      {
        name: 'updateElsaTask',
        description: 'Update an Elsa task (title, completion status)',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Task ID (full MongoDB _id)' },
            title: { type: 'string', description: 'New task title' },
            completed: { type: 'boolean', description: 'true to mark done, false to reopen' }
          },
          required: ['id']
        }
      },
      {
        name: 'deleteElsaTask',
        description: 'Delete an Elsa task by ID',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Task ID (full MongoDB _id)' }
          },
          required: ['id']
        }
      },
      {
        name: 'getTaskCounts',
        description: 'Get counts of pending and completed Elsa tasks',
        parameters: { type: 'object', properties: {} }
      },
      {
        name: 'listElsaContextCards',
        description: 'List Elsa context cards. Optionally filter by category.',
        parameters: {
          type: 'object',
          properties: {
            category: { type: 'string', enum: ['role', 'project', 'workflow', 'note'], description: 'Card category' }
          }
        }
      },
      {
        name: 'searchElsaContextCards',
        description: 'Search Elsa context cards by text in title or content',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search text' }
          },
          required: ['query']
        }
      },
      {
        name: 'getCardCounts',
        description: 'Get counts of Elsa context cards per category',
        parameters: { type: 'object', properties: {} }
      }
    ]
  }
];

const handlers = {
  async listElsaTasks(args) {
    const filter = args && args.completed !== undefined ? { completed: args.completed } : {};
    const tasks = await ElsaTask.find(filter).sort({ createdAt: -1 });
    return tasks.map(t => ({ id: t._id.toString(), title: t.title, completed: t.completed, completedAt: t.completedAt }));
  },

  async addElsaTask(args) {
    const task = new ElsaTask({ title: args.title });
    const saved = await task.save();
    return { id: saved._id.toString(), title: saved.title, completed: false };
  },

  async updateElsaTask(args) {
    const update = {};
    if (args.title !== undefined) update.title = args.title;
    if (args.completed !== undefined) {
      update.completed = args.completed;
      update.completedAt = args.completed ? new Date() : null;
    }
    const task = await ElsaTask.findByIdAndUpdate(args.id, update, { new: true, runValidators: true });
    if (!task) throw new Error('Task not found');
    return { id: task._id.toString(), title: task.title, completed: task.completed, completedAt: task.completedAt };
  },

  async deleteElsaTask(args) {
    const task = await ElsaTask.findByIdAndDelete(args.id);
    if (!task) throw new Error('Task not found');
    return { deleted: task.title };
  },

  async getTaskCounts() {
    const all = await ElsaTask.find();
    return {
      total: all.length,
      pending: all.filter(t => !t.completed).length,
      done: all.filter(t => t.completed).length
    };
  },

  async listElsaContextCards(args) {
    const filter = args && args.category ? { category: args.category } : {};
    const cards = await ElsaContext.find(filter).sort({ createdAt: -1 });
    return cards.map(c => ({
      id: c._id.toString(),
      title: c.title,
      category: c.category,
      content: c.content
    }));
  },

  async searchElsaContextCards(args) {
    const query = args.query;
    const cards = await ElsaContext.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } }
      ]
    }).sort({ createdAt: -1 });
    return cards.map(c => ({
      id: c._id.toString(),
      title: c.title,
      category: c.category,
      content: c.content
    }));
  },

  async getCardCounts() {
    const all = await ElsaContext.find();
    const byCategory = {};
    for (const c of all) {
      byCategory[c.category] = (byCategory[c.category] || 0) + 1;
    }
    return { total: all.length, byCategory };
  }
};

async function processMessage(userMessage) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash', tools });

  const chat = model.startChat({
    history: [
      {
        role: 'user',
        parts: [{ text: 'You are ELSA, an AI work assistant. You manage Elsa tasks (work to-dos) and Elsa context cards (knowledge base). Be concise and helpful. Use the available tools to look up or modify data when needed.' }]
      },
      {
        role: 'model',
        parts: [{ text: 'Understood. I am ELSA, your work assistant. I can help with tasks and context cards.' }]
      }
    ]
  });

  let response = await chat.sendMessage(userMessage);
  let fn = response.response.functionCall();

  while (fn) {
    const handler = handlers[fn.name];
    if (!handler) throw new Error(`Unknown function: ${fn.name}`);

    const result = await handler(fn.args);
    const resultResponse = await chat.sendMessage([{ functionResponse: { name: fn.name, response: { result } } }]);
    fn = resultResponse.response.functionCall();
    response = resultResponse;
  }

  return response.response.text();
}

module.exports = { processMessage };
