// Main JavaScript for the AI Music Player

// Enable verbose logging
const DEBUG = true;
function log(...args) {
    if (DEBUG) {
        console.log('[AI Music Player]', ...args);
    }
}

// Show a debug message on the UI for testing
function showDebugMessage(message) {
    const debugElement = document.getElementById('debug-message');
    if (debugElement) {
        debugElement.textContent = message;
        debugElement.style.display = 'block';
    } else {
        log('Debug element not found, creating one');
        const debugDiv = document.createElement('div');
        debugDiv.id = 'debug-message';
        debugDiv.style.position = 'fixed';
        debugDiv.style.bottom = '10px';
        debugDiv.style.left = '10px';
        debugDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
        debugDiv.style.color = 'white';
        debugDiv.style.padding = '10px';
        debugDiv.style.borderRadius = '5px';
        debugDiv.style.zIndex = '1000';
        debugDiv.style.maxWidth = '80%';
        debugDiv.style.overflow = 'auto';
        debugDiv.textContent = message;
        document.body.appendChild(debugDiv);
    }
}

// DOM Elements
const loginSection = document.getElementById('login-section');
const mainApp = document.getElementById('main-app');
const playerSection = document.getElementById('player-section');
const playlistForm = document.getElementById('playlist-form');
const playlistDescription = document.getElementById('playlist-description');
const playlistItems = document.getElementById('playlist-items');
const trackName = document.getElementById('track-name');
const artistName = document.getElementById('artist-name');
const albumCover = document.getElementById('album-cover');
const playerControls = document.querySelector('.player-controls');
const playPauseButton = document.getElementById('play-pause');
const thumbsUpButton = document.getElementById('thumbs-up');
const thumbsDownButton = document.getElementById('thumbs-down');
const skipButton = document.getElementById('skip');
const spotifyLoginButton = document.getElementById('spotify-login');
const apiKeyLoginButton = document.getElementById('api-key-login');
const apiKeyInput = document.getElementById('api-key');

// App State
let currentPlaylist = [];
let currentTrackIndex = 0;
let isPlaying = false;
let isAuthenticated = false;
let spotifyPlayer = null;
let deviceId = null;

// Parse hash parameters from URL (for Spotify authentication callback)
function getHashParams() {
    const hashParams = {};
    const hash = window.location.hash.substring(1);
    const params = hash.split('&');
    
    for (let i = 0; i < params.length; i++) {
        const pair = params[i].split('=');
        hashParams[pair[0]] = decodeURIComponent(pair[1] || '');
    }
    
    return hashParams;
}

// Handle Spotify authentication response
function handleAuthResponse() {
    log('Checking for auth response in URL');
    
    // Check if there's a hash in the URL (Spotify auth response)
    if (window.location.hash) {
        log('Hash found in URL, parsing auth response');
        
        // Parse the hash to get the access token
        const params = new URLSearchParams(window.location.hash.substring(1));
        const token = params.get('access_token');
        
        if (token) {
            log('Token found in URL hash');
            // Store the token in localStorage
            localStorage.setItem('spotify_token', token);
            isAuthenticated = true;
            
            // Clear the hash from the URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Update UI
            loginSection.style.display = 'none';
            mainApp.style.display = 'block';
            
            // Initialize Spotify player with the token
            initializeSpotifyPlayer(token);
            
            // Load user's current playlist
            loadCurrentPlaylist();
        } else {
            log('No token found in URL hash');
        }
    } else {
        log('No hash found in URL');
    }
}

// Check if user is already authenticated (e.g., from localStorage)
function checkAuthentication() {
    log('Checking authentication');
    
    // Check for Spotify authentication response in URL hash
    handleAuthResponse();
    
    const token = localStorage.getItem('spotify_token');
    
    if (token && token !== 'demo_token') {
        log('Token found in localStorage');
        isAuthenticated = true;
        loginSection.style.display = 'none';
        mainApp.style.display = 'block';
        
        // Load user's current playlist
        loadCurrentPlaylist();
    } else {
        log('No token found, showing login section');
        isAuthenticated = false;
        loginSection.style.display = 'block';
        mainApp.style.display = 'none';
    }
    
    // Log current authentication state
    log('Authentication state:', {
        isAuthenticated,
        hasSpotifyToken: !!localStorage.getItem('spotify_token')
    });
}

