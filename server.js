const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

app.get('/health', async (req, res) => {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    res.json({ status: 'ok', users_table: error ? error.message : 'ok' });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username ve password gerekli' });

  const { data: existing } = await supabase.from('users').select('id').eq('username', username).single();
  if (existing) return res.status(409).json({ error: 'Bu kullanıcı adı zaten alınmış' });

  const hashed = await bcrypt.hash(password, 10);
  const { data, error } = await supabase.from('users').insert({ username, password: hashed }).select().single();
  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true, user_id: data.id, username: data.username });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username ve password gerekli' });

  const { data: user, error } = await supabase.from('users').select('*').eq('username', username).single();
  if (error || !user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Şifre yanlış' });

  res.json({ success: true, user_id: user.id, username: user.username });
});

app.post('/score', async (req, res) => {
  const { user_id, score, song_name } = req.body;
  if (!user_id || score == null) return res.status(400).json({ error: 'user_id ve score gerekli' });

  const { data, error } = await supabase.from('scores').insert({ user_id, score, song_name }).select().single();
  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true, score: data });
});

app.get('/leaderboard', async (req, res) => {
  const { data, error } = await supabase
    .from('scores')
    .select('score, song_name, created_at, users(username)')
    .order('score', { ascending: false })
    .limit(50);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ leaderboard: data });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
