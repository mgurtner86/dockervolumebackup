import { Router } from 'express';
import { getAuthUrl, handleAuthCallback, validateGroupMembership, authenticateLocal, hashPassword, hasAnyUsers, isAuthEnabled } from '../auth.js';
import pool from '../db.js';

const router = Router();

router.post('/setup', async (req, res) => {
  try {
    const hasUsers = await hasAnyUsers();
    if (hasUsers) {
      return res.status(400).json({ error: 'Admin user already exists' });
    }

    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const passwordHash = await hashPassword(password);

    const result = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
      [username, passwordHash, 'admin']
    );

    const user = result.rows[0];
    req.session.user = {
      id: user.id.toString(),
      username: user.username,
      role: user.role,
      authType: 'local',
    };

    res.json({ success: true });
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ error: 'Failed to create admin user' });
  }
});

router.get('/check-setup', async (req, res) => {
  try {
    const hasUsers = await hasAnyUsers();
    res.json({ needsSetup: !hasUsers });
  } catch (error) {
    console.error('Error checking setup:', error);
    res.status(500).json({ error: 'Failed to check setup status' });
  }
});

router.post('/login/local', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await authenticateLocal(username, password);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.user = user;
    res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    console.error('Error authenticating local user:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

router.get('/login/entra', async (req, res) => {
  try {
    const authUrl = await getAuthUrl();
    if (!authUrl) {
      return res.status(400).json({ error: 'Entra ID authentication not configured' });
    }
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authentication URL' });
  }
});

router.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).send('Missing authorization code');
  }

  try {
    const tokenResponse = await handleAuthCallback(code);

    if (!tokenResponse.accessToken) {
      return res.status(401).send('Failed to acquire access token');
    }

    const isGroupMember = await validateGroupMembership(tokenResponse.accessToken);

    if (!isGroupMember) {
      return res.status(403).send('Access denied: You are not a member of the required group');
    }

    req.session.user = {
      id: tokenResponse.uniqueId || '',
      name: tokenResponse.account?.name || '',
      email: tokenResponse.account?.username || '',
      authType: 'entra',
      accessToken: tokenResponse.accessToken,
    };

    res.redirect('/');
  } catch (error) {
    console.error('Error handling auth callback:', error);
    res.status(500).send('Authentication failed');
  }
});

router.get('/me', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = req.session.user;
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role,
    authType: user.authType,
  });
});

router.get('/config', async (req, res) => {
  try {
    const entraEnabled = await isAuthEnabled();
    res.json({ entraEnabled });
  } catch (error) {
    console.error('Error getting auth config:', error);
    res.status(500).json({ error: 'Failed to get auth config' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true });
  });
});

export default router;
