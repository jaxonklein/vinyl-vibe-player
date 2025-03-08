/**
 * engine-integration.js
 * Integrates the recommendation engine with the Vinyl Vibe player
 */

import RecommendationEngine from './engine/RecommendationEngine.js';
import debugLogger from './engine/DebugLogger.js';
import { spotifyAuthState, playSpotifyTrack } from './spotify-auth.js';

// Initialize the recommendation engine
let engine;
// Track Spotify playback state
let spotifyPlayer = null;
let currentSpotifyTrack = null;

// DOM Elements
const carousel = document.querySelector('.carousel');
const addSeedBtn = document.querySelector('.add-seed');
const slidersHeader = document.querySelector('.sliders-header');
const slidersContent = document.querySelector('.sliders-content');
const sliders = document.querySelectorAll('input[type="range"]');
const resetSlidersBtn = document.querySelector('.reset-sliders');
const addSeedModal = document.querySelector('.add-seed-modal');
const seedInput = document.getElementById('seed-input');
const apiKeyInput = document.getElementById('api-key-input');
const cancelSeedBtn = document.getElementById('cancel-seed');
const submitSeedBtn = document.getElementById('submit-seed');
const startButton = document.querySelector('.start-button');

// Debug mode
const DEBUG = true;
function log(...args) {
    if (DEBUG) {
        console.log('[Vinyl Vibe Engine]', ...args);
        
        // Add to debug panel if it exists
        const debugOutput = document.getElementById('debug-output');
        if (debugOutput) {
            const timestamp = new Date().toISOString().substr(11, 8);
            const message = `[${timestamp}] [Engine] ${args.join(' ')}`;
            debugOutput.innerHTML += message + '\n';
            
            // Auto-scroll to bottom
            debugOutput.scrollTop = debugOutput.scrollHeight;
        }
    }
}

/**
 * Initialize the recommendation engine
 */
async function initEngine() {
    log('Initializing recommendation engine');
    
    // Initialize debug logger
    debugLogger.init();
    
    // For testing purposes, let's use a direct API key approach
    // This is only for development - in production, we should always use the server endpoint
    const DEBUG_MODE = true;
    let apiKey = localStorage.getItem('vinylVibeApiKey');
    
    // Try multiple methods to get the API key
    if (!apiKey) {
        try {
            console.log('Fetching API key using multiple methods...');
            log('Fetching API key...');
            
            // Method 1: Direct fetch from server endpoint
            try {
                console.log('Method 1: Direct fetch from /api/config');
                const response = await fetch('/api/config');
                console.log('API response status:', response.status);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('API data received:', !!data);
                    
                    if (data && data.openaiApiKey && data.openaiApiKey.trim() !== '') {
                        apiKey = data.openaiApiKey;
                        localStorage.setItem('vinylVibeApiKey', apiKey);
                        console.log('API key successfully retrieved from server endpoint');
                        log('API key retrieved from server');
                    }
                }
            } catch (endpointError) {
                console.error('Endpoint fetch error:', endpointError);
            }
            
            // Method 2: For development/testing only - use safer approach
            if (!apiKey && DEBUG_MODE) {
                console.log('Method 2: No API key found. Please enter one manually or check server configuration.');
                log('API key not found. Please enter it manually.');
            }
        } catch (error) {
            console.error('All API key retrieval methods failed:', error);
            log('Failed to retrieve API key through any method');
        }

    }
    
    // Set the API key input value if we have one
    if (apiKeyInput && apiKey) {
        apiKeyInput.value = apiKey;
    }
    
    // If we still don't have an API key, don't try to initialize the engine
    if (!apiKey) {
        log('No API key available. Please enter one manually or check server configuration.');
        alert('Error: No API key provided. A valid OpenAI API key is required.');
        return;
    } else {
        console.log('SUCCESS: API key found and ready to use');
        log('API key successfully found and ready to use');
    }
    

    try {
        // Create engine instance
        engine = new RecommendationEngine({
            apiKey: apiKey,
            debug: true,
            onPlaylistUpdated: (playlist) => {
                log('Playlist updated', playlist);
                updateCarousel(playlist);
            },
            onError: (error) => {
                log('Engine error', error);
                alert(`Error: ${error.message}`);
            }
        });
        
        // Make engine globally accessible
        window.engine = engine;
        
        debugLogger.log('Recommendation engine initialized', 'info');
        
        // Map slider values to engine sliders
        mapSlidersToEngine();
        
        // Bind event handlers
        bindEngineEvents();
        
        log('Recommendation engine initialized');
        debugLogger.log('Recommendation engine initialized', 'info');
    } catch (error) {
        log('Failed to initialize engine', error);
        debugLogger.log(`Failed to initialize engine: ${error.message}`, 'error');
        
        // Show error message to user
        if (error.message.includes('No API key provided')) {
            alert('A valid OpenAI API key is required to use this application. Please enter your API key when prompted.');
        } else {
            alert(`Error initializing recommendation engine: ${error.message}`);
        }
    }
}

