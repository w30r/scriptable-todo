const express = require('express');
const router = express.Router();
const ElsaCard = require('../models/ElsaCard');

const CAT_LABELS = {
  role: 'Role & Responsibilities',
  project: 'Projects & Tasks',
  workflow: 'Workflows & SOPs',
  note: 'General Notes',
};

const CAT_COLORS = {
  role: '#0a84ff',
  project: '#30d158',
  workflow: '#ff9f0a',
  note: '#bf5af2',
};

function escHtml(s) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');
}

router.get('/', async (req, res) => {
  try {
    const cards = await ElsaCard.find().sort({ createdAt: -1 });
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export', async (req, res) => {
  try {
    const cards = await ElsaCard.find().sort({ createdAt: -1 });
    const cardsHtml = cards.map(c => {
      const label = CAT_LABELS[c.category] || 'Note';
      const color = CAT_COLORS[c.category] || '#bf5af2';
      const content = escHtml(c.content);
      return `<article>
  <header style="font-size:0.6rem;text-transform:uppercase;letter-spacing:0.5px;color:${color};margin-bottom:0.4rem">${label}</header>
  <h2 style="font-size:1.1rem;color:#f2f2f7;margin:0 0 0.3rem">${escHtml(c.title).replace(/<[^>]+>/g, '')}</h2>
  <div><p>${content}</p></div>
</article>`;
    }).join('\n');

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>ELSA — Work Knowledge Base</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#121214;color:#f2f2f7;padding:2rem;max-width:800px;margin:0 auto;line-height:1.6}
h1{font-size:1.8rem;margin-bottom:0.3rem;letter-spacing:-0.5px}
.sub{color:#636366;font-size:0.8rem;margin-bottom:2rem}
p{font-size:0.9rem;color:#aeaeb2;margin:0.3rem 0;line-height:1.6}
article{background:#1e1e20;border:1px solid #2e2e32;border-radius:12px;padding:1.25rem;margin-bottom:1rem}
ul{padding-left:1.2rem;color:#aeaeb2;margin:0.3rem 0}
li{margin-bottom:0.2rem}
strong{color:#f2f2f7}
</style>
</head>
<body>
<h1>ELSA</h1>
<div class="sub">Work Knowledge Base</div>
${cardsHtml}
</body>
</html>`;
    res.type('html').send(html);
  } catch (err) {
    res.status(500).type('html').send('<h1>Error</h1><p>Failed to generate export</p>');
  }
});

router.post('/', async (req, res) => {
  try {
    const card = new ElsaCard({
      title: req.body.title,
      category: req.body.category,
      content: req.body.content || ''
    });
    const saved = await card.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.category !== undefined) updates.category = req.body.category;
    if (req.body.content !== undefined) updates.content = req.body.content;

    const card = await ElsaCard.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json(card);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const card = await ElsaCard.findByIdAndDelete(req.params.id);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json({ message: 'Card deleted', card });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
