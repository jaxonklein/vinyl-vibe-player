/**
 * spotify-auth.js
 * Handles Spotify authentication and integration with the Vinyl Vibe player
 * Using Authorization Code Flow
 */

// Debug mode
const DEBUG = true;
function log(...args) {
    if (DEBUG) {
        console.log('[Spotify Auth]', ...args);
        
        // Add to debug panel if it exists
        const debugOutput = document.getElementById('debug-output');
        if (debugOutput) {
            const timestamp = new Date().toISOString().substr(11, 8);
            const message = `[${timestamp}] [Spotify] ${args.join(' ')}`;
            debugOutput.innerHTML += message + '\n';
            
            // Auto-scroll to bottom
            debugOutput.scrollTop = debugOutput.scrollHeight;
        }
    }
}

// Spotify authentication state
let spotifyAuthState = {
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    deviceId: null,
    isAuthenticated: false,
    player: null
};

// Initialize Spotify authentication
function initSpotifyAuth() {
    log('Initializing Spotify authentication');
    
    // Load auth state from storage
    loadAuthStateFromStorage();
    
    // Check if we're returning from Spotify auth
    checkAuthResponse();
    
    // Update the UI based on auth state
    updateAuthUI();
    
    // Initialize the Spotify Web Playback SDK
    if (spotifyAuthState.isAuthenticated) {
        log('User is authenticated, initializing Spotify playback');
        initSpotifyPlayback();
    } else {
        log('User is not authenticated, skipping Spotify playback initialization');
    }
    
    // Set up event listeners for auth-related events
    document.addEventListener('spotify-auth-success', () => {
        log('Auth success event received');
        loadAuthStateFromStorage();
        updateAuthUI();
        initSpotifyPlayback();
    });
    
    document.addEventListener('spotify-auth-failure', () => {
        log('Auth failure event received');
        clearAuthState();
        updateAuthUI();
    });
    
    document.addEventListener('spotify-logout', () => {
        log('Logout event received');
        clearAuthState();
        updateAuthUI();
    });
    
    // Listen for Spotify SDK ready event
    window.addEventListener('spotify-sdk-ready', () => {
        log('Spotify SDK ready event received');
        if (spotifyAuthState.isAuthenticated) {
            initSpotifyPlayback();
        }
    });
    
    // Set up automatic token refresh
    if (spotifyAuthState.isAuthenticated && spotifyAuthState.expiresAt) {
        const timeUntilExpiry = spotifyAuthState.expiresAt - Date.now();
        if (timeUntilExpiry > 0) {
            log(`Token expires in ${Math.floor(timeUntilExpiry / 1000)} seconds, setting up refresh`);
            
            // Refresh 1 minute before expiry
            setTimeout(() => {
                log('Token refresh timer triggered');
                if (spotifyAuthState.refreshToken) {
                    refreshAccessToken(spotifyAuthState.refreshToken);
                }
            }, timeUntilExpiry - 60000);
        } else {
            log('Token already expired, refreshing now');
            if (spotifyAuthState.refreshToken) {
                refreshAccessToken(spotifyAuthState.refreshToken);
            }
        }
    }
    
    // Add event listeners to buttons
    const spotifyAuthBtn = document.getElementById('spotify-auth-btn');
    if (spotifyAuthBtn) {
        spotifyAuthBtn.addEventListener('click', () => {
            log('Auth button clicked, redirecting to /api/auth/spotify');
            window.location.href = '/api/auth/spotify?show_dialog=true';
        });
    }
    
    const spotifyLogoutBtn = document.getElementById('spotify-logout-btn');
    if (spotifyLogoutBtn) {
        spotifyLogoutBtn.addEventListener('click', logoutFromSpotify);
    }
}