/**
 * Map UI sliders to engine slider values
 */
function mapSlidersToEngine() {
    // Map slider elements to engine slider names
    const sliderMap = {
        'genre-variety': 'genreVariety',
        'artist-fame': 'artistFame',
        'theme-focus': 'themeFocus',
        'seed-artist-mix': 'seedArtistMix'
    };
    
    // Update engine when sliders change
    sliders.forEach(slider => {
        const engineName = sliderMap[slider.id];
        if (engineName) {
            // Set initial value from engine
            const initialValue = engine.getPreferences().sliders[engineName];
            if (initialValue !== undefined) {
                slider.value = initialValue;
            }
            
            // Add event listener for changes
            slider.addEventListener('input', () => {
                engine.handleSliderChange(engineName, parseInt(slider.value));
            });
        }
    });
    
    // Handle reset sliders button
    if (resetSlidersBtn) {
        resetSlidersBtn.addEventListener('click', () => {
            engine.resetSliders();
            
            // Update UI sliders with new values
            const defaultValues = engine.getPreferences().sliders;
            sliders.forEach(slider => {
                const engineName = sliderMap[slider.id];
                if (engineName && defaultValues[engineName] !== undefined) {
                    slider.value = defaultValues[engineName];
                }
            });
        });
    }
}

/**
 * Bind engine event handlers
 */
function bindEngineEvents() {
    log('Binding engine event handlers');
    
    // Add seed button
    if (addSeedBtn) {
        addSeedBtn.addEventListener('click', () => {
            openAddSeedModal();
        });
    }
    
    // Cancel seed button
    if (cancelSeedBtn) {
        cancelSeedBtn.addEventListener('click', () => {
            closeAddSeedModal();
        });
    }
    
    // Submit seed button
    if (submitSeedBtn) {
        submitSeedBtn.addEventListener('click', handleSeedSubmission);
    }
    
    // Allow pressing Enter in seed input
    if (seedInput) {
        seedInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSeedSubmission();
            }
        });
    }
    
    // Delegate event handling for song cards
    document.addEventListener('click', (event) => {
        // Feedback buttons (thumbs up/down and trait buttons)
        if (event.target.closest('.thumbs-up, .thumbs-down, .trait-btn')) {
            const button = event.target.closest('.thumbs-up, .thumbs-down, .trait-btn');
            const card = button.closest('.song-card');
            
            if (card) {
                const songId = card.dataset.songId;
                const trait = button.dataset.trait || 'general';
                const value = button.dataset.value || (button.classList.contains('thumbs-up') ? '+' : '-');
                
                // Process feedback
                engine.handleFeedback(songId, trait, value);
            }
        }
        
        // Cooldown toggle
        if (event.target.closest('.cooldown')) {
            const cooldownSpan = event.target.closest('.cooldown');
            const card = cooldownSpan.closest('.song-card');
            
            if (card) {
                const songId = card.dataset.songId;
                engine.cooldownManager.cycleCooldown(songId);
            }
        }
    });
}

/**
 * Handle seed submission
 */
function handleSeedSubmission() {
    const seedValue = seedInput.value.trim();
    const apiKey = apiKeyInput.value.trim();
    
    if (!seedValue) {
        alert('Please enter a seed value');
        return;
    }
    
    if (!apiKey) {
        alert('A valid OpenAI API key is required. Please enter your API key.');
        return;
    }
    
    try {
        // Save API key to localStorage
        localStorage.setItem('vinylVibeApiKey', apiKey);
        
        // Update engine with new API key
        engine.updateConfig({ apiKey });
        
        // Generate from seed
        engine.generateFromSeed({
            type: 'text',
            value: seedValue
        });
        
        // Close modal
        closeAddSeedModal();
    } catch (error) {
        log('Error submitting seed', error);
        debugLogger.log(`Error submitting seed: ${error.message}`, 'error');
        alert(`Error: ${error.message}`);
    }
}

