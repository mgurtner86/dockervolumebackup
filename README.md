# Docker Volume Backup Manager

A comprehensive web application for backing up and restoring Docker volumes with automated scheduling, network storage support, and Azure AD authentication.

## Features

### Volume Management
- **Docker Integration**: Automatically discover and select volumes from running Docker containers
- **Smart Volume Selection**: Browse all running containers and their volumes in an intuitive modal interface
- **Multi-Volume Selection**: Add multiple volumes at once with a single click
- **File Browser**: Browse volume contents directly in the UI

### Backup Operations
- **Manual Backups**: Trigger on-demand backups for individual volumes
- **Schedule Groups**: Create backup schedules for multiple volumes simultaneously
- **Individual Schedules**: Set up separate cron-based schedules for specific volumes
- **Progress Tracking**: Real-time backup progress with detailed logging
- **Backup History**: View all backups with timestamps and file sizes

### Restore Functionality
- **Restore Wizard**: Step-by-step guided restore process
- **Backup Preview**: Browse backup contents before restoring
- **Selective Restore**: Choose specific files or entire volumes to restore
- **Restore Verification**: Automatic verification after restore completes

### Scheduling & Automation
- **Cron Expressions**: Flexible scheduling using standard cron syntax
- **Schedule Groups**: Group multiple volumes into a single scheduled backup job
- **Enable/Disable Schedules**: Temporarily pause schedules without deleting them
- **Run History**: Track all scheduled runs with status and error messages
- **Manual Trigger**: Run any schedule immediately without waiting

### Network Storage
- **Custom Backup Paths**: Configure network storage locations for backups
- **CIFS/SMB Support**: Built-in support for Windows network shares
- **NFS Support**: Compatible with NFS network storage
- **Email Notifications**: Get notified on backup success or failure

### Logging & Monitoring
- **Comprehensive Logs**: Detailed logs for all backup, restore, and schedule operations
- **Log Filtering**: Filter logs by level (info, success, error) and source (manual, scheduled)
- **Real-time Updates**: Live log updates as operations progress
- **Search Functionality**: Search through log messages

### Authentication & Security
- **Azure AD Integration**: Enterprise-grade authentication with Microsoft Azure AD
- **Group-Based Access**: Restrict access to specific Azure AD groups
- **Session Management**: Secure session handling with automatic timeout
- **Dark Mode**: Beautiful dark theme for comfortable viewing

## Tech Stack

- **Frontend**: React 18 with TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **Authentication**: Azure AD (MSAL)
- **Icons**: Lucide React
- **Docker**: Volume management and container interaction

## Quick Start

### Prerequisites

- Docker and Docker Compose
- PostgreSQL database
- Azure AD application (for authentication)
- Access to Docker socket or Docker volumes path

### 1. Clone and Configure

```bash
git clone <repository-url>
cd docker-volume-backup-manager
```

### 2. Environment Setup

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database Configuration
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=backup_manager
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password

# Server Configuration
PORT=3000
REDIRECT_URI=http://your-domain.com/auth/callback

# Azure AD Configuration
AZURE_AD_CLIENT_ID=your-azure-client-id
AZURE_AD_CLIENT_SECRET=your-azure-client-secret
AZURE_AD_TENANT_ID=your-azure-tenant-id
AZURE_AD_REQUIRED_GROUP_ID=your-azure-group-id

# Session Security
SESSION_SECRET=your-random-session-secret
```

### 3. Azure AD Setup

1. Register an application in Azure AD
2. Add a web redirect URI: `http://your-domain.com/auth/callback`
3. Create a client secret
4. Note the Application (client) ID and Directory (tenant) ID
5. Create or identify an Azure AD group for access control
6. Add the group's Object ID to `AZURE_AD_REQUIRED_GROUP_ID`

See [AUTHENTICATION_SETUP.md](AUTHENTICATION_SETUP.md) for detailed instructions.

### 4. Docker Compose Configuration

Edit `docker-compose.yml` to add your volume mounts:

```yaml
services:
  backup-manager:
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro  # Docker access
      - /var/lib/docker/volumes:/var/lib/docker/volumes:ro  # Volume access
      - /mnt/network-storage:/mnt/backups  # Network storage for backups
```

### 5. Start the Application

```bash
docker-compose up -d
```

### 6. Access the Application

- Web UI: http://localhost:8080
- API: http://localhost:3000

## Network Storage Configuration

### Mounting Network Storage

