import pool from '../db.js';

interface EmailSettings {
  enabled: boolean;
  tenantId: string;
  clientId: string;
  clientSecret: string;
  fromAddress: string;
  toAddresses: string[];
}

interface EmailOptions {
  subject: string;
  body: string;
  isHtml?: boolean;
}

async function getEmailSettings(): Promise<EmailSettings | null> {
  try {
    const result = await pool.query(
      `SELECT key, value FROM settings WHERE key IN (
        'email_enabled',
        'email_ms_tenant_id',
        'email_ms_client_id',
        'email_ms_client_secret',
        'email_from_address',
        'email_to_addresses'
      )`
    );

    const settings: Record<string, string> = {};
    result.rows.forEach((row) => {
      settings[row.key] = row.value;
    });

    if (settings.email_enabled !== 'true') {
      return null;
    }

    if (!settings.email_ms_tenant_id || !settings.email_ms_client_id ||
        !settings.email_ms_client_secret || !settings.email_from_address ||
        !settings.email_to_addresses) {
      console.warn('Email is enabled but configuration is incomplete');
      return null;
    }

    return {
      enabled: true,
      tenantId: settings.email_ms_tenant_id,
      clientId: settings.email_ms_client_id,
      clientSecret: settings.email_ms_client_secret,
      fromAddress: settings.email_from_address,
      toAddresses: settings.email_to_addresses.split(',').map(e => e.trim()).filter(e => e),
    };
  } catch (error) {
    console.error('Error fetching email settings:', error);
    return null;
  }
}

