import { Router } from 'express';
import { getAuthUrl, handleAuthCallback, validateGroupMembership } from '../auth.js';

const router = Router();

router.get('/login', async (req, res) => {
  try {
    const authUrl = await getAuthUrl();
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

  res.json({
    id: req.session.user.id,
    name: req.session.user.name,
    email: req.session.user.email,
  });
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
