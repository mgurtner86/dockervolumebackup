import { ConfidentialClientApplication, CryptoProvider } from '@azure/msal-node';
import { Request, Response, NextFunction } from 'express';

const msalConfig = {
  auth: {
    clientId: process.env.AZURE_AD_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}`,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET || '',
  },
};

const msalClient = new ConfidentialClientApplication(msalConfig);
const cryptoProvider = new CryptoProvider();

export const getAuthUrl = async (): Promise<string> => {
  const authCodeUrlParameters = {
    scopes: ['User.Read', 'GroupMember.Read.All'],
    redirectUri: process.env.REDIRECT_URI || 'http://localhost:3003/auth/callback',
  };

  const response = await msalClient.getAuthCodeUrl(authCodeUrlParameters);
  return response;
};

export const handleAuthCallback = async (code: string) => {
  const tokenRequest = {
    code,
    scopes: ['User.Read', 'GroupMember.Read.All'],
    redirectUri: process.env.REDIRECT_URI || 'http://localhost:3003/auth/callback',
  };

  const response = await msalClient.acquireTokenByCode(tokenRequest);
  return response;
};

export const validateGroupMembership = async (accessToken: string): Promise<boolean> => {
  const requiredGroupId = process.env.AZURE_AD_REQUIRED_GROUP_ID;

  if (!requiredGroupId) {
    console.warn('AZURE_AD_REQUIRED_GROUP_ID not set, skipping group validation');
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

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      name: string;
      email: string;
      accessToken: string;
    };
  }
}