// Check for authentication response in URL hash
function checkAuthResponse() {
    log('Checking for authentication response in URL hash');
    
    // Parse hash parameters
    const hash = window.location.hash.substring(1);
    if (!hash) {
        // No hash parameters, check localStorage for existing tokens
        loadAuthStateFromStorage();
        return;
    }
    
    // Clear hash from URL to prevent tokens from being visible
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // Parse hash parameters
    const params = new URLSearchParams(hash);
    
    // Check for error
    if (params.has('error')) {
        const error = params.get('error');
        log(`Authentication error: ${error}`);
        alert(`Spotify authentication error: ${error}`);
        return;
    }
    
    // Check for access token
    if (params.has('access_token')) {
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token') || '';
        const expiresIn = parseInt(params.get('expires_in') || '3600');
        const expiresAt = Date.now() + expiresIn * 1000;
        
        log(`Received access token, expires in ${expiresIn} seconds`);
        
        // Store tokens in localStorage
        localStorage.setItem('spotify_access_token', accessToken);
        localStorage.setItem('spotify_refresh_token', refreshToken);
        localStorage.setItem('spotify_expires_at', expiresAt.toString());
        
        // Update auth state
        spotifyAuthState.accessToken = accessToken;
        spotifyAuthState.refreshToken = refreshToken;
        spotifyAuthState.expiresAt = expiresAt;
        spotifyAuthState.isAuthenticated = true;
        
        // Update UI
        updateAuthUI(true);
        
        // Initialize Spotify Web Playback SDK
        initSpotifyPlayback();
    }
}

// Load authentication state from localStorage
function loadAuthStateFromStorage() {
    log('Loading authentication state from localStorage');
    
    const accessToken = localStorage.getItem('spotify_access_token');
    const refreshToken = localStorage.getItem('spotify_refresh_token');
    const expiresAt = localStorage.getItem('spotify_expires_at');
    const deviceId = localStorage.getItem('spotify_device_id');
    
    if (!accessToken) {
        log('No access token found in localStorage');
        updateAuthUI(false);
        return;
    }
    
    log(`Found access token in localStorage`);
    
    // Check if token is expired
    if (expiresAt && Date.now() > parseInt(expiresAt)) {
        log('Token is expired, attempting to refresh');
        
        if (refreshToken) {
            refreshAccessToken(refreshToken);
        } else {
            log('No refresh token available, user needs to re-authenticate');
            clearAuthState();
        }
        return;
    }
    
    // Token is valid, update state
    spotifyAuthState.accessToken = accessToken;
    spotifyAuthState.refreshToken = refreshToken;
    spotifyAuthState.expiresAt = expiresAt ? parseInt(expiresAt) : null;
    spotifyAuthState.deviceId = deviceId;
    spotifyAuthState.isAuthenticated = true;
    
    // Update UI
    updateAuthUI(true);
    
    // Initialize Spotify Web Playback SDK
    initSpotifyPlayback();
}

// Refresh the access token
async function refreshAccessToken(refreshToken) {
    log('Refreshing access token');
    
    try {
        const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refresh_token: refreshToken })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        
        const data = await response.json();
        
        // Update tokens
        const accessToken = data.access_token;
        const newRefreshToken = data.refresh_token || refreshToken;
        const expiresIn = parseInt(data.expires_in || '3600');
        const expiresAt = Date.now() + expiresIn * 1000;
        
        log(`Refreshed access token, expires in ${expiresIn} seconds`);
        
        // Store tokens
        localStorage.setItem('spotify_access_token', accessToken);
        localStorage.setItem('spotify_refresh_token', newRefreshToken);
        localStorage.setItem('spotify_expires_at', expiresAt.toString());
        
        // Update state
        spotifyAuthState.accessToken = accessToken;
        spotifyAuthState.refreshToken = newRefreshToken;
        spotifyAuthState.expiresAt = expiresAt;
        spotifyAuthState.isAuthenticated = true;
        
        // Update UI
        updateAuthUI(true);
        
        // Initialize Spotify Web Playback SDK
        initSpotifyPlayback();
        
        return accessToken;
    } catch (error) {
        log(`Error refreshing token: ${error.message}`);
        clearAuthState();
        return null;
    }
}

