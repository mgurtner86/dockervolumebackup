# Database Migration Instructions

## Problem
After updating schedule groups to use frequency and time instead of cron expressions, the `schedule_groups` table needs new columns added to the database.

## Solution
A migration file has been created that will:
1. Add `frequency` and `time` columns to the `schedule_groups` table
2. Make `cron_expression` nullable
3. Set default values for existing schedule groups

## How to Apply the Migration

### Option 1: Rebuild Docker Containers (Recommended)
The migration will run automatically on startup:

```bash
docker-compose down
docker-compose up -d --build
```

### Option 2: Run Migration Manually Inside Container
If you want to keep the containers running:

```bash
# Enter the app container
docker-compose exec app bash

# Run the migration
npm run migrate

# Exit the container
exit

# Restart the app to apply changes
docker-compose restart app
```

### Option 3: Run Migration from Host (if you have direct database access)
```bash
npm run migrate
```

## Verify Migration Success
After applying the migration:
1. Try creating a new schedule group
2. The modal should now show:
   - Frequency dropdown (Hourly, Daily, Weekly, Monthly)
   - Time picker (HH:MM format)
3. The schedule group should save successfully

## What Changed
- **Frontend**: Replaced cron expression input with frequency dropdown + time picker
- **Backend**: Updated API to accept `frequency` and `time` instead of `cron_expression`
- **Database**: Added `frequency` and `time` columns to both `schedules` and `schedule_groups` tables
- **Migration**: Automatically runs on Docker container startup
