# Microsoft Entra ID Authentication Setup Guide

This application now uses Microsoft Entra ID (formerly Azure AD) for authentication with group-based access control and seamless SSO.

## Prerequisites

1. Access to Azure Portal with permissions to register applications
2. An Entra ID security group for authorized users

## Azure App Registration Setup

### Step 1: Register Application

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Configure:
   - **Name**: Docker Volume Backup Manager
   - **Supported account types**: Accounts in this organizational directory only
   - **Redirect URI**:
     - Type: Web
     - URI: `http://localhost:3003/auth/callback` (change for production)
5. Click **Register**

### Step 2: Configure API Permissions

1. In your app registration, go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Select **Delegated permissions**
5. Add these permissions:
   - `User.Read`
   - `GroupMember.Read.All`
6. Click **Add permissions**
7. Click **Grant admin consent** (requires admin privileges)

### Step 3: Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add description (e.g., "Production Secret")
4. Select expiration period
5. Click **Add**
6. **IMPORTANT**: Copy the secret value immediately (you won't see it again)

### Step 4: Get Application IDs

1. Go to **Overview** page of your app registration
2. Copy these values:
   - **Application (client) ID**
   - **Directory (tenant) ID**

### Step 5: Create Security Group

1. Go to **Azure Active Directory** > **Groups**
2. Click **New group**
3. Configure:
   - **Group type**: Security
   - **Group name**: Docker Backup Users (or your preferred name)
   - Add members who should have access
4. Click **Create**
5. Open the group and copy the **Object Id**

## Environment Configuration

Update your `.env` file with the values from Azure:

```env
AZURE_AD_CLIENT_ID=<Application (client) ID>
AZURE_AD_CLIENT_SECRET=<Client secret value>
AZURE_AD_TENANT_ID=<Directory (tenant) ID>
AZURE_AD_REQUIRED_GROUP_ID=<Group Object Id>
SESSION_SECRET=<random-secure-string>
REDIRECT_URI=http://localhost:3003/auth/callback

VITE_AZURE_AD_CLIENT_ID=<Application (client) ID>
VITE_AZURE_AD_TENANT_ID=<Directory (tenant) ID>
VITE_REDIRECT_URI=http://localhost:3003/auth/callback
```

**For production**, update the redirect URIs:
- In Azure: Add `https://your-domain.com/auth/callback`
- In `.env`: Update `REDIRECT_URI` and `VITE_REDIRECT_URI`

## How It Works

1. **Login Flow**:
   - User clicks "Sign in with Microsoft"
   - Redirected to Microsoft login page
   - User authenticates with their Microsoft account
   - Microsoft redirects back with authorization code
   - Server exchanges code for access token
   - Server validates user is member of required group
   - Session created and user gains access

2. **Group Validation**:
   - On every login, the server checks if the user is a member of the configured group
   - Only users in the group can access the application
   - Non-members receive "Access denied" error

3. **Session Management**:
   - Sessions are stored server-side
   - Cookies are HTTP-only and secure (in production)
   - Sessions expire after 24 hours
   - All API endpoints require valid session

4. **SSO (Single Sign-On)**:
   - If user is already logged into Microsoft services, they won't need to enter credentials again
   - Seamless authentication experience across Microsoft ecosystem

## Security Best Practices

1. **Client Secret**:
   - Store securely and never commit to version control
   - Rotate regularly (before expiration)
   - Use different secrets for dev/staging/production

2. **Session Secret**:
   - Generate a strong random string (min 32 characters)
   - Keep secret and never expose
   - Different secret per environment

3. **HTTPS**:
   - Always use HTTPS in production
   - Update cookie settings: `secure: true`

4. **Group Management**:
   - Regularly review group membership
   - Remove access for departed users
   - Use nested groups if needed for complex organizations

## Troubleshooting

**"Access denied: You are not a member of the required group"**
- Verify user is added to the security group in Azure AD
- Check `AZURE_AD_REQUIRED_GROUP_ID` matches the group's Object Id
- Wait a few minutes for group membership changes to propagate

**"Failed to acquire access token"**
- Verify client secret is correct and not expired
- Check redirect URI matches exactly (including http/https)
- Ensure API permissions are granted admin consent

**Session issues**
- Clear browser cookies
- Check `SESSION_SECRET` is set
- Verify server time is synchronized
