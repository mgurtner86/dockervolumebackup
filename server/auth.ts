import { ConfidentialClientApplication } from '@azure/msal-node';
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import pool from './db.js';

let msalClient: ConfidentialClientApplication | null = null;

const getMsalClient = async () => {
  if (msalClient) return msalClient;

  const settings = await getAuthSettings();
  if (!settings.clientId || !settings.tenantId || !settings.clientSecret) {
    return null;
  }

  const msalConfig = {
    auth: {
      clientId: settings.clientId,
      authority: `https://login.microsoftonline.com/${settings.tenantId}`,
      clientSecret: settings.clientSecret,
    },
  };

  msalClient = new ConfidentialClientApplication(msalConfig);
  return msalClient;
};

const getAuthSettings = async () => {
  const result = await pool.query(
    `SELECT key, value FROM settings WHERE key IN ($1, $2, $3, $4, $5)`,
    ['azure_ad_client_id', 'azure_ad_client_secret', 'azure_ad_tenant_id', 'azure_ad_required_group_id', 'azure_ad_enabled']
  );

  const settings: Record<string, string> = {};
  result.rows.forEach(row => {
    const key = row.key.replace('azure_ad_', '');
    settings[key] = row.value;
  });

  return {
    clientId: settings.client_id || '',
    clientSecret: settings.client_secret || '',
    tenantId: settings.tenant_id || '',
    groupId: settings.required_group_id || '',
    enabled: settings.enabled === 'true',
  };
};

export const getAuthUrl = async (): Promise<string | null> => {
  const client = await getMsalClient();
  if (!client) return null;

  const authCodeUrlParameters = {
    scopes: ['User.Read', 'GroupMember.Read.All'],
    redirectUri: process.env.REDIRECT_URI || 'http://localhost:3003/auth/callback',
  };

  const response = await client.getAuthCodeUrl(authCodeUrlParameters);
  return response;
};

export const handleAuthCallback = async (code: string) => {
  const client = await getMsalClient();
  if (!client) throw new Error('MSAL client not configured');

  const tokenRequest = {
    code,
    scopes: ['User.Read', 'GroupMember.Read.All'],
    redirectUri: process.env.REDIRECT_URI || 'http://localhost:3003/auth/callback',
  };

  const response = await client.acquireTokenByCode(tokenRequest);
  return response;
};

export const validateGroupMembership = async (accessToken: string): Promise<boolean> => {
  const settings = await getAuthSettings();
  const requiredGroupId = settings.groupId;

  if (!requiredGroupId) {
    console.warn('Required group ID not set, skipping group validation');
    return true;
  }

  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/me/memberOf', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch user groups:', response.statusText);
      return false;
    }

    const data = await response.json();
    const groups = data.value || [];

    const isMember = groups.some((group: any) => group.id === requiredGroupId);
    return isMember;
  } catch (error) {
    console.error('Error validating group membership:', error);
    return false;
  }
};

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const authenticateLocal = async (username: string, password: string) => {
  const result = await pool.query(
    'SELECT id, username, password_hash, role FROM users WHERE username = $1',
    [username]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];
  const isValid = await verifyPassword(password, user.password_hash);

  if (!isValid) {
    return null;
  }

  return {
    id: user.id.toString(),
    username: user.username,
    role: user.role,
    authType: 'local' as const,
  };
};

export const isAuthEnabled = async (): Promise<boolean> => {
  const settings = await getAuthSettings();
  return settings.enabled;
};

export const hasAnyUsers = async (): Promise<boolean> => {
  const result = await pool.query('SELECT COUNT(*) as count FROM users');
  return parseInt(result.rows[0].count) > 0;
};

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      name?: string;
      email?: string;
      username?: string;
      role?: string;
      authType: 'local' | 'entra';
      accessToken?: string;
    };
  }
}