// Initialize Spotify Web Playback SDK
function initializeSpotifyPlayer(token) {
    log('Initializing Spotify Web Playback SDK with token');
    
    // Load the Spotify Web Playback SDK script if not already loaded
    if (!window.Spotify) {
        log('Loading Spotify Web Playback SDK script');
        const script = document.createElement('script');
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;
        document.body.appendChild(script);
        
        // Wait for the SDK to load
        window.onSpotifyWebPlaybackSDKReady = () => {
            log('Spotify Web Playback SDK loaded');
            createSpotifyPlayer(token);
        };
    } else {
        log('Spotify Web Playback SDK already loaded');
        createSpotifyPlayer(token);
    }
}

// Create the Spotify Player instance
function createSpotifyPlayer(token) {
    log('Creating Spotify Player instance');
    
    // Create the player
    spotifyPlayer = new Spotify.Player({
        name: 'AI Music Station',
        getOAuthToken: cb => { cb(token); },
        volume: 0.5
    });
    
    // Error handling
    spotifyPlayer.addListener('initialization_error', ({ message }) => {
        log('Spotify Player initialization error:', message);
        showDebugMessage(`Spotify Player initialization error: ${message}`);
    });
    
    spotifyPlayer.addListener('authentication_error', ({ message }) => {
        log('Spotify Player authentication error:', message);
        showDebugMessage(`Spotify authentication error: ${message}. Try logging in again.`);
        // Clear token and show login UI
        localStorage.removeItem('spotify_token');
        updateAuthUI();
    });
    
    spotifyPlayer.addListener('account_error', ({ message }) => {
        log('Spotify Player account error:', message);
        showDebugMessage(`Spotify account error: ${message}. Premium account required.`);
    });
    
    spotifyPlayer.addListener('playback_error', ({ message }) => {
        log('Spotify Player playback error:', message);
        showDebugMessage(`Spotify playback error: ${message}`);
    });
    
    // Playback status updates
    spotifyPlayer.addListener('player_state_changed', state => {
        if (!state) {
            log('Player state is null - no active playback');
            return;
        }
        
        log('Player state changed:', 
            state.paused ? 'paused' : 'playing', 
            'track:', state.track_window.current_track.name);
        
        isPlaying = !state.paused;
        updatePlayerUI();
        
        // Update current track info if it's different
        const currentTrack = state.track_window.current_track;
        if (currentTrack) {
            // Find the index of this track in our playlist
            const trackIndex = currentPlaylist.findIndex(track => 
                track.uri === currentTrack.uri || 
                track.id === currentTrack.id);
            
            if (trackIndex !== -1 && trackIndex !== currentTrackIndex) {
                log('Updating current track index to', trackIndex);
                currentTrackIndex = trackIndex;
                updatePlaylistUI();
            }
        }
    });
    
    // Ready
    spotifyPlayer.addListener('ready', ({ device_id }) => {
        log('Spotify Player ready with device ID:', device_id);
        deviceId = device_id;
        showDebugMessage('Spotify Player connected!');
        
        // Check if we need to transfer playback to this device
        checkAndTransferPlayback();
    });
    
    // Not Ready
    spotifyPlayer.addListener('not_ready', ({ device_id }) => {
        log('Spotify Player device ID has gone offline:', device_id);
        showDebugMessage('Spotify Player disconnected. Trying to reconnect...');
        
        // Try to reconnect
        setTimeout(() => {
            spotifyPlayer.connect();
        }, 2000);
    });
    
    // Connect to the player
    log('Connecting to Spotify Player...');
    spotifyPlayer.connect().then(success => {
        if (success) {
            log('Successfully connected to Spotify Player');
            showDebugMessage('Connected to Spotify!');
        } else {
            log('Failed to connect to Spotify Player');
            showDebugMessage('Failed to connect to Spotify. Please refresh the page and try again.');
        }
    });
}

// Check if we need to transfer playback to this device
function checkAndTransferPlayback() {
    if (!deviceId) {
        log('Cannot check playback: No device ID available');
        return;
    }
    
    log('Checking current playback state');
    
    fetch('https://api.spotify.com/v1/me/player', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('spotify_token')}`
        }
    })
    .then(response => {
        if (response.status === 204) {
            log('No active device found, transferring playback to this device');
            transferPlaybackToThisDevice();
            return null;
        }
        return response.json();
    })
    .then(data => {
        if (!data) return;
        
        log('Current playback state:', data);
        
        // If there's an active device but it's not this one, transfer playback
        if (data.device && data.device.id !== deviceId) {
            log('Active device is not this one, transferring playback');
            transferPlaybackToThisDevice();
        }
    })
    .catch(error => {
        log('Error checking playback state:', error);
    });
}

// Load user's current playlist
function loadCurrentPlaylist() {
    log('Loading current playlist');
    
    // Send request to backend
    fetch('/api/playlist', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('spotify_token')}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load playlist');
        }
        return response.json();
    })
    .then(data => {
        log('Received playlist data:', data);
        currentPlaylist = data.tracks;
        updatePlayerUI();
    })
    .catch(error => {
        log('Error loading playlist:', error);
        showDebugMessage(`Error loading playlist: ${error.message}`);
    });
}

// Handle Spotify Login
spotifyLoginButton.addEventListener('click', () => {
    log('Spotify login button clicked');
    
    // Spotify OAuth parameters
    const clientId = '540bd995048d4cf99698f3bfc82099e3'; // Client ID from .env file
    const redirectUri = encodeURIComponent(window.location.origin);
    const scopes = encodeURIComponent('streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state');
    
    // Build the Spotify authorization URL
    const spotifyAuthUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${redirectUri}&scope=${scopes}&show_dialog=true`;
    
    log('Redirecting to Spotify auth URL:', spotifyAuthUrl);
    window.location.href = spotifyAuthUrl;
});

