// Main Express Server Application
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const auth = require('./auth');
const playlistRoutes = require('./playlist');
const interactRoutes = require('./interact');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', auth.router);
app.use('/api/playlist', playlistRoutes);
app.use('/api/interact', interactRoutes);

// Simple test endpoint for Spotify authentication
app.get('/test-auth', (req, res) => {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = process.env.REDIRECT_URI;
    
    res.send(`
        <h1>Spotify Authentication Test</h1>
        <p>Current configuration:</p>
        <ul>
            <li>Client ID: ${clientId}</li>
            <li>Client Secret: ${clientSecret ? '******' + clientSecret.slice(-4) : 'Not set'}</li>
            <li>Redirect URI: ${redirectUri}</li>
        </ul>
        <p>Click the button below to test Spotify authentication:</p>
        <a href="/api/auth/spotify" style="display: inline-block; padding: 10px 15px; background-color: #1DB954; color: white; text-decoration: none; border-radius: 4px;">Login with Spotify</a>
        <p>Or try the simplified test page: <a href="/spotify-test.html">Spotify Test Page</a></p>
    `);
});

// Root route
app.get('/', (req, res) => {
    // Check if this is a Spotify callback
    const code = req.query.code || null;
    const error = req.query.error || null;
    
    if (code) {
        // This is a Spotify callback
        console.log('Received Spotify auth code at root, forwarding to auth handler');
        return res.redirect(`/api/auth/callback?code=${code}`);
    } else if (error) {
        console.error('Error during Spotify authentication:', error);
        return res.redirect(`/#error=${error}`);
    }
    
    // Normal root request - serve the index.html file
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Handle Spotify callback at root level - keeping this for backward compatibility
app.get('/callback', (req, res) => {
    // Get the code from the query parameters
    const code = req.query.code || null;
    const error = req.query.error || null;
    
    if (error) {
        console.error('Error during Spotify authentication:', error);
        return res.redirect(`/#error=${error}`);
    }
    
    if (!code) {
        console.error('No code provided in callback');
        return res.redirect('/#error=invalid_code');
    }
    
    console.log('Received Spotify auth code, forwarding to auth handler');
    
    // Forward to the auth callback handler
    res.redirect(`/api/auth/callback?code=${code}`);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        error: {
            message: err.message || 'An unexpected error occurred',
            status: statusCode
        }
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to access the application`);
});

module.exports = app;