// Logout from Spotify
function logoutFromSpotify() {
    log('Logging out from Spotify');
    
    // Disconnect the player if it exists
    if (spotifyAuthState.player) {
        try {
            spotifyAuthState.player.disconnect();
        } catch (error) {
            console.error('Error disconnecting Spotify player:', error);
        }
    }
    
    // Clear auth state
    clearAuthState();
    
    // Redirect to Spotify logout page and then back to our app
    const spotifyLogoutUrl = 'https://accounts.spotify.com/en/logout';
    const popup = window.open(spotifyLogoutUrl, 'Spotify Logout', 'width=700,height=500,top=40,left=40');
    
    // Close the popup after a short delay and reload our page
    setTimeout(() => {
        if (popup) {
            popup.close();
        }
        window.location.reload();
    }, 2000);
}

// Clear authentication state
function clearAuthState() {
    log('Clearing authentication state');
    
    // Clear localStorage
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_expires_at');
    localStorage.removeItem('spotify_device_id');
    
    // Clear any other Spotify-related localStorage items
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.toLowerCase().includes('spotify')) {
            localStorage.removeItem(key);
        }
    }
    
    // Reset state object
    spotifyAuthState.accessToken = null;
    spotifyAuthState.refreshToken = null;
    spotifyAuthState.expiresAt = null;
    spotifyAuthState.deviceId = null;
    spotifyAuthState.isAuthenticated = false;
    spotifyAuthState.player = null;
    
    // Update UI
    updateAuthUI(false);
    
    // Clear all cookies
    document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
}

// Update the auth UI based on authentication state
function updateAuthUI(isAuthenticated) {
    const spotifyAuthBtn = document.getElementById('spotify-auth-btn');
    const spotifyLogoutBtn = document.getElementById('spotify-logout-btn');
    
    log(`Updating UI, isAuthenticated: ${isAuthenticated}`);
    
    if (spotifyAuthBtn) {
        spotifyAuthBtn.style.display = isAuthenticated ? 'none' : 'inline-block';
    }
    
    if (spotifyLogoutBtn) {
        spotifyLogoutBtn.style.display = isAuthenticated ? 'inline-block' : 'none';
    }
}