// Handle API Key Login
apiKeyLoginButton.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const clientId = document.getElementById('client-id').value.trim();
    
    if (!clientId) {
        showDebugMessage('Please enter a valid Spotify Client ID');
        return;
    }
    
    log('Logging in with API key:', clientId);
    showDebugMessage('Logging in with API key...');
    
    try {
        // Store the client ID for future use
        localStorage.setItem('spotify_client_id', clientId);
        
        // Set a mock token and device ID
        const mockToken = `mock_token_${Date.now()}`;
        localStorage.setItem('spotify_token', mockToken);
        localStorage.setItem('auth_method', 'api_key');
        
        // Update UI to show logged in state
        isAuthenticated = true;
        updateAuthUI();
        
        // Try to initialize Spotify Web Playback SDK with the client ID
        // This might work if the client ID is valid and has the proper permissions
        try {
            log('Attempting to initialize Spotify Web Playback SDK with client ID');
            
            // Load the Spotify Web Playback SDK script
            const script = document.createElement('script');
            script.src = 'https://sdk.scdn.co/spotify-player.js';
            script.async = true;
            document.body.appendChild(script);
            
            // Set up the SDK ready callback
            window.onSpotifyWebPlaybackSDKReady = () => {
                log('Spotify Web Playback SDK loaded, attempting to create player');
                
                // Try to create a player with the mock token
                try {
                    spotifyPlayer = new Spotify.Player({
                        name: 'AI Music Station',
                        getOAuthToken: cb => { 
                            // Use the stored token or generate a new mock token
                            cb(localStorage.getItem('spotify_token')); 
                        },
                        volume: 0.5
                    });
                    
                    // Set up event listeners
                    spotifyPlayer.addListener('initialization_error', ({ message }) => {
                        log('Spotify Player initialization error:', message);
                        showDebugMessage(`Spotify Player initialization error: ${message}`);
                        
                        // Fall back to mock device ID
                        useMockDeviceId();
                    });
                    
                    spotifyPlayer.addListener('authentication_error', ({ message }) => {
                        log('Spotify Player authentication error:', message);
                        showDebugMessage(`Spotify authentication error: ${message}`);
                        
                        // Fall back to mock device ID
                        useMockDeviceId();
                    });
                    
                    spotifyPlayer.addListener('ready', ({ device_id }) => {
                        log('Spotify Player ready with device ID:', device_id);
                        deviceId = device_id;
                        showDebugMessage('Spotify Player connected!');
                    });
                    
                    // Connect to the player
                    spotifyPlayer.connect().then(success => {
                        if (success) {
                            log('Successfully connected to Spotify Player');
                            showDebugMessage('Connected to Spotify!');
                        } else {
                            log('Failed to connect to Spotify Player');
                            
                            // Fall back to mock device ID
                            useMockDeviceId();
                        }
                    }).catch(error => {
                        log('Error connecting to Spotify Player:', error);
                        
                        // Fall back to mock device ID
                        useMockDeviceId();
                    });
                    
                } catch (error) {
                    log('Error creating Spotify Player:', error);
                    
                    // Fall back to mock device ID
                    useMockDeviceId();
                }
            };
            
            // Set a timeout to fall back to mock device ID if SDK doesn't initialize
            setTimeout(() => {
                if (!deviceId) {
                    log('Spotify Web Playback SDK did not initialize in time');
                    useMockDeviceId();
                }
            }, 5000);
            
        } catch (error) {
            log('Error initializing Spotify Web Playback SDK:', error);
            
            // Fall back to mock device ID
            useMockDeviceId();
        }
        
    } catch (error) {
        log('Error during API key login:', error);
        showDebugMessage(`Error during login: ${error.message}`);
    }
});

