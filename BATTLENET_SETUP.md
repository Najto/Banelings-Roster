# Battle.net Integration Setup Guide

This guide explains how to configure Battle.net OAuth for character claiming in your WoW roster application.

## Overview

The application uses a two-tier authentication system:
1. **Primary Authentication**: Email/password accounts (via Supabase Auth)
2. **Battle.net Integration**: Optional linking for character verification and claiming

Users create an account with email/password, then optionally connect their Battle.net account to claim characters.

## Prerequisites

- A Supabase project (already configured)
- A Battle.net developer account

## Step 1: Create a Battle.net Application

1. Go to [Battle.net Developer Portal](https://develop.battle.net/access/clients)
2. Log in with your Battle.net account
3. Click "Create Client"
4. Fill in the application details:
   - **Client Name**: Your application name (e.g., "Banelings Roster Pro")
   - **Redirect URLs**: Add your application callback URL:
     ```
     http://localhost:5173/battlenet-callback
     ```
     For production, add:
     ```
     https://yourdomain.com/battlenet-callback
     ```
5. Click "Create"
6. Copy your **Client ID** and **Client Secret**

## Step 2: Configure Environment Variables

1. Create or update your `.env` file in the project root
2. Add the Battle.net Client ID:
   ```
   VITE_BATTLENET_CLIENT_ID=your_client_id_here
   ```

Note: The Client Secret should be stored securely and never exposed to the frontend. For production use, you'll need to implement a backend endpoint to handle the OAuth token exchange.

## Step 3: User Workflow

### Creating an Account
1. Users click "Sign In / Register" in the sidebar
2. They can create an account with email and password
3. No email confirmation is required (configurable in Supabase)

### Connecting Battle.net
1. After logging in, users go to **Settings**
2. In the "Battle.net Integration" section, click "Connect Battle.net"
3. They're redirected to Battle.net to authorize the application
4. After authorization, the app stores:
   - Battle.net ID
   - BattleTag
   - Access token for API calls
   - Character list from Battle.net

### Claiming Characters
1. Users go to the "My Claims" tab
2. The app shows which roster members match their Battle.net characters
3. They can claim characters that are on their Battle.net account
4. Claims are automatically verified

## Database Tables

The following tables support the authentication and claiming system:

### battlenet_connections
- Stores Battle.net OAuth tokens and connection info
- Links user accounts to Battle.net accounts
- Tracks connection status and sync times

### user_claims
- Stores character claims made by users
- Links users to guild roster members
- Tracks verification status

### battlenet_characters
- Caches Battle.net character list per user
- Used for claim verification
- Updated when Battle.net is connected

## Features

- Email/password authentication with Supabase
- Optional Battle.net account linking
- Automatic character discovery from Battle.net API
- Visual indication of which characters match Battle.net account
- Prevent duplicate claims (one roster member per user)
- Automatic verification of character ownership
- View and manage all claims in the "My Claims" tab
- Connect/disconnect Battle.net at any time

## How Character Claiming Works

1. **Register**: Users create an account with email/password
2. **Connect Battle.net**: Users optionally link their Battle.net account (required for claiming)
3. **Character Fetch**: The app fetches all characters from the user's Battle.net account
4. **Claiming**: Users can claim roster members that match their Battle.net characters
5. **Verification**: Claims are verified by checking character ownership
6. **Status**: Each claim shows as "Verified" or "Unverified"

## Troubleshooting

### Can't see "My Claims" tab
- You must be logged in to see the claims tab
- Create an account or sign in first

### Can't claim characters
- Battle.net must be connected first
- Go to Settings and click "Connect Battle.net"
- Make sure you have WoW characters on your Battle.net account

### Characters not loading
- The Battle.net API may be rate-limited or temporarily unavailable
- Try disconnecting and reconnecting Battle.net in Settings
- Characters are cached after successful connection

### Claims not verifying
- Ensure the character name and realm match exactly (case-insensitive)
- Realm names use slugs (e.g., "blackhand" not "Blackhand")
- Characters must be on the same Battle.net account

### Battle.net connection fails
- Check that your redirect URL is correctly configured in the Battle.net developer portal
- Verify your Client ID is correct in the `.env` file
- Make sure you're using the correct region (EU, US, KR, TW)

## Security Notes

- Primary authentication uses Supabase Auth with secure password hashing
- Battle.net tokens are stored securely in the database
- Users can only view and manage their own claims and connections
- Row Level Security (RLS) policies prevent unauthorized access
- Character verification happens client-side via Battle.net API with user tokens
- Disconnecting Battle.net removes all tokens and character cache

## Production Deployment

For production deployment, you need to:

1. Add your production domain to Battle.net redirect URLs
2. Implement a backend endpoint to handle OAuth token exchange securely
3. Store the Battle.net Client Secret server-side only
4. Use environment variables for all sensitive configuration
5. Enable HTTPS for all OAuth callbacks
6. Consider implementing token refresh logic for long-term Battle.net connections