async function getAccessToken(tenantId: string, clientId: string, clientSecret: string): Promise<string | null> {
  try {
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('scope', 'https://graph.microsoft.com/.default');
    params.append('grant_type', 'client_credentials');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to get access token:', errorText);
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
}

async function sendEmail(options: EmailOptions): Promise<boolean> {
  const settings = await getEmailSettings();

  if (!settings) {
    console.log('Email notifications are disabled or not configured');
    return false;
  }

  const accessToken = await getAccessToken(settings.tenantId, settings.clientId, settings.clientSecret);

  if (!accessToken) {
    console.error('Failed to obtain access token for email');
    return false;
  }

  try {
    const emailMessage = {
      message: {
        subject: options.subject,
        body: {
          contentType: options.isHtml ? 'HTML' : 'Text',
          content: options.body,
        },
        toRecipients: settings.toAddresses.map(email => ({
          emailAddress: {
            address: email,
          },
        })),
      },
      saveToSentItems: true,
    };

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${settings.fromAddress}/sendMail`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailMessage),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send email:', errorText);
      return false;
    }

    console.log('Email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

export async function sendBackupFailureEmail(volumeName: string, errorMessage: string): Promise<void> {
  const notifyResult = await pool.query(
    "SELECT value FROM settings WHERE key = 'email_notify_backup_failure'"
  );

  if (notifyResult.rows.length === 0 || notifyResult.rows[0].value !== 'true') {
    return;
  }

  const subject = `⚠️ Backup Failed: ${volumeName}`;
  const body = `
<html>
<body style="font-family: Arial, sans-serif; color: #333;">
  <h2 style="color: #dc2626;">Backup Failure Notification</h2>
  <p>A backup operation has failed and requires your attention.</p>

  <table style="border-collapse: collapse; margin: 20px 0;">
    <tr>
      <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #ddd;">Volume:</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${volumeName}</td>
    </tr>
    <tr>
      <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #ddd;">Time:</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${new Date().toLocaleString()}</td>
    </tr>
    <tr>
      <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #ddd;">Error:</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${errorMessage}</td>
    </tr>
  </table>

  <p style="color: #666; font-size: 14px;">Please check the backup system for more details.</p>
</body>
</html>
`;

  await sendEmail({ subject, body, isHtml: true });
}

export async function sendRestoreCompleteEmail(
  volumeName: string,
  backupDate: string,
  restoreType: string,
  selectedFiles?: string[]
): Promise<void> {
  const notifyResult = await pool.query(
    "SELECT value FROM settings WHERE key = 'email_notify_restore_complete'"
  );

  if (notifyResult.rows.length === 0 || notifyResult.rows[0].value !== 'true') {
    return;
  }

  const restoreTypeLabel = restoreType === 'selective' ? 'File-Level Restore' : 'Full Restore';

  let filesSection = '';
  if (restoreType === 'selective' && selectedFiles && selectedFiles.length > 0) {
    const filesList = selectedFiles.map(file =>
      `<li style="padding: 4px 0;">${file}</li>`
    ).join('');

    filesSection = `
    <tr>
      <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #ddd; vertical-align: top;">Restored Files:</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">
        <ul style="margin: 0; padding-left: 20px;">
          ${filesList}
        </ul>
      </td>
    </tr>
    `;
  }

  const subject = `✅ Restore Completed: ${volumeName}`;
  const body = `
<html>
<body style="font-family: Arial, sans-serif; color: #333;">
  <h2 style="color: #059669;">Restore Completion Notification</h2>
  <p>A restore operation has completed successfully.</p>

  <table style="border-collapse: collapse; margin: 20px 0;">
    <tr>
      <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #ddd;">Volume:</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${volumeName}</td>
    </tr>
    <tr>
      <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #ddd;">Restore Type:</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${restoreTypeLabel}</td>
    </tr>
    <tr>
      <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #ddd;">Backup Date:</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${backupDate}</td>
    </tr>
    <tr>
      <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #ddd;">Restored At:</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${new Date().toLocaleString()}</td>
    </tr>
    ${filesSection}
  </table>

  <p style="color: #666; font-size: 14px;">The volume data has been successfully restored.</p>
</body>
</html>
`;

  await sendEmail({ subject, body, isHtml: true });
}

export async function sendScheduleGroupCompleteEmail(
  groupName: string,
  volumes: Array<{ name: string; status: string }>,
  startTime: Date,
  endTime: Date
): Promise<void> {
  const notifyResult = await pool.query(
    "SELECT value FROM settings WHERE key = 'email_notify_schedule_complete'"
  );

  if (notifyResult.rows.length === 0 || notifyResult.rows[0].value !== 'true') {
    return;
  }

  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60);
  const successCount = volumes.filter(v => v.status === 'completed').length;
  const failureCount = volumes.filter(v => v.status === 'failed').length;

  const volumeRows = volumes.map(v => {
    const statusColor = v.status === 'completed' ? '#059669' : '#dc2626';
    const statusIcon = v.status === 'completed' ? '✅' : '❌';
    return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${v.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; color: ${statusColor};">
          ${statusIcon} ${v.status.toUpperCase()}
        </td>
      </tr>
    `;
  }).join('');

  const subject = `📋 Schedule Group Completed: ${groupName}`;
  const body = `
<html>
<body style="font-family: Arial, sans-serif; color: #333;">
  <h2 style="color: #2563eb;">Schedule Group Completion Report</h2>
  <p>A scheduled backup group has finished execution.</p>

  <h3>Summary</h3>
  <table style="border-collapse: collapse; margin: 20px 0;">
    <tr>
      <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #ddd;">Group Name:</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${groupName}</td>
    </tr>
    <tr>
      <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #ddd;">Started:</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${startTime.toLocaleString()}</td>
    </tr>
    <tr>
      <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #ddd;">Completed:</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${endTime.toLocaleString()}</td>
    </tr>
    <tr>
      <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #ddd;">Duration:</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${duration} minutes</td>
    </tr>
    <tr>
      <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #ddd;">Total Volumes:</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${volumes.length}</td>
    </tr>
    <tr>
      <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #ddd;">Successful:</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; color: #059669;">${successCount}</td>
    </tr>
    <tr>
      <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #ddd;">Failed:</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; color: #dc2626;">${failureCount}</td>
    </tr>
  </table>

  <h3>Volume Details</h3>
  <table style="border-collapse: collapse; margin: 20px 0; width: 100%;">
    <thead>
      <tr style="background-color: #f3f4f6;">
        <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Volume Name</th>
        <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${volumeRows}
    </tbody>
  </table>

  <p style="color: #666; font-size: 14px;">This is an automated notification from your backup system.</p>
</body>
</html>
`;

  await sendEmail({ subject, body, isHtml: true });
}
