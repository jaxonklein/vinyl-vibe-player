// Authentication Module
const express = require('express');
const axios = require('axios');
const router = express.Router();

// Environment variables (should be in .env file)
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/api/auth/callback';

// Middleware to verify API key
const verifyApiKey = (req, res, next) => {
    const apiKey = req.headers.authorization?.split('Bearer ')[1];
    
    if (!apiKey) {
        return res.status(401).json({ error: 'API key is required' });
    }
    
    // In a real app, you would validate the API key against a database
    // For this demo, we'll accept any non-empty key
    if (apiKey.length < 5) {
        return res.status(401).json({ error: 'Invalid API key' });
    }
    
    // Store the API key in the request object for later use
    req.apiKey = apiKey;
    next();
};

// Middleware to verify Spotify access token
const verifySpotifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split('Bearer ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access token is required' });
    }
    
    // In a real app, you would validate the token with Spotify
    // For this demo, we'll accept any non-empty token
    if (token === 'demo_token' || token.length > 5) {
        req.spotifyToken = token;
        next();
    } else {
        return res.status(401).json({ error: 'Invalid access token' });
    }
};

// Authentication middleware that accepts either API key or Spotify token
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ error: 'Authorization header is required' });
    }
    
    // Extract token from header
    const token = authHeader.split('Bearer ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Bearer token is required' });
    }
    
    // Store token for use in route handlers
    req.token = token;
    next();
};

// Spotify authentication endpoint
router.get('/spotify', (req, res) => {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.REDIRECT_URI;
    
    if (!clientId) {
        console.error('Missing Spotify client ID');
        return res.status(500).send('Server configuration error: Missing Spotify client ID');
    }
    
    if (!redirectUri) {
        console.error('Missing redirect URI');
        return res.status(500).send('Server configuration error: Missing redirect URI');
    }
    
    console.log(`Starting Spotify OAuth flow with redirect URI: ${redirectUri}`);
    
    // Define the scopes we need
    const scopes = [
        'user-read-private',
        'user-read-email',
        'streaming',
        'user-modify-playback-state',
        'user-read-playback-state'
    ];
    
    // Create the authorization URL
    const authorizeUrl = 'https://accounts.spotify.com/authorize' +
        '?response_type=code' +
        '&client_id=' + encodeURIComponent(clientId) +
        '&scope=' + encodeURIComponent(scopes.join(' ')) +
        '&redirect_uri=' + encodeURIComponent(redirectUri);
    
    console.log(`Redirecting to Spotify authorization URL: ${authorizeUrl}`);
    
    // Redirect the user to Spotify's authorization page
    res.redirect(authorizeUrl);
});

// Spotify callback endpoint
router.get('/spotify/callback', async (req, res) => {
    const code = req.query.code;
    const error = req.query.error;
    
    if (error) {
        console.error('Spotify authorization error:', error);
        return res.redirect('/#error=' + encodeURIComponent(error));
    }
    
    if (!code) {
        console.error('No authorization code received from Spotify');
        return res.redirect('/#error=no_code');
    }
    
    console.log('Received authorization code from Spotify');
    
    try {
        const clientId = process.env.SPOTIFY_CLIENT_ID;
        const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
        const redirectUri = process.env.REDIRECT_URI;
        
        if (!clientId || !clientSecret) {
            console.error('Missing Spotify credentials');
            return res.redirect('/#error=missing_credentials');
        }
        
        console.log(`Exchanging code for token with redirect URI: ${redirectUri}`);
        
        // Exchange the code for an access token
        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri
            })
        });
        
        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error('Token exchange error:', tokenResponse.status, errorData);
            return res.redirect('/#error=token_exchange_failed');
        }
        
        const tokenData = await tokenResponse.json();
        console.log('Successfully obtained access token');
        
        // Redirect back to the frontend with the tokens
        res.redirect('/#' + 
            'access_token=' + encodeURIComponent(tokenData.access_token) + 
            '&refresh_token=' + encodeURIComponent(tokenData.refresh_token) + 
            '&expires_in=' + encodeURIComponent(tokenData.expires_in));
        
    } catch (error) {
        console.error('Error during token exchange:', error);
        res.redirect('/#error=' + encodeURIComponent(error.message));
    }
});

// Token refresh endpoint
router.post('/refresh', async (req, res) => {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
        return res.status(400).json({ error: 'Refresh token is required' });
    }
    
    try {
        const clientId = process.env.SPOTIFY_CLIENT_ID;
        const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
        
        if (!clientId || !clientSecret) {
            console.error('Missing Spotify credentials');
            return res.status(500).json({ error: 'Server configuration error' });
        }
        
        console.log('Refreshing access token');
        
        // Exchange the refresh token for a new access token
        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token
            })
        });
        
        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error('Token refresh error:', tokenResponse.status, errorData);
            return res.status(tokenResponse.status).json({ error: 'Failed to refresh token' });
        }
        
        const tokenData = await tokenResponse.json();
        console.log('Successfully refreshed access token');
        
        // Return the new tokens
        res.json({
            access_token: tokenData.access_token,
            expires_in: tokenData.expires_in,
            refresh_token: tokenData.refresh_token || refresh_token // Use the new refresh token if provided, otherwise keep the old one
        });
        
    } catch (error) {
        console.error('Error during token refresh:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = {
    router,
    authenticate,
    verifyApiKey,
    verifySpotifyToken
};
