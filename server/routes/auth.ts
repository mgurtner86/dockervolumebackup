import { Router } from 'express';
import { getAuthUrl, handleAuthCallback, validateGroupMembership, authenticateLocal, hashPassword, hasAnyUsers, isAuthEnabled } from '../auth.js';
import pool from '../db.js';
import bcrypt from 'bcrypt';

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

router.get('/me', async (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = req.session.user;
  let photo = null;

  if (user.authType === 'entra' && user.accessToken) {
    try {
      const photoResponse = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
        headers: {
          'Authorization': `Bearer ${user.accessToken}`,
        },
      });

      if (photoResponse.ok) {
        const arrayBuffer = await photoResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        photo = buffer.toString('base64');
      }
    } catch (error) {
      console.log('Could not fetch profile photo:', error);
    }
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role,
    authType: user.authType,
    photo,
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

router.post('/change-password', async (req, res) => {
  if (!req.session || !req.session.user || req.session.user.authType !== 'local') {
    return res.status(401).json({ error: 'Not authenticated as local user' });
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.session.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newPasswordHash = await hashPassword(newPassword);

    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, req.session.user.id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
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
