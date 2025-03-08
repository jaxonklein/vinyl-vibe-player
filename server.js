const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const crypto = require('crypto');
const session = require('express-session');
const axios = require('axios');
const querystring = require('querystring');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Add middleware for parsing request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware for Spotify auth state
app.use(session({
  secret: process.env.SESSION_SECRET || 'vinyl-vibe-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to get OpenAI API key
app.get('/api/config', (req, res) => {
  res.json({
    openaiApiKey: process.env.OPENAI_API_KEY || ''
  });
});

// Spotify auth endpoints
app.get('/api/auth/spotify', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  const scope = 'streaming user-read-email user-read-private user-library-read user-library-modify user-read-playback-state user-modify-playback-state';
  
  // Store state in session for validation later
  req.session.spotifyAuthState = state;
  
  // Check if we should force the authorization dialog to show
  const showDialog = req.query.show_dialog === 'true';
  
  // Get redirect URI from environment variables
  const redirectUri = process.env.REDIRECT_URI || 'http://localhost:3000/api/auth/spotify/callback';
  
  console.log(`Starting Spotify auth with redirect URI: ${redirectUri}`);
  
  // Redirect to Spotify's authorization page
  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', process.env.SPOTIFY_CLIENT_ID);
  authUrl.searchParams.append('scope', scope);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('state', state);
  
  // Add show_dialog parameter if requested
  if (showDialog) {
    authUrl.searchParams.append('show_dialog', 'true');
  }
  
  console.log(`Redirecting to Spotify auth URL: ${authUrl.toString()}`);
  res.redirect(authUrl.toString());
});

// Spotify callback endpoint
app.get('/api/auth/spotify/callback', async (req, res) => {
  const code = req.query.code;
  const state = req.query.state;
  const storedState = req.session.spotifyAuthState;
  const error = req.query.error;
  
  // Clear the state from session
  req.session.spotifyAuthState = null;
  
  // Check for error
  if (error) {
    console.error('Spotify authorization error:', error);
    return res.redirect('/#error=' + encodeURIComponent(error));
  }
  
  // Validate state to prevent CSRF attacks
  if (!state || state !== storedState) {
    console.error('State validation failed');
    return res.redirect('/#error=state_mismatch');
  }
  
  if (!code) {
    console.error('No authorization code received from Spotify');
    return res.redirect('/#error=no_code');
  }
  
  console.log('Received authorization code from Spotify');
  
  try {
    const redirectUri = process.env.REDIRECT_URI || 'http://localhost:3000/api/auth/spotify/callback';
    
    // Exchange the code for an access token
    const tokenResponse = await axios({
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      data: querystring.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(
          process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET
        ).toString('base64')
      }
    });
    
    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    
    // Redirect back to the frontend with the tokens in the hash
    const redirectUrl = '/spotify-callback.html#' + querystring.stringify({
      access_token,
      refresh_token,
      expires_in
    });
    
    console.log('Redirecting to frontend with tokens');
    res.redirect(redirectUrl);
    
  } catch (error) {
    console.error('Error during token exchange:', error.message);
    res.redirect('/#error=' + encodeURIComponent('token_exchange_failed'));
  }
});

// Token refresh endpoint
app.post('/api/auth/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  
  if (!refresh_token) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }
  
  try {
    // Exchange the refresh token for a new access token
    const response = await axios({
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      data: querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: refresh_token
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(
          process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET
        ).toString('base64')
      }
    });
    
    // Return the new tokens
    res.json({
      access_token: response.data.access_token,
      expires_in: response.data.expires_in,
      refresh_token: response.data.refresh_token || refresh_token // Use the new refresh token if provided
    });
    
  } catch (error) {
    console.error('Error during token refresh:', error.message);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Handle all routes by serving the vinyl player
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Vinyl Vibe Player available at http://localhost:${PORT}/`);
});
