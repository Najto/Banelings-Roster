# Battle.net OAuth Setup Guide

This guide explains how to configure Battle.net OAuth authentication for your WoW roster application.

## Prerequisites

- A Supabase project (already configured)
- A Battle.net developer account

## Step 1: Create a Battle.net Application

1. Go to [Battle.net Developer Portal](https://develop.battle.net/access/clients)
2. Log in with your Battle.net account
3. Click "Create Client"
4. Fill in the application details:
   - **Client Name**: Your application name (e.g., "Banelings Roster Pro")
   - **Redirect URLs**: Add your Supabase OAuth callback URL:
     ```
     https://<your-project-ref>.supabase.co/auth/v1/callback
     ```
     Replace `<your-project-ref>` with your actual Supabase project reference
5. Click "Create"
6. Copy your **Client ID** and **Client Secret**

## Step 2: Configure Supabase Authentication

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Authentication** > **Providers**
3. Find **Battle.net** in the list of providers
4. Enable Battle.net OAuth
5. Enter your Battle.net credentials:
   - **Client ID**: Paste from Battle.net developer portal
   - **Client Secret**: Paste from Battle.net developer portal
6. Click **Save**

## Step 3: Configure OAuth Scopes

The application automatically requests the following scopes:
- `wow.profile` - Access to WoW character list

These scopes are configured in the code and don't require manual setup.

## Step 4: Test the Integration

1. Start your development server
2. Click "Login with Battle.net" in the sidebar
3. You'll be redirected to Battle.net to authorize the application
4. After authorization, you'll be redirected back to your application
5. Your Battle.net characters will be automatically fetched and cached

## How Character Claiming Works

1. **Login**: Users log in with their Battle.net account
2. **Character Fetch**: The app automatically fetches all characters on the user's Battle.net account
3. **Claiming**: Users can claim roster members that match their Battle.net characters
4. **Verification**: Claims are automatically verified by checking if the character exists on the user's Battle.net account
5. **Status**: Each claim shows as "Verified" or "Unverified" based on Battle.net data

## Database Tables

The following tables have been created to support character claiming:

### user_claims
- Stores character claims made by users
- Links users to guild roster members
- Tracks verification status

### battlenet_characters
- Caches Battle.net character list per user
- Used for claim verification
- Updated on each login

## Features

- Single Sign-On with Battle.net
- Automatic character discovery from Battle.net API
- Visual indication of which characters match Battle.net account
- Prevent duplicate claims (one roster member per user)
- Automatic verification of character ownership
- View and manage all claims in the "My Claims" tab

## Troubleshooting

### Login redirects to 404
- Check that your redirect URL is correctly configured in both Battle.net and Supabase
- Ensure the URL format matches exactly: `https://<project-ref>.supabase.co/auth/v1/callback`

### Characters not loading
- The Battle.net API may be rate-limited or temporarily unavailable
- Characters are cached after the first successful login
- Try logging out and back in to refresh the character list

### Claims not verifying
- Ensure the character name and realm match exactly (case-insensitive)
- Realm names use slugs (e.g., "blackhand" not "Blackhand")
- Characters must be on the same Battle.net account

## Security Notes

- Battle.net tokens are handled securely by Supabase Auth
- Users can only view and manage their own claims
- Row Level Security (RLS) policies prevent unauthorized access
- Character verification happens server-side via Battle.net API