// Play a track on Spotify
async function playSpotifyTrack(trackUri) {
    log(`Playing track: ${trackUri}`);
    
    if (!spotifyAuthState.isAuthenticated) {
        log('Not authenticated with Spotify');
        return false;
    }
    
    // Check if we need to refresh the token
    if (spotifyAuthState.expiresAt && Date.now() > spotifyAuthState.expiresAt - 60000) {
        log('Token expired or expiring soon, refreshing...');
        if (spotifyAuthState.refreshToken) {
            const newToken = await refreshAccessToken(spotifyAuthState.refreshToken);
            if (!newToken) {
                log('Failed to refresh token');
                return false;
            }
            log('Token refreshed successfully');
        } else {
            log('No refresh token available');
            return false;
        }
    }
    
    if (!spotifyAuthState.deviceId) {
        log('No device ID available');
        
        // Try to get available devices
        try {
            const devicesResponse = await fetch('https://api.spotify.com/v1/me/player/devices', {
                headers: {
                    'Authorization': `Bearer ${spotifyAuthState.accessToken}`
                }
            });
            
            if (devicesResponse.ok) {
                const devicesData = await devicesResponse.json();
                log(`Available devices: ${JSON.stringify(devicesData)}`);
                
                if (devicesData.devices && devicesData.devices.length > 0) {
                    // Use the first active device or the first device if none are active
                    const activeDevice = devicesData.devices.find(d => d.is_active) || devicesData.devices[0];
                    spotifyAuthState.deviceId = activeDevice.id;
                    localStorage.setItem('spotify_device_id', activeDevice.id);
                    log(`Using device: ${activeDevice.name} (${activeDevice.id})`);
                } else {
                    log('No available devices found');
                    alert('No Spotify devices found. Please open Spotify on a device first.');
                    return false;
                }
            } else {
                log(`Failed to get devices: ${devicesResponse.status}`);
                alert('Failed to get Spotify devices. Please try reconnecting to Spotify.');
                return false;
            }
        } catch (error) {
            log(`Error getting devices: ${error.message}`);
            alert(`Error getting Spotify devices: ${error.message}`);
            return false;
        }
    }
    
    try {
        // First, try to transfer playback to our device
        const transferResponse = await fetch('https://api.spotify.com/v1/me/player', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${spotifyAuthState.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                device_ids: [spotifyAuthState.deviceId],
                play: false
            })
        });
        
        if (!transferResponse.ok && transferResponse.status !== 204) {
            log(`Warning: Failed to transfer playback: ${transferResponse.status}`);
            // Continue anyway, as the play request might still work
        } else {
            log('Playback transferred successfully');
        }
        
        // Now play the track
        const playResponse = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${spotifyAuthState.deviceId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${spotifyAuthState.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                uris: [trackUri]
            })
        });
        
        if (!playResponse.ok && playResponse.status !== 204) {
            let errorMessage = `Status: ${playResponse.status}`;
            try {
                const errorData = await playResponse.json();
                errorMessage += ` - ${errorData.error.message}`;
                log(`Detailed error: ${JSON.stringify(errorData)}`);
                
                // Handle 404 Not Found errors specifically
                if (playResponse.status === 404) {
                    alert(`Track not found in Spotify. This could be because the track doesn't exist or isn't available in your region.`);
                    
                    // Try to search for the track by extracting ID from URI
                    const trackId = trackUri.split(':').pop();
                    log(`Attempting to search for similar tracks to ID: ${trackId}`);
                    
                    // We could implement a search here to find similar tracks
                    return false;
                }
            } catch (e) {
                // Ignore JSON parsing errors
                log(`Error parsing error response: ${e.message}`);
            }
            throw new Error(`Spotify API error: ${errorMessage}`);
        }
        
        log('Track playback started successfully');
        return true;
    } catch (error) {
        log(`Error playing track: ${error.message}`);
        
        // If token expired, try to refresh and play again
        if (error.message.includes('token expired') && spotifyAuthState.refreshToken) {
            log('Token expired, refreshing...');
            const newToken = await refreshAccessToken(spotifyAuthState.refreshToken);
            if (newToken) {
                log('Token refreshed, retrying playback');
                return playSpotifyTrack(trackUri);
            }
        }
        
        return false;
    }
}