// Function to use a mock device ID as fallback
function useMockDeviceId() {
    log('Using mock device ID as fallback');
    showDebugMessage('Using limited functionality mode (no audio playback)');
    
    deviceId = 'mock_device_id';
    
    // Load the current playlist if available
    loadCurrentPlaylist();
}

// Handle Playlist Form Submission
playlistForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const description = playlistDescription.value.trim();
    
    if (!description) {
        showDebugMessage('Please enter a playlist description');
        return;
    }
    
    log('Generating playlist for description:', description);
    showDebugMessage('Generating playlist...');
    
    // Disable form while generating
    playlistDescription.disabled = true;
    playlistSubmit.disabled = true;
    
    try {
        // Call the API to generate a playlist
        const response = await fetch('/api/playlist/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('spotify_token')}`
            },
            body: JSON.stringify({ description })
        });
        
        if (!response.ok) {
            throw new Error(`Error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        log('Playlist generated:', data);
        
        // Update the UI with the new playlist
        currentPlaylist = data.playlist;
        currentTrackIndex = 0;
        
        // Save the playlist to localStorage
        localStorage.setItem('current_playlist', JSON.stringify(currentPlaylist));
        localStorage.setItem('current_track_index', currentTrackIndex);
        
        // Update the UI
        updatePlaylistUI();
        
        // Play the first track
        if (currentPlaylist.length > 0) {
            playTrack(currentPlaylist[0]);
        }
        
        showDebugMessage('Playlist generated successfully!');
        
    } catch (error) {
        log('Error generating playlist:', error);
        showDebugMessage(`Error generating playlist: ${error.message}`);
    } finally {
        // Re-enable form
        playlistDescription.disabled = false;
        playlistSubmit.disabled = false;
    }
});

// Update Player UI with current track
function updatePlayerUI() {
    if (currentPlaylist.length === 0) {
        return;
    }
    
    const currentTrack = currentPlaylist[currentTrackIndex];
    
    // Update track info
    trackName.textContent = currentTrack.name || 'Unknown Track';
    artistName.textContent = currentTrack.artist || 'Unknown Artist';
    
    // Update album cover if available
    if (currentTrack.albumCover) {
        albumCover.src = currentTrack.albumCover;
    } else {
        albumCover.src = 'placeholder-album.png';
    }
    
    // Update play/pause button
    playPauseButton.textContent = isPlaying ? '⏸️' : '▶️';
    
    // Update playlist items
    playlistItems.innerHTML = '';
    
    currentPlaylist.forEach((track, index) => {
        const li = document.createElement('li');
        li.textContent = `${track.name || 'Unknown Track'} - ${track.artist || 'Unknown Artist'}`;
        
        if (index === currentTrackIndex) {
            li.style.fontWeight = 'bold';
            li.style.color = 'var(--primary-color)';
        }
        
        playlistItems.appendChild(li);
    });
}

// Update the playlist UI with current playlist
function updatePlaylistUI() {
    // Clear existing playlist items
    playlistItems.innerHTML = '';
    
    // Add each track to the playlist UI
    currentPlaylist.forEach((track, index) => {
        const li = document.createElement('li');
        li.className = index === currentTrackIndex ? 'current-track' : '';
        
        // Create track info
        const trackInfo = document.createElement('div');
        trackInfo.className = 'track-info-small';
        
        // Track name
        const trackNameEl = document.createElement('div');
        trackNameEl.className = 'track-name-small';
        trackNameEl.textContent = track.name || 'Unknown Track';
        trackInfo.appendChild(trackNameEl);
        
        // Artist name
        const artistNameEl = document.createElement('div');
        artistNameEl.className = 'artist-name-small';
        
        // Handle missing or malformed artists property
        let artistText = 'Unknown Artist';
        if (track.artists) {
            if (Array.isArray(track.artists)) {
                artistText = track.artists
                    .map(artist => (artist && artist.name) || 'Unknown')
                    .join(', ');
            } else if (typeof track.artists === 'string') {
                artistText = track.artists;
            } else if (track.artists.name) {
                artistText = track.artists.name;
            }
        } else if (track.artist) {
            // Some APIs might use 'artist' instead of 'artists'
            artistText = typeof track.artist === 'string' ? track.artist : 
                         (track.artist.name || 'Unknown Artist');
        }
        
        artistNameEl.textContent = artistText;
        trackInfo.appendChild(artistNameEl);
        
        li.appendChild(trackInfo);
        
        // Add click event to play this track
        li.addEventListener('click', () => {
            currentTrackIndex = index;
            playTrack(track);
        });
        
        playlistItems.appendChild(li);
    });
    
    log('Updated playlist UI with', currentPlaylist.length, 'tracks');
}

// Update Now Playing UI
function updateNowPlaying(track) {
    if (!track) return;
    
    // Update track name
    trackName.textContent = track.name || 'Unknown Track';
    
    // Update artist name with error handling
    let artistText = 'Unknown Artist';
    if (track.artists) {
        if (Array.isArray(track.artists)) {
            artistText = track.artists
                .map(artist => (artist && artist.name) || 'Unknown')
                .join(', ');
        } else if (typeof track.artists === 'string') {
            artistText = track.artists;
        } else if (track.artists.name) {
            artistText = track.artists.name;
        }
    } else if (track.artist) {
        artistText = typeof track.artist === 'string' ? track.artist : 
                     (track.artist.name || 'Unknown Artist');
    }
    artistName.textContent = artistText;
    
    // Update album cover
    if (track.album && track.album.images && track.album.images.length > 0) {
        albumCover.src = track.album.images[0].url;
    } else if (track.image) {
        albumCover.src = track.image;
    } else {
        albumCover.src = 'placeholder-album.png';
    }
}

// Handle play/pause button click
playPauseButton.addEventListener('click', () => {
    log('Play/Pause button clicked. Current state:', isPlaying ? 'playing' : 'paused');
    
    if (!deviceId) {
        log('No Spotify device ID available');
        showDebugMessage('Error: No Spotify device ID available');
        return;
    }
    
    if (!isAuthenticated) {
        log('Not authenticated with Spotify');
        showDebugMessage('Error: Not authenticated with Spotify');
        return;
    }
    
    if (currentPlaylist.length === 0) {
        log('No playlist available');
        showDebugMessage('Error: No playlist available');
        return;
    }
    
    const token = localStorage.getItem('spotify_token');
    
    if (isPlaying) {
        // Pause playback
        log('Pausing playback');
        showDebugMessage('Pausing...');
        
        fetch('https://api.spotify.com/v1/me/player/pause', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) {
                    log('No active device found, trying with device ID');
                    return fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                }
                return response.json().then(data => {
                    const errorMsg = data.error?.message || 'Unknown error';
                    log('Spotify API error when pausing:', errorMsg, data);
                    showDebugMessage(`Spotify API error: ${errorMsg}`);
                    throw new Error(`Spotify API error: ${errorMsg}`);
                }).catch(() => {
                    throw new Error(`Spotify API error: Status ${response.status}`);
                });
            }
            log('Pause successful');
            isPlaying = false;
            updatePlayerUI();
            return response;
        })
        .catch(error => {
            log('Error pausing playback:', error);
            showDebugMessage(`Error pausing: ${error.message}`);
        });
    } else {
        // Resume or start playback
        log('Starting/resuming playback');
        showDebugMessage('Playing...');
        
        // If we have a current track, play it, otherwise play the first track
        const trackToPlay = currentPlaylist[currentTrackIndex];
        
        if (trackToPlay) {
            log('Playing track:', trackToPlay.name || 'Unknown Track');
            playTrack(trackToPlay);
        } else {
            log('No track available at current index, resetting to first track');
            currentTrackIndex = 0;
            playTrack(currentPlaylist[0]);
        }
    }
});

// Thumbs Up button
thumbsUpButton.addEventListener('click', async () => {
    if (currentPlaylist.length === 0) return;
    
    try {
        // Send thumbs up action to backend
        const response = await fetch('/api/interact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('spotify_token') || localStorage.getItem('spotify_api_key')}`
            },
            body: JSON.stringify({ 
                action: 'thumbsUp',
                trackId: currentPlaylist[currentTrackIndex].id
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to send thumbs up');
        }
        
        const data = await response.json();
        
        // Update playlist if it was updated by the server
        if (data.updatedPlaylist) {
            currentPlaylist = data.updatedPlaylist;
            updatePlayerUI();
        }
        
        // Visual feedback
        thumbsUpButton.classList.add('active');
        setTimeout(() => {
            thumbsUpButton.classList.remove('active');
        }, 1000);
        
    } catch (error) {
        console.error('Error sending thumbs up:', error);
    }
});