#### NFS Mount
```bash
sudo mkdir -p /mnt/nfs/backups
sudo mount -t nfs nfs-server:/path/to/share /mnt/nfs/backups

# Make permanent in /etc/fstab
echo "nfs-server:/path/to/share /mnt/nfs/backups nfs defaults 0 0" | sudo tee -a /etc/fstab
```

#### CIFS/SMB Mount
```bash
sudo mkdir -p /mnt/smb/backups
sudo mount -t cifs //smb-server/share /mnt/smb/backups -o username=user,password=pass

# Make permanent in /etc/fstab
echo "//smb-server/share /mnt/smb/backups cifs username=user,password=pass 0 0" | sudo tee -a /etc/fstab
```

#### Configure in Application

1. Navigate to **Settings** in the web UI
2. Under **Storage Settings**, enter your backup path (e.g., `/mnt/nfs/backups`)
3. Configure email notifications (optional)
4. Click **Save Settings**

## Usage Guide

### Adding Volumes

1. Click **Add Volume** button in the Volumes section
2. A modal opens showing all running Docker containers
3. Each container displays its volumes with:
   - Volume name
   - Source path
   - Container mount point
4. Click on volumes to select them (multiple selection supported)
5. Click **Add Selected Volumes** to add them to your backup list

### Creating Manual Backups

1. Select a volume from the list
2. Click **Backup Now** in the top toolbar
3. The backup process starts immediately
4. View progress in the Logs section
5. Completed backup appears in the backup list with timestamp and size

### Setting Up Schedule Groups

1. Navigate to **Schedule Groups** tab
2. Click **Create Schedule Group**
3. Enter:
   - Group name
   - Description (optional)
   - Cron expression (e.g., `0 2 * * *` for daily at 2 AM)
   - Select multiple volumes to include in the group
4. Click **Create Group**
5. Use the toggle to enable/disable the schedule
6. Click the play button to run immediately

### Creating Individual Schedules

1. Select a volume
2. Navigate to **Schedules** tab
3. Click **Add Schedule**
4. Enter cron expression
5. Click **Save**

### Restoring from Backup

1. Click **Restore** tab
2. Select the volume to restore
3. Choose the backup from the list
4. Preview backup contents
5. Select restore type:
   - **Full Restore**: Replace entire volume
   - **Selective Restore**: Choose specific files
6. Confirm and restore

### Monitoring Logs

1. Navigate to **Logs** tab
2. View all operations with timestamps
3. Filter by:
   - Log level (Info, Success, Error)
   - Source (Manual, Scheduled)
4. Search log messages
5. View detailed error messages for failures

## Database Schema

The application uses PostgreSQL with the following main tables:

- `volumes`: Store volume configurations
- `backups`: Track all backup files
- `schedules`: Individual volume schedules
- `schedule_groups`: Multi-volume schedule groups
- `schedule_group_volumes`: Volume associations for groups
- `schedule_group_runs`: Track schedule execution history
- `settings`: Application configuration
- `logs`: Comprehensive operation logging

## Development

### Local Development

```bash
# Install dependencies
npm install

# Start development servers
npm run dev
```

This starts:
- Frontend dev server on http://localhost:5173
- Backend API server on http://localhost:3000

### Building for Production

```bash
npm run build
```

This creates:
- Client bundle in `dist/client/`
- Server bundle in `dist/server/`

### Running Tests

```bash
npm run lint
npm run typecheck
```

## Backup Best Practices

1. **Test Restores Regularly**: Verify your backups work by performing test restores
2. **Monitor Logs**: Check logs regularly for failed backups
3. **Use Schedule Groups**: Group related volumes for consistent backup timing
4. **Network Storage**: Always use reliable network storage with redundancy
5. **Email Notifications**: Configure email alerts for backup failures
6. **Retention Policy**: Manually clean up old backups to save storage space

## Troubleshooting

### Backups Failing

- Check Docker socket access: Ensure `/var/run/docker.sock` is mounted
- Verify volume paths: Ensure volume paths in Docker Compose are correct
- Check storage permissions: Backup destination must be writable
- Review logs: Check the Logs tab for detailed error messages

### Authentication Issues

- Verify Azure AD credentials in `.env`
- Check redirect URI matches exactly in Azure AD and `.env`
- Ensure user is member of the required Azure AD group
- Check `SESSION_SECRET` is set and consistent

### Schedule Not Running

- Verify cron expression syntax
- Check schedule is enabled (toggle in UI)
- Review logs for execution attempts
- Ensure server has access to Docker and volumes

## License

This project is private and proprietary.

## Support

For issues and questions, please check the logs first for detailed error messages.