/**
 * Open add seed modal
 */
function openAddSeedModal() {
    if (addSeedModal) {
        addSeedModal.style.display = 'flex';
        if (seedInput) {
            seedInput.focus();
        }
    }
}

// Make openAddSeedModal globally accessible
window.openAddSeedModal = openAddSeedModal;
try {
    // This might fail in strict mode, so we wrap it in try/catch
    openAddSeedModal = window.openAddSeedModal;
} catch (e) {
    console.log('Could not set global openAddSeedModal, using window.openAddSeedModal instead');
}

/**
 * Close add seed modal
 */
function closeAddSeedModal() {
    if (addSeedModal) {
        addSeedModal.style.display = 'none';
        if (seedInput) {
            seedInput.value = '';
        }
    }
}

// Make closeAddSeedModal globally accessible
window.closeAddSeedModal = closeAddSeedModal;
try {
    // This might fail in strict mode, so we wrap it in try/catch
    closeAddSeedModal = window.closeAddSeedModal;
} catch (e) {
    console.log('Could not set global closeAddSeedModal, using window.closeAddSeedModal instead');
}

/**
 * Play a song from the playlist
 * @param {number} index - Song index in playlist
 */
function playSong(index) {
    if (!engine) return;
    
    const song = engine.playSong(index);
    if (song) {
        log(`Playing song: ${song.song} by ${song.artist}`);
        
        // Update UI to show now playing
        updateNowPlayingUI(song);
        
        // If Spotify is connected, try to play the song through Spotify
        if (spotifyAuthState.isAuthenticated) {
            playViaSpotify(song);
        } else {
            // Fallback to simulation if Spotify is not connected
            simulateAudioPlayback();
        }
    }
}

/**
 * Play a song via Spotify
 * @param {Object} song - Song object with title and artist
 */
async function playViaSpotify(song) {
    if (!spotifyAuthState.isAuthenticated) {
        log('Spotify not authenticated, falling back to simulation');
        simulateAudioPlayback();
        return;
    }
    
    try {
        log(`Searching Spotify for: ${song.song} by ${song.artist}`);
        
        // Add debug info about Spotify state
        log(`Spotify auth state: ${JSON.stringify({
            isAuthenticated: spotifyAuthState.isAuthenticated,
            hasAccessToken: !!spotifyAuthState.accessToken,
            hasDeviceId: !!spotifyAuthState.deviceId,
            deviceId: spotifyAuthState.deviceId,
            tokenExpiry: spotifyAuthState.expiresAt ? new Date(spotifyAuthState.expiresAt).toISOString() : 'none'
        })}`);
        
        // Improve search query with exact match
        // First try with exact track and artist
        const exactQuery = encodeURIComponent(`track:"${song.song}" artist:"${song.artist}"`);
        const exactSearchUrl = `https://api.spotify.com/v1/search?q=${exactQuery}&type=track&limit=1`;
        
        log(`Searching Spotify API with exact match: ${exactSearchUrl}`);
        
        let response = await fetch(exactSearchUrl, {
            headers: {
                'Authorization': `Bearer ${spotifyAuthState.accessToken}`
            }
        });
        
        let data;
        let foundExactMatch = false;
        
        if (response.ok) {
            data = await response.json();
            if (data.tracks && data.tracks.items && data.tracks.items.length > 0) {
                log(`Found exact match on Spotify`);
                foundExactMatch = true;
            } else {
                log(`No exact matches found, trying broader search`);
            }
        } else {
            const statusText = `Status: ${response.status} ${response.statusText}`;
            log(`Exact match search failed: ${statusText}`);
        }
        
        // If exact match failed, try broader search
        if (!foundExactMatch) {
            // Try with a more general query
            const query = encodeURIComponent(`${song.song} ${song.artist}`);
            const searchUrl = `https://api.spotify.com/v1/search?q=${query}&type=track&limit=5`;
            
            log(`Searching Spotify API with broader search: ${searchUrl}`);
            
            response = await fetch(searchUrl, {
                headers: {
                    'Authorization': `Bearer ${spotifyAuthState.accessToken}`
                }
            });
            
            if (!response.ok) {
                const statusText = `Status: ${response.status} ${response.statusText}`;
                log(`Spotify search failed: ${statusText}`);
                throw new Error(`Spotify search failed: ${statusText}`);
            }
            
            data = await response.json();
            
            // Try to find the best match by comparing track and artist names
            if (data.tracks && data.tracks.items && data.tracks.items.length > 0) {
                log(`Found ${data.tracks.items.length} potential matches`);
                
                // Log all potential matches for debugging
                data.tracks.items.forEach((track, index) => {
                    log(`Match ${index + 1}: "${track.name}" by ${track.artists[0].name}`);
                });
                
                // Find best match by comparing track name and artist name
                const bestMatch = findBestMatch(data.tracks.items, song.song, song.artist);
                if (bestMatch) {
                    log(`Selected best match: "${bestMatch.name}" by ${bestMatch.artists[0].name}`);
                    data.tracks.items = [bestMatch];
                }
            }
        }
        
        if (data.tracks && data.tracks.items && data.tracks.items.length > 0) {
            const track = data.tracks.items[0];
            log(`Playing track on Spotify: "${track.name}" by ${track.artists[0].name} (${track.uri})`);
            
            // Store the current track
            currentSpotifyTrack = track;
            
            // Play the track
            log(`Attempting to play track: ${track.uri}`);
            const success = await playSpotifyTrack(track.uri);
            
            if (success) {
                log('Spotify playback started successfully');
                // Update UI to show playing state
                updatePlaybackUI(true);
                
                // Start progress simulation (we'll replace this with actual progress later)
                startProgressSimulation();
            } else {
                log('Spotify playback failed, falling back to simulation');
                simulateAudioPlayback();
            }
        } else {
            log(`No tracks found on Spotify for: ${song.song} by ${song.artist}`);
            simulateAudioPlayback();
        }
    } catch (error) {
        log(`Error playing via Spotify: ${error.message}`);
        simulateAudioPlayback();
    }
}