// Thumbs Down button
thumbsDownButton.addEventListener('click', async () => {
    if (currentPlaylist.length === 0) return;
    
    try {
        // Send thumbs down action to backend
        const response = await fetch('/api/interact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('spotify_token') || localStorage.getItem('spotify_api_key')}`
            },
            body: JSON.stringify({ 
                action: 'thumbsDown',
                trackId: currentPlaylist[currentTrackIndex].id
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to send thumbs down');
        }
        
        const data = await response.json();
        
        // Update playlist if it was updated by the server
        if (data.updatedPlaylist) {
            currentPlaylist = data.updatedPlaylist;
            
            // If the current track was removed, play the next one
            if (!currentPlaylist.find(track => track.id === currentPlaylist[currentTrackIndex].id)) {
                playNextTrack();
            } else {
                updatePlayerUI();
            }
        }
        
        // Visual feedback
        thumbsDownButton.classList.add('active');
        setTimeout(() => {
            thumbsDownButton.classList.remove('active');
        }, 1000);
        
    } catch (error) {
        console.error('Error sending thumbs down:', error);
    }
});

// Skip button
skipButton.addEventListener('click', async () => {
    if (currentPlaylist.length === 0) return;
    
    log('Skipping to next track');
    
    // Move to next track (with wrap-around)
    currentTrackIndex = (currentTrackIndex + 1) % currentPlaylist.length;
    
    // If we're using Spotify and we were playing, start the new track
    const token = localStorage.getItem('spotify_token');
    if (token && token !== 'demo_token' && deviceId && isPlaying) {
        log('Playing next track using Spotify');
        playTrack(currentPlaylist[currentTrackIndex]);
    } else {
        log('Updating UI only (not using Spotify)');
        // Just update the UI
        updatePlayerUI();
    }
});

// Play next track
function playNextTrack() {
    if (currentPlaylist.length === 0) return;
    
    currentTrackIndex = (currentTrackIndex + 1) % currentPlaylist.length;
    
    // If using Spotify SDK, play the next track
    if (spotifyPlayer && deviceId) {
        const token = localStorage.getItem('spotify_token');
        if (token && token !== 'demo_token') {
            fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    uris: [currentPlaylist[currentTrackIndex].uri]
                })
            }).catch(error => console.error('Error playing next track:', error));
        }
    }
    
    updatePlayerUI();
}

