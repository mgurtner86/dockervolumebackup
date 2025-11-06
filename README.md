# Docker Volume Backup Manager

A comprehensive web application for backing up and restoring Docker volumes with configurable network storage support.

## Features

- **Volume Management**: Add and manage Docker volumes with custom paths
- **File Browser**: Browse volume contents directly in the UI
- **Manual Backups**: Trigger backups on-demand for any volume
- **Scheduled Backups**: Configure automated backups using cron expressions
- **Restore Functionality**: Restore volumes from previous backups
- **Network Storage**: Configure custom network storage paths for backups
- **Real-time Status**: Track backup progress and status

## Quick Start

1. **Start the application**:
   ```bash
   docker-compose up -d
   ```

2. **Access the application**:
   - Web UI: http://localhost:8080
   - API: http://localhost:3000

## Network Storage Configuration

### Mounting Network Storage

Before using network storage for backups, mount it on your Docker host:

#### NFS Mount:
```bash
sudo mkdir -p /mnt/nfs/backups
sudo mount -t nfs nfs-server:/path/to/share /mnt/nfs/backups
```

#### CIFS/SMB Mount:
```bash
sudo mkdir -p /mnt/smb/backups
sudo mount -t cifs //smb-server/share /mnt/smb/backups -o username=user,password=pass
```

### Add Network Storage to Docker Compose

Edit `docker-compose.yml` and add your network storage mount:

```yaml
services:
  backup-manager:
    volumes:
      - /mnt/nfs/backups:/mnt/nfs/backups  # Add your network storage path
```

### Configure Backup Storage Path

1. Navigate to **Settings** in the web UI
2. Enter your network storage path (e.g., `/mnt/nfs/backups`)
3. Click **Save Settings**

## Usage

### Adding a Volume
1. Click **Add Volume**
2. Enter volume name and path
3. Click **Save**

### Creating a Backup
1. Select a volume
2. Click **Backup Now**

### Scheduling Backups
1. Select a volume
2. Click **Add Schedule**
3. Choose schedule frequency
4. Click **Save**

### Restoring a Backup
1. Select a volume
2. Find the backup in the list
3. Click **Restore**
