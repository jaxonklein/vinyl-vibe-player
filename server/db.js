// Database Module for Replit DB (simulated with in-memory storage for local development)
const fs = require('fs').promises;
const path = require('path');

// In-memory database for local development
const inMemoryDB = {
    playlists: {},
    interactions: {},
    currentPlaylists: {}
};

// Directory for storing data files
const DATA_DIR = path.join(__dirname, '../data');

// Ensure data directory exists
async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (error) {
        console.error('Error creating data directory:', error);
    }
}

// Save data to file
async function saveToFile(filename, data) {
    await ensureDataDir();
    const filePath = path.join(DATA_DIR, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Load data from file
async function loadFromFile(filename) {
    await ensureDataDir();
    const filePath = path.join(DATA_DIR, filename);
    
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File doesn't exist yet, return empty object
            return {};
        }
        throw error;
    }
}

// Initialize database
async function initDB() {
    try {
        // Load data from files if they exist
        inMemoryDB.playlists = await loadFromFile('playlists.json');
        inMemoryDB.interactions = await loadFromFile('interactions.json');
        inMemoryDB.currentPlaylists = await loadFromFile('currentPlaylists.json');
        
        console.log('Database initialized');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

// Save a playlist
async function savePlaylist(userId, tracks, description) {
    if (!inMemoryDB.playlists[userId]) {
        inMemoryDB.playlists[userId] = [];
    }
    
    const playlist = {
        id: Date.now().toString(),
        description,
        tracks,
        createdAt: new Date().toISOString()
    };
    
    inMemoryDB.playlists[userId].unshift(playlist);
    
    // Save as current playlist
    inMemoryDB.currentPlaylists[userId] = tracks;
    
    // Save to files
    await saveToFile('playlists.json', inMemoryDB.playlists);
    await saveToFile('currentPlaylists.json', inMemoryDB.currentPlaylists);
    
    return playlist;
}

// Update a playlist
async function updatePlaylist(userId, tracks) {
    // Update current playlist
    inMemoryDB.currentPlaylists[userId] = tracks;
    
    // Save to file
    await saveToFile('currentPlaylists.json', inMemoryDB.currentPlaylists);
    
    return tracks;
}

// Get current playlist
async function getCurrentPlaylist(userId) {
    return inMemoryDB.currentPlaylists[userId] || [];
}

// Get playlist history
async function getPlaylistHistory(userId) {
    return inMemoryDB.playlists[userId] || [];
}

// Save an interaction
async function saveInteraction(userId, interaction) {
    if (!inMemoryDB.interactions[userId]) {
        inMemoryDB.interactions[userId] = [];
    }
    
    inMemoryDB.interactions[userId].unshift(interaction);
    
    // Limit history to 100 interactions per user
    if (inMemoryDB.interactions[userId].length > 100) {
        inMemoryDB.interactions[userId] = inMemoryDB.interactions[userId].slice(0, 100);
    }
    
    // Save to file
    await saveToFile('interactions.json', inMemoryDB.interactions);
    
    return interaction;
}

// Get interaction history
async function getInteractionHistory(userId) {
    return inMemoryDB.interactions[userId] || [];
}

// Initialize the database when this module is imported
initDB();

module.exports = {
    savePlaylist,
    updatePlaylist,
    getCurrentPlaylist,
    getPlaylistHistory,
    saveInteraction,
    getInteractionHistory
};