// Play a track
async function playTrack(track) {
    if (!track || !track.uri) {
        log('Cannot play track: No track or URI provided', track);
        showDebugMessage('Cannot play track: Missing track information');
        return;
    }
    
    log('Attempting to play track:', track.name, 'by', track.artist, 'URI:', track.uri);
    showDebugMessage(`Playing: ${track.name} by ${track.artist}`);
    
    // Make sure we have a device ID
    if (!deviceId) {
        log('No Spotify device ID available. Attempting to reconnect...');
        showDebugMessage('No Spotify device ID available. Reconnecting...');
        
        // Try to reconnect to Spotify
        if (spotifyPlayer) {
            try {
                await spotifyPlayer.connect();
                log('Reconnected to Spotify player');
            } catch (error) {
                log('Failed to reconnect to Spotify player:', error);
                showDebugMessage('Failed to connect to Spotify. Please refresh the page and try again.');
                return;
            }
        } else {
            log('No Spotify player instance available');
            showDebugMessage('Spotify player not initialized. Please refresh the page and try again.');
            return;
        }
        
        // If still no device ID after reconnection attempt
        if (!deviceId) {
            log('Still no device ID after reconnection attempt');
            showDebugMessage('Could not connect to Spotify. Please make sure you have the Spotify app open or refresh the page.');
            return;
        }
    }
    
    try {
        // Check if the track URI is a mock URI
        if (track.uri.includes('mock')) {
            log('Cannot play mock track URI:', track.uri);
            showDebugMessage(`Cannot play track: ${track.name} has a mock URI. Please try another track.`);
            return;
        }
        
        log('Playing track with URI:', track.uri, 'on device:', deviceId);
        
        // Call the Spotify API to play the track
        const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('spotify_token')}`
            },
            body: JSON.stringify({
                uris: [track.uri]
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            log('Error playing track:', response.status, errorText);
            
            if (response.status === 401) {
                log('Token expired, refreshing...');
                showDebugMessage('Authentication expired. Refreshing token...');
                
                // Refresh token and try again
                await refreshToken();
                return playTrack(track);
            } else if (response.status === 403) {
                log('Received 403 error from Spotify API');
                
                try {
                    // Try to parse the error response for more details
                    const errorJson = JSON.parse(errorText);
                    log('Full error response:', errorJson);
                    
                    if (errorJson.error && errorJson.error.reason) {
                        log('Error reason:', errorJson.error.reason);
                        
                        if (errorJson.error.reason === 'PREMIUM_REQUIRED') {
                            showDebugMessage('Error: Spotify Premium account required to use the player');
                        } else {
                            showDebugMessage(`Spotify error: ${errorJson.error.message || errorJson.error.reason}`);
                        }
                    } else {
                        // Generic 403 error
                        showDebugMessage('Error: Permission denied by Spotify. Try logging out and back in.');
                    }
                } catch (e) {
                    log('Could not parse 403 error response:', errorText);
                    showDebugMessage('Error: Permission denied by Spotify (403)');
                }
                
                // Try to refresh the token and reconnect
                log('Attempting to refresh token and reconnect...');
                const reconnected = await reconnectToSpotify();
                
                if (reconnected) {
                    // Try playing the track again
                    log('Reconnected successfully, retrying playback');
                    setTimeout(() => playTrack(track), 1000);
                } else {
                    log('Failed to reconnect');
                    showDebugMessage('Failed to reconnect to Spotify. Try refreshing the page.');
                }
                
            } else if (response.status === 404) {
                log('Device not found');
                showDebugMessage('Error: Spotify device not found. Please make sure Spotify is open.');
            } else {
                showDebugMessage(`Error playing track: Spotify API error: Status ${response.status}`);
                
                // Try to parse the error response
                try {
                    const errorJson = JSON.parse(errorText);
                    if (errorJson.error && errorJson.error.message) {
                        log('Spotify error message:', errorJson.error.message);
                        showDebugMessage(`Spotify error: ${errorJson.error.message}`);
                    }
                } catch (e) {
                    log('Could not parse error response:', e);
                }
            }
            return;
        }
        
        log('Track playback started successfully');
        
        // Update the currently playing track
        trackName.textContent = track.name;
        artistName.textContent = track.artist;
        
        // Update album cover if available
        if (track.albumCover) {
            albumCover.src = track.albumCover;
            albumCover.style.display = 'block';
        } else {
            albumCover.style.display = 'none';
        }
        
        // Show the player controls
        playerControls.style.display = 'flex';
        
    } catch (error) {
        log('Error playing track:', error);
        showDebugMessage(`Error playing track: ${error.message}`);
        
        // If this is a device error, try to transfer playback to this device
        if (error.message.includes('NO_ACTIVE_DEVICE') || error.message.includes('device')) {
            log('Attempting to transfer playback to this device');
            transferPlaybackToThisDevice();
        }
    }
}

// Function to transfer playback to this device
function transferPlaybackToThisDevice() {
    if (!deviceId) {
        log('Cannot transfer playback: No device ID available');
        return;
    }
    
    log('Transferring playback to device:', deviceId);
    showDebugMessage('Transferring playback to this device...');
    
    fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('spotify_token')}`
        },
        body: JSON.stringify({
            device_ids: [deviceId],
            play: false
        })
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 204) {
                // 204 No Content is actually a success for this endpoint
                log('Successfully transferred playback (204 response)');
                showDebugMessage('Playback transferred to this device');
                return;
            }
            
            return response.text().then(text => {
                try {
                    const errorData = JSON.parse(text);
                    log('Error transferring playback:', errorData);
                    showDebugMessage(`Error transferring playback: ${errorData.error?.message || 'Unknown error'}`);
                } catch (e) {
                    log('Error transferring playback (not JSON):', text);
                    showDebugMessage(`Error transferring playback: Status ${response.status}`);
                }
                throw new Error(`Error transferring playback: Status ${response.status}`);
            });
        }
        
        log('Successfully transferred playback');
        showDebugMessage('Playback transferred to this device');
        
        // Try playing the current track again after a short delay
        setTimeout(() => {
            if (currentPlaylist.length > 0) {
                playTrack(currentPlaylist[currentTrackIndex]);
            }
        }, 1000);
    })
    .catch(error => {
        log('Error transferring playback:', error);
        showDebugMessage(`Error transferring playback: ${error.message}`);
    });
}