/**
 * Find the best match from a list of tracks based on song title and artist
 * @param {Array} tracks - List of Spotify track objects
 * @param {string} songTitle - Title to match
 * @param {string} artistName - Artist to match
 * @returns {Object|null} - Best matching track or null if no good match
 */
function findBestMatch(tracks, songTitle, artistName) {
    if (!tracks || tracks.length === 0) return null;
    
    // If only one result, return it
    if (tracks.length === 1) return tracks[0];
    
    // Normalize input for comparison
    const normalizedTitle = songTitle.toLowerCase().trim();
    const normalizedArtist = artistName.toLowerCase().trim();
    
    // Score each track based on title and artist match
    const scoredTracks = tracks.map(track => {
        const trackTitle = track.name.toLowerCase().trim();
        const trackArtist = track.artists[0].name.toLowerCase().trim();
        
        // Calculate similarity scores (0-1)
        const titleSimilarity = calculateSimilarity(normalizedTitle, trackTitle);
        const artistSimilarity = calculateSimilarity(normalizedArtist, trackArtist);
        
        // Weight title match slightly higher than artist
        const totalScore = (titleSimilarity * 0.6) + (artistSimilarity * 0.4);
        
        return {
            track,
            score: totalScore
        };
    });
    
    // Sort by score descending
    scoredTracks.sort((a, b) => b.score - a.score);
    
    // Log scores for debugging
    scoredTracks.forEach(item => {
        log(`Match score for "${item.track.name}" by ${item.track.artists[0].name}: ${item.score.toFixed(2)}`);
    });
    
    // Return the track with highest score if it's above threshold
    if (scoredTracks[0].score > 0.5) {
        return scoredTracks[0].track;
    }
    
    // Default to first track if no good match
    return tracks[0];
}

/**
 * Calculate similarity between two strings (0-1)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity score between 0 and 1
 */
function calculateSimilarity(str1, str2) {
    // Simple implementation - can be improved with more sophisticated algorithms
    if (str1 === str2) return 1.0;
    
    // Check if one is contained in the other
    if (str1.includes(str2) || str2.includes(str1)) {
        const longerLength = Math.max(str1.length, str2.length);
        const shorterLength = Math.min(str1.length, str2.length);
        return shorterLength / longerLength;
    }
    
    // Count matching words
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    
    let matchCount = 0;
    for (const word1 of words1) {
        if (word1.length <= 2) continue; // Skip short words
        for (const word2 of words2) {
            if (word2.length <= 2) continue;
            if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
                matchCount++;
                break;
            }
        }
    }
    
    return matchCount / Math.max(words1.length, words2.length);
}

/**
 * Update now playing UI
 * @param {Object} song - Song object
 */
