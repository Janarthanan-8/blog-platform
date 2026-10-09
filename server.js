require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// ---------- Models ----------
const User = mongoose.model('User', new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
}));
const Post = mongoose.model('Post', new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  authorName: String
}, { timestamps: true }));
const Comment = mongoose.model('Comment', new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: String,
  text: { type: String, required: true }
}, { timestamps: true }));

// ---------- Helpers / middleware ----------
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);
const fail = (res, code, error) => res.status(code).json({ error });
const auth = (req, res, next) => {
  try {
    req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), JWT_SECRET);
    next();
  } catch { fail(res, 401, 'Please log in'); }
};
const sign = u => jwt.sign({ id: u._id, role: u.role, name: u.name }, JWT_SECRET, { expiresIn: '7d' });
const publicUser = u => ({ id: u._id, name: u.name, email: u.email, role: u.role });
// only the owner or an admin may change / delete
const canModify = (req, doc, ownerField) => req.user.role === 'admin' || String(doc[ownerField]) === req.user.id;

// ---------- Auth ----------
app.post('/api/auth/register', wrap(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6) return fail(res, 400, 'Name, email and a 6+ character password are required');
  if (await User.findOne({ email: email.toLowerCase() })) return fail(res, 400, 'Email already registered');
  const u = await User.create({ name, email, password: await bcrypt.hash(password, 10), role: 'user' });
  res.json({ token: sign(u), user: publicUser(u) });
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const u = await User.findOne({ email: (req.body.email || '').toLowerCase() });
  if (!u || !(await bcrypt.compare(req.body.password || '', u.password))) return fail(res, 400, 'Invalid email or password');
  res.json({ token: sign(u), user: publicUser(u) });
}));

// ---------- Posts ----------
app.get('/api/posts', wrap(async (req, res) => res.json(await Post.find().sort('-createdAt'))));

app.get('/api/posts/:id', wrap(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return fail(res, 404, 'Post not found');
  res.json({ post, comments: await Comment.find({ post: post._id }).sort('createdAt') });
}));

app.post('/api/posts', auth, wrap(async (req, res) => {
  const { title, content } = req.body;
  if (!title?.trim() || !content?.trim()) return fail(res, 400, 'Title and content are required');
  res.json(await Post.create({ title: title.trim(), content: content.trim(), author: req.user.id, authorName: req.user.name }));
}));

app.put('/api/posts/:id', auth, wrap(async (req, res) => {
  const p = await Post.findById(req.params.id);
  if (!p) return fail(res, 404, 'Post not found');
  if (!canModify(req, p, 'author')) return fail(res, 403, 'You can only edit your own posts');
  const { title, content } = req.body;
  if (!title?.trim() || !content?.trim()) return fail(res, 400, 'Title and content are required');
  p.title = title.trim(); p.content = content.trim();
  res.json(await p.save());
}));

app.delete('/api/posts/:id', auth, wrap(async (req, res) => {
  const p = await Post.findById(req.params.id);
  if (!p) return fail(res, 404, 'Post not found');
  if (!canModify(req, p, 'author')) return fail(res, 403, 'You can only delete your own posts');
  await Comment.deleteMany({ post: p._id });
  await p.deleteOne();
  res.json({ ok: true });
}));

// ---------- Comments ----------
app.post('/api/posts/:id/comments', auth, wrap(async (req, res) => {
  const p = await Post.findById(req.params.id);
  if (!p) return fail(res, 404, 'Post not found');
  const text = (req.body.text || '').trim();
  if (!text || text.length > 1000) return fail(res, 400, 'Comment must be 1-1000 characters');
  res.json(await Comment.create({ post: p._id, user: req.user.id, userName: req.user.name, text }));
}));

app.delete('/api/comments/:id', auth, wrap(async (req, res) => {
  const c = await Comment.findById(req.params.id);
  if (!c) return fail(res, 404, 'Comment not found');
  if (!canModify(req, c, 'user')) return fail(res, 403, 'You can only delete your own comments');
  await c.deleteOne();
  res.json({ ok: true });
}));

app.use((err, req, res, next) => err.name === 'CastError' ? fail(res, 404, 'Not found') : fail(res, 500, err.message));

// ---------- Start + seed ----------
async function seed() {
  let admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    admin = await User.create({ name: 'Admin', email: 'admin@blog.com', password: await bcrypt.hash('admin123', 10), role: 'admin' });
    console.log('Seeded admin: admin@blog.com / admin123');
  }
  if (!(await Post.countDocuments())) {
    await Post.create({ title: 'Welcome to the blog!', content: 'This is a sample post. Register an account to write your own posts and join the conversation in the comments.', author: admin._id, authorName: admin.name });
  }
}

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/blogplatform')
  .then(seed)
  .then(() => app.listen(process.env.PORT || 3000, () => console.log('Running on http://localhost:' + (process.env.PORT || 3000))))
  .catch(e => { console.error('Database connection failed:', e.message); process.exit(1); });