// Function to reconnect to Spotify
async function reconnectToSpotify() {
    log('Attempting to reconnect to Spotify...');
    showDebugMessage('Reconnecting to Spotify...');
    
    // Get a fresh token
    try {
        await refreshToken();
        log('Token refreshed, reinitializing player');
        
        // Reinitialize the player with the new token
        const token = localStorage.getItem('spotify_token');
        if (!token) {
            log('No token available after refresh');
            showDebugMessage('Failed to reconnect: No authentication token');
            return false;
        }
        
        // Disconnect existing player if any
        if (spotifyPlayer) {
            try {
                await spotifyPlayer.disconnect();
                log('Disconnected existing player');
            } catch (error) {
                log('Error disconnecting player:', error);
            }
        }
        
        // Create a new player
        spotifyPlayer = null;
        deviceId = null;
        
        // Initialize a new player
        initializeSpotifyPlayer(token);
        
        // Wait for the player to be ready
        return new Promise((resolve) => {
            // Set a timeout to resolve after 5 seconds if no device ID is set
            const timeout = setTimeout(() => {
                if (!deviceId) {
                    log('Timed out waiting for device ID');
                    resolve(false);
                }
            }, 5000);
            
            // Set up a listener for the device ID
            const checkInterval = setInterval(() => {
                if (deviceId) {
                    clearTimeout(timeout);
                    clearInterval(checkInterval);
                    log('Successfully reconnected, device ID:', deviceId);
                    showDebugMessage('Successfully reconnected to Spotify');
                    resolve(true);
                }
            }, 500);
        });
    } catch (error) {
        log('Error reconnecting to Spotify:', error);
        showDebugMessage('Failed to reconnect to Spotify');
        return false;
    }
}