function updateNowPlayingUI(song) {
    // Update now playing card
    const nowPlayingCard = document.querySelector('.song-card.now-playing');
    if (nowPlayingCard) {
        const songName = nowPlayingCard.querySelector('.song-name');
        const artistName = nowPlayingCard.querySelector('.song-artist');
        const songWhy = nowPlayingCard.querySelector('.song-why');
        
        if (songName) songName.textContent = `Name: ${song.song}`;
        if (artistName) artistName.textContent = `Artist: ${song.artist}`;
        if (songWhy) songWhy.textContent = `Why: ${song.reason || 'Based on your preferences'}`;
    }
    
    // Update track info in player
    const trackInfo = document.querySelector('.track-info');
    if (trackInfo) {
        trackInfo.textContent = `${song.song} - ${song.artist}`;
    }
}

/**
 * Simulate audio playback
 */
function simulateAudioPlayback() {
    // This would be replaced with actual audio playback
    const playPauseBtn = document.getElementById('play-pause-track');
    if (playPauseBtn) {
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        playPauseBtn.classList.add('playing');
    }
    
    // Simulate progress bar
    startProgressSimulation();
}

/**
 * Start progress bar simulation
 */
function startProgressSimulation() {
    // Clear any existing interval
    stopProgressSimulation();
    
    // Set up new interval
    let progress = 0;
    const progressBar = document.querySelector('.progress');
    
    if (progressBar) {
        window.audioInterval = setInterval(() => {
            progress += 0.5;
            if (progress > 100) {
                progress = 0;
                playNextSong();
            }
            progressBar.style.width = `${progress}%`;
        }, 500);
    }
}

/**
 * Stop progress bar simulation
 */
function stopProgressSimulation() {
    if (window.audioInterval) {
        clearInterval(window.audioInterval);
        window.audioInterval = null;
    }
}

/**
 * Play next song in playlist
 */
function playNextSong() {
    const state = engine.getState();
    const currentIndex = state.currentSongIndex || 0;
    const nextIndex = (currentIndex + 1) % state.playlist.length;
    
    playSong(nextIndex);
}

/**
 * Update the UI to reflect the current playback state
 * @param {boolean} isPlaying - Whether Spotify is currently playing
 */
function updatePlaybackUI(isPlaying) {
    log(`Updating UI to reflect playback state: ${isPlaying ? 'playing' : 'paused'}`);
    
    const playPauseBtn = document.getElementById('play-pause-track');
    if (playPauseBtn) {
        playPauseBtn.textContent = isPlaying ? '⏸️' : '▶️';
        if (isPlaying) {
            playPauseBtn.classList.add('playing');
        } else {
            playPauseBtn.classList.remove('playing');
        }
    }
    
    // Update progress bar animation
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        if (isPlaying) {
            progressBar.style.animationPlayState = 'running';
        } else {
            progressBar.style.animationPlayState = 'paused';
        }
    }
}

/**
 * Get current Spotify playback state
 * @returns {Promise<boolean>} - Whether Spotify is currently playing
 */
async function getSpotifyPlaybackState() {
    if (!spotifyAuthState.isAuthenticated) {
        return false;
    }
    
    try {
        const response = await fetch('https://api.spotify.com/v1/me/player', {
            headers: {
                'Authorization': `Bearer ${spotifyAuthState.accessToken}`
            }
        });
        
        if (response.status === 204) {
            log('No active device found');
            return false;
        }
        
        if (!response.ok) {
            log(`Failed to get playback state: ${response.status}`);
            return false;
        }
        
        const data = await response.json();
        const isPlaying = data.is_playing;
        log(`Current Spotify playback state: ${isPlaying ? 'playing' : 'paused'}`);
        
        // Update UI to reflect current state
        updatePlaybackUI(isPlaying);
        
        return isPlaying;
    } catch (error) {
        log(`Error getting playback state: ${error.message}`);
        return false;
    }
}

/**
 * Pause or resume Spotify playback
 */