// Search for a track on Spotify and play the first result
async function searchAndPlaySpotifyTrack(songName, artistName) {
    log(`Searching for track: "${songName}" by "${artistName}"`);
    
    if (!spotifyAuthState.isAuthenticated) {
        log('Not authenticated with Spotify');
        return false;
    }
    
    try {
        // Format the query
        const query = encodeURIComponent(`track:${songName} artist:${artistName}`);
        log(`Search query: ${query}`);
        
        // Search for the track
        const searchResponse = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`, {
            headers: {
                'Authorization': `Bearer ${spotifyAuthState.accessToken}`
            }
        });
        
        if (!searchResponse.ok) {
            throw new Error(`Search failed: ${searchResponse.status}`);
        }
        
        const searchData = await searchResponse.json();
        log(`Search results: ${JSON.stringify(searchData)}`);
        
        if (searchData.tracks && searchData.tracks.items && searchData.tracks.items.length > 0) {
            const track = searchData.tracks.items[0];
            log(`Found track: ${track.name} by ${track.artists[0].name} (${track.uri})`);
            
            // Store the URI in the now playing card for future use
            const nowPlayingCard = document.querySelector('.song-card.now-playing');
            if (nowPlayingCard) {
                nowPlayingCard.dataset.spotifyUri = track.uri;
            }
            
            // Play the track
            return await playSpotifyTrack(track.uri);
        } else {
            log('No tracks found');
            alert(`No tracks found for "${songName}" by "${artistName}" on Spotify.`);
            return false;
        }
    } catch (error) {
        log(`Error searching for track: ${error.message}`);
        alert(`Error searching for track: ${error.message}`);
        return false;
    }
}

// Initialize Spotify Web Playback SDK
function initSpotifyPlayback() {
    log('Initializing Spotify Web Playback SDK');
    
    // Check if we have a valid access token
    if (!spotifyAuthState.accessToken) {
        log('No access token available, cannot initialize Spotify player');
        return;
    }
    
    // Load the Spotify Web Playback SDK
    if (!document.getElementById('spotify-player-script')) {
        const script = document.createElement('script');
        script.id = 'spotify-player-script';
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;
        
        document.body.appendChild(script);
        log('Added Spotify Player script to document');
    } else {
        log('Spotify Player script already exists in document');
    }
    
    // Initialize the player when SDK is ready
    window.onSpotifyWebPlaybackSDKReady = () => {
        log('Spotify Web Playback SDK ready');
        
        if (!spotifyAuthState.accessToken) {
            log('No access token available');
            return;
        }
        
        // Create the player
        const player = new Spotify.Player({
            name: 'Vinyl Vibe Web Player',
            getOAuthToken: cb => {
                // Check if token needs refresh
                if (spotifyAuthState.expiresAt && Date.now() > spotifyAuthState.expiresAt) {
                    log('Token expired, refreshing before player use');
                    refreshAccessToken(spotifyAuthState.refreshToken)
                        .then(token => {
                            if (token) {
                                cb(token);
                            }
                        });
                } else {
                    log('Using existing token for player');
                    cb(spotifyAuthState.accessToken);
                }
            },
            volume: 0.5
        });
        
        // Error handling
        player.addListener('initialization_error', ({ message }) => {
            log(`Initialization error: ${message}`);
            console.error('Spotify player initialization error:', message);
            alert(`Spotify player initialization error: ${message}`);
        });
        
        player.addListener('authentication_error', ({ message }) => {
            log(`Authentication error: ${message}`);
            console.error('Spotify player authentication error:', message);
            alert(`Spotify authentication error: ${message}. Try reconnecting to Spotify.`);
            
            // Try to refresh the token
            if (spotifyAuthState.refreshToken) {
                refreshAccessToken(spotifyAuthState.refreshToken);
            }
        });
        
        player.addListener('account_error', ({ message }) => {
            log(`Account error: ${message}`);
            console.error('Spotify player account error:', message);
            alert(`Spotify account error: ${message}`);
        });
        
        player.addListener('playback_error', ({ message }) => {
            log(`Playback error: ${message}`);
            console.error('Spotify player playback error:', message);
            alert(`Spotify playback error: ${message}`);
        });
        
        // Ready
        player.addListener('ready', ({ device_id }) => {
            log(`Player ready with device ID: ${device_id}`);
            
            // Store the device ID
            spotifyAuthState.deviceId = device_id;
            localStorage.setItem('spotify_device_id', device_id);
            
            // Store the player instance
            spotifyAuthState.player = player;
            
            // Notify that Spotify is ready
            const event = new CustomEvent('spotify-ready', { detail: { deviceId: device_id } });
            document.dispatchEvent(event);
        });
        
        // Not Ready
        player.addListener('not_ready', ({ device_id }) => {
            log(`Player not ready. Device ID: ${device_id}`);
            console.error('Spotify player not ready:', device_id);
            alert(`Spotify player not ready. Device ID: ${device_id}`);
        });
        
        // Connect to the player
        player.connect().then(success => {
            if (success) {
                log('Successfully connected to Spotify Player');
            } else {
                log('Failed to connect to Spotify Player');
                console.error('Failed to connect to Spotify Player');
                alert('Failed to connect to Spotify Player');
            }
        });
    };
}

// Export functions and state
export { 
    spotifyAuthState,
    initSpotifyAuth,
    checkAuthResponse,
    loadAuthStateFromStorage,
    refreshAccessToken,
    logoutFromSpotify,
    clearAuthState,
    updateAuthUI,
    playSpotifyTrack,
    searchAndPlaySpotifyTrack,
    initSpotifyPlayback
};