// Function to refresh the Spotify access token
async function refreshToken() {
    log('Refreshing access token');
    
    const refreshToken = localStorage.getItem('spotify_refresh_token');
    if (!refreshToken) {
        log('No refresh token available');
        return false;
    }
    
    try {
        const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                refresh_token: refreshToken
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            log('Error refreshing token:', response.status, errorText);
            return false;
        }
        
        const data = await response.json();
        log('Token refreshed successfully');
        
        // Update tokens in localStorage
        localStorage.setItem('spotify_token', data.access_token);
        localStorage.setItem('spotify_token_timestamp', Date.now());
        localStorage.setItem('spotify_token_expires_in', data.expires_in);
        
        // Update refresh token if a new one was provided
        if (data.refresh_token) {
            localStorage.setItem('spotify_refresh_token', data.refresh_token);
        }
        
        return true;
    } catch (error) {
        log('Error refreshing token:', error);
        return false;
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    log('App initializing');
    
    // Check if the browser supports the Spotify Web Player
    checkSpotifyWebPlayerSupport();
    
    // Check if user is already authenticated
    checkAuthentication();
    
    // Add event listeners
    playlistForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const description = playlistDescription.value.trim();
        
        if (description) {
            log('Generating playlist with description:', description);
            showDebugMessage(`Generating playlist: "${description}"`);
            
            try {
                // Show loading state
                playlistForm.querySelector('button').disabled = true;
                playlistForm.querySelector('button').textContent = 'Generating...';
                
                // Make API request to generate playlist
                const response = await fetch('/api/playlist/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('spotify_token')}`
                    },
                    body: JSON.stringify({ description })
                });
                
                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }
                
                const data = await response.json();
                log('Playlist generated:', data);
                
                // Update the playlist
                currentPlaylist = data.playlist;
                currentTrackIndex = 0;
                
                // Show player section
                playerSection.style.display = 'block';
                
                // Update playlist UI
                updatePlaylistUI();
                
                // If we have a device ID, start playing
                if (deviceId) {
                    playTrack(currentPlaylist[currentTrackIndex]);
                } else {
                    log('No device ID available yet, waiting for Spotify to connect');
                    showDebugMessage('Waiting for Spotify to connect...');
                    
                    // Try to reconnect to Spotify
                    if (spotifyPlayer) {
                        spotifyPlayer.connect();
                    } else {
                        // If no player instance, try to reinitialize
                        const token = localStorage.getItem('spotify_token');
                        if (token) {
                            initializeSpotifyPlayer(token);
                        }
                    }
                }
                
            } catch (error) {
                log('Error generating playlist:', error);
                showDebugMessage(`Error generating playlist: ${error.message}`);
            } finally {
                // Reset form
                playlistForm.querySelector('button').disabled = false;
                playlistForm.querySelector('button').textContent = 'Generate Playlist';
            }
        }
    });
});

// Check if Spotify Web Player is supported in this browser
function checkSpotifyWebPlayerSupport() {
    // Check for Web Playback SDK requirements
    const isHttps = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    const hasWebAPI = 'fetch' in window && 'Proxy' in window;
    const hasMediaDevices = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
    const hasWebAudio = 'AudioContext' in window || 'webkitAudioContext' in window;
    
    log('Browser compatibility check:', {
        isHttps,
        hasWebAPI,
        hasMediaDevices,
        hasWebAudio
    });
    
    if (!isHttps) {
        showDebugMessage('Error: Spotify Web Player requires HTTPS (except on localhost)');
    }
    
    if (!hasWebAPI || !hasMediaDevices || !hasWebAudio) {
        showDebugMessage('Error: Your browser does not support all features required for Spotify Web Player');
    }
}

// Initialize with Spotify once SDK is ready
function initializeWithSpotify() {
    const token = localStorage.getItem('spotify_token');
    if (token && token !== 'demo_token') {
        log('Token found, initializing Spotify player');
        initializeSpotifyPlayer(token);
    } else {
        log('No token found, skipping Spotify player initialization');
    }
}