async function toggleSpotifyPlayback() {
    if (!spotifyAuthState.isAuthenticated) {
        log('Spotify not authenticated');
        return false;
    }
    
    try {
        // Get current playback state
        const response = await fetch('https://api.spotify.com/v1/me/player', {
            headers: {
                'Authorization': `Bearer ${spotifyAuthState.accessToken}`
            }
        });
        
        if (response.status === 204) {
            log('No active device found');
            
            // Try to transfer playback to our device
            if (spotifyAuthState.deviceId) {
                log(`Transferring playback to device: ${spotifyAuthState.deviceId}`);
                
                const transferResponse = await fetch('https://api.spotify.com/v1/me/player', {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${spotifyAuthState.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        device_ids: [spotifyAuthState.deviceId],
                        play: true
                    })
                });
                
                if (!transferResponse.ok && transferResponse.status !== 204) {
                    log(`Failed to transfer playback: ${transferResponse.status}`);
                    return false;
                }
                
                log('Playback transferred successfully');
                updatePlaybackUI(true);
                return true;
            }
            
            return false;
        }
        
        if (!response.ok) {
            log(`Spotify API error: ${response.status}`);
            return false;
        }
        
        // Parse the response only if it has content
        let isPlaying = false;
        try {
            const data = await response.json();
            isPlaying = data.is_playing;
            log(`Current playback state: ${isPlaying ? 'playing' : 'paused'}`);
        } catch (e) {
            log(`Error parsing response: ${e.message}`);
            // Default to play if we can't determine state
            isPlaying = false;
        }
        
        // Toggle playback state
        const endpoint = isPlaying ? 'pause' : 'play';
        log(`Toggling playback: ${endpoint}`);
        
        const toggleResponse = await fetch(`https://api.spotify.com/v1/me/player/${endpoint}?device_id=${spotifyAuthState.deviceId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${spotifyAuthState.accessToken}`
            }
        });
        
        if (!toggleResponse.ok && toggleResponse.status !== 204) {
            log(`Failed to toggle playback: ${toggleResponse.status}`);
            return false;
        }
        
        log(`Spotify playback ${isPlaying ? 'paused' : 'resumed'}`);
        
        // Update UI to reflect new state
        updatePlaybackUI(!isPlaying);
        
        return true;
    } catch (error) {
        log(`Error toggling Spotify playback: ${error.message}`);
        return false;
    }
}

/**
 * Skip to next track on Spotify
 */
async function skipToNextSpotifyTrack() {
    if (!spotifyAuthState.isAuthenticated) {
        log('Spotify not authenticated');
        return false;
    }
    
    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/next', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${spotifyAuthState.accessToken}`
            }
        });
        
        if (!response.ok && response.status !== 204) {
            throw new Error(`Spotify API error: ${response.status}`);
        }
        
        log('Skipped to next track on Spotify');
        return true;
    } catch (error) {
        log(`Error skipping to next track: ${error.message}`);
        return false;
    }
}

/**
 * Skip to previous track on Spotify
 */
async function skipToPreviousSpotifyTrack() {
    if (!spotifyAuthState.isAuthenticated) {
        log('Spotify not authenticated');
        return false;
    }
    
    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/previous', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${spotifyAuthState.accessToken}`
            }
        });
        
        if (!response.ok && response.status !== 204) {
            throw new Error(`Spotify API error: ${response.status}`);
        }
        
        log('Skipped to previous track on Spotify');
        return true;
    } catch (error) {
        log(`Error skipping to previous track: ${error.message}`);
        return false;
    }
}

/**
 * Initialize the integration
 */
function init() {
    log('Initializing engine integration');
    
    // Initialize the engine
    initEngine();
    
    // Set up welcome card functionality - use event delegation for the start button
    document.addEventListener('click', (event) => {
        console.log('Click event:', event.target);
        if (event.target.classList.contains('start-button')) {
            console.log('Start button clicked!');
            log('Start button clicked');
            openAddSeedModal();
        }
    });
    
    // Bind event handlers
    bindEngineEvents();
    
    // Debug log
    debugLogger.log('Vinyl Vibe initialized. Ready to create your personalized playlist.', 'info');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize async
    initEngine().catch(error => {
        log('Error initializing engine:', error);
    });
    
    // Listen for Spotify ready event
    document.addEventListener('spotify-ready', (event) => {
        log('Spotify ready event received:', event.detail);
        spotifyPlayer = event.detail;
    });
});

// Export functions for use in other modules
window.playViaSpotify = playViaSpotify;
window.toggleSpotifyPlayback = toggleSpotifyPlayback;
window.getSpotifyPlaybackState = getSpotifyPlaybackState;
window.updatePlaybackUI = updatePlaybackUI;
window.spotifyAuthState = spotifyAuthState;
window.debugLogger = { log };

// Export functions
export { 
    engine, 
    playSong, 
    playNextSong, 
    toggleSpotifyPlayback, 
    skipToNextSpotifyTrack, 
    skipToPreviousSpotifyTrack 
};
