// Playlist Generation Module
const express = require('express');
const router = express.Router();
const { authenticate } = require('./auth');
const db = require('./db');
const openai = require('./openai');

// Middleware to authenticate requests
router.use(authenticate);

// POST endpoint to generate a playlist based on a description
router.post('/generate', async (req, res) => {
    try {
        const { description } = req.body;
        
        if (!description) {
            return res.status(400).json({ error: 'Description is required' });
        }
        
        console.log('Generating playlist for description:', description);
        
        // Use OpenAI to generate a playlist
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: `You are a music recommendation expert. Generate a playlist of 10 songs based on the user's description. 
                    For each song, include the following information in a JSON format:
                    1. id: A unique Spotify track ID (use real Spotify IDs if you know them, otherwise use a placeholder)
                    2. name: The name of the song
                    3. artist: The artist's name
                    4. uri: The Spotify URI in the format 'spotify:track:TRACK_ID' (use real URIs for popular songs)
                    
                    Here are some real Spotify track URIs for popular songs:
                    - "Billie Jean" by Michael Jackson: spotify:track:5ChkMS8OtdzJeqyybCc9R5
                    - "Bohemian Rhapsody" by Queen: spotify:track:7tFiyTwD0nx5a1eklYtX2J
                    - "Sweet Child O' Mine" by Guns N' Roses: spotify:track:7o2CTH4ctstm8TNelqjb51
                    - "Smells Like Teen Spirit" by Nirvana: spotify:track:5ghIJDpPoe3CfHMGu71E6T
                    - "Hotel California" by Eagles: spotify:track:40riOy7x9W7GXjyGp4pjAv
                    - "Imagine" by John Lennon: spotify:track:7pKfPomDEeI4TPT6EOYjn9
                    - "Like a Rolling Stone" by Bob Dylan: spotify:track:3AhXZa8sUQht0UEdBJgpGc
                    - "I Want to Hold Your Hand" by The Beatles: spotify:track:4pbG9SUmWIvsROVLF0zF9s
                    - "Thriller" by Michael Jackson: spotify:track:2LlQb7Uoj1kKyLZnCCXvyS
                    - "Stairway to Heaven" by Led Zeppelin: spotify:track:5CQ30WqJwcep0pYcV4AMNc
                    - "Respect" by Aretha Franklin: spotify:track:7s25THrKz86DM225dOYwnr
                    - "Dancing Queen" by ABBA: spotify:track:0GjEhVFGZW8afUYGChu3Rr
                    - "Purple Haze" by Jimi Hendrix: spotify:track:0wJoRiX5K5BxlqZTolB2LD
                    - "Take On Me" by a-ha: spotify:track:2WfaOiMkCvy7F5fcp2zZ8L
                    - "Every Breath You Take" by The Police: spotify:track:1JSTJqkT5qHq8MDJnJbRE1
                    - "Livin' on a Prayer" by Bon Jovi: spotify:track:0J6mQxEZnlRt9ymzFntA6z
                    - "Sweet Dreams (Are Made of This)" by Eurythmics: spotify:track:1TfqLAPs4K3s2rJMoCokcS
                    - "I Will Always Love You" by Whitney Houston: spotify:track:4eHbdreAnSOrDDsFfc4Fpm
                    - "Superstition" by Stevie Wonder: spotify:track:1YQGBu0P5NhxVETYrklthE
                    - "Waterloo" by ABBA: spotify:track:5P68BrqKFCpNXaYLBRTt2C
                    
                    Return the playlist as a JSON array of song objects.`
                },
                {
                    role: "user",
                    content: `Generate a playlist based on this description: "${description}"`
                }
            ],
            temperature: 0.7,
            max_tokens: 1000,
            response_format: { type: "json_object" }
        });
        
        // Parse the response
        const playlistData = JSON.parse(completion.choices[0].message.content);
        
        if (!playlistData.playlist || !Array.isArray(playlistData.playlist)) {
            console.error('Invalid playlist format from OpenAI:', playlistData);
            return res.status(500).json({ error: 'Failed to generate playlist' });
        }
        
        // Ensure each track has a URI
        const playlist = playlistData.playlist.map((track, index) => {
            // If no URI is provided, create a mock one
            if (!track.uri) {
                track.uri = `spotify:track:mock${index + 1}`;
            }
            return track;
        });
        
        console.log('Generated', playlist.length, 'tracks');
        console.log('First track with URI:', playlist[0]);
        
        // Store the playlist in the database
        // Get user ID from the token (or use a default for testing)
        const userId = req.token ? req.token.substring(0, 10) : 'test_user';
        
        // Save the playlist using the existing method
        await db.savePlaylist(userId, playlist, description);
        
        res.json({ success: true, playlist });
        
    } catch (error) {
        console.error('Error generating playlist:', error);
        res.status(500).json({ error: 'Failed to generate playlist' });
    }
});

// GET endpoint to retrieve a user's current playlist
router.get('/', async (req, res, next) => {
    try {
        // Get user ID (in a real app, this would come from the token)
        const userId = req.token.substring(0, 10); // Mock user ID for demo
        
        // Get user's current playlist
        const playlist = await db.getCurrentPlaylist(userId);
        
        console.log(`Retrieved current playlist with ${playlist.length} tracks`);
        
        // Ensure all tracks have URIs
        const playlistWithUris = playlist.map(track => {
            if (!track.uri && track.id) {
                track.uri = `spotify:track:${track.id}`;
            }
            return track;
        });
        
        if (playlistWithUris.length > 0) {
            console.log('First track with URI:', playlistWithUris[0]);
        }
        
        res.json({
            tracks: playlistWithUris
        });
        
    } catch (error) {
        console.error('Error retrieving current playlist:', error);
        next(error);
    }
});

// GET endpoint to retrieve a user's playlists
router.get('/history', async (req, res, next) => {
    try {
        // Get user ID (in a real app, this would come from the token)
        const userId = req.token.substring(0, 10); // Mock user ID for demo
        
        // Get user's playlist history
        const playlists = await db.getPlaylistHistory(userId);
        
        // Ensure all tracks have URIs
        const playlistsWithUris = playlists.map(playlist => {
            return playlist.map(track => {
                if (!track.uri && track.id) {
                    track.uri = `spotify:track:${track.id}`;
                }
                return track;
            });
        });
        
        res.json({
            playlists: playlistsWithUris
        });
        
    } catch (error) {
        console.error('Error retrieving playlist history:', error);
        next(error);
    }
});

module.exports = router;
