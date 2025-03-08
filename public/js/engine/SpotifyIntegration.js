/**
 * SpotifyIntegration.js
 * Handles integration with Spotify Web Playback SDK
 */

class SpotifyIntegration {
    constructor(options = {}) {
        this.player = null;
        this.deviceId = null;
        this.isConnected = false;
        this.isPlaying = false;
        this.currentTrack = null;
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpirationTime = null;
        this.clientId = options.clientId || '540bd995048d4cf99698f3bfc82099e3';
        this.redirectUri = options.redirectUri || window.location.origin + window.location.pathname;
        this.scopes = options.scopes || 'user-read-private user-read-email streaming user-modify-playback-state user-read-playback-state';
        this.volume = options.volume || 0.5;
        this.onReady = options.onReady || (() => {});
        this.onPlaybackStateChanged = options.onPlaybackStateChanged || (() => {});
        this.onError = options.onError || (() => {});
        this.onPlayerStateChanged = options.onPlayerStateChanged || (() => {});
        this.onTrackChanged = options.onTrackChanged || (() => {});
        
        // Load tokens from localStorage
        this.loadTokens();
        
        // Bind methods
        this.handleStateChange = this.handleStateChange.bind(this);
    }
    
    /**
     * Initialize Spotify integration
     * @returns {Promise<boolean>} - Whether initialization was successful
     */
    async init() {
        console.log('Initializing Spotify integration');
        
        // Check if we have a valid token
        if (!this.hasValidToken()) {
            console.log('No valid token found, checking for authentication response');
            
            // Check if we have an authentication response in the URL
            if (!this.checkAuthResponse()) {
                console.log('No authentication response found');
                return false;
            }
        }
        
        // Load the Spotify Web Playback SDK
        await this.loadSpotifySDK();
        
        return true;
    }
    
    /**
     * Check if we have a valid token
     * @returns {boolean} - Whether we have a valid token
     */
    hasValidToken() {
        if (!this.accessToken) {
            return false;
        }
        
        if (!this.tokenExpirationTime) {
            return false;
        }
        
        // Check if token is expired (with 5 minute buffer)
        const now = Date.now();
        const expirationTime = this.tokenExpirationTime;
        const isExpired = now > expirationTime - 5 * 60 * 1000;
        
        return !isExpired;
    }
    
    /**
     * Load tokens from localStorage
     */
    loadTokens() {
        this.accessToken = localStorage.getItem('spotify_token');
        this.refreshToken = localStorage.getItem('spotify_refresh_token');
        
        const tokenTimestamp = localStorage.getItem('spotify_token_timestamp');
        const expiresIn = localStorage.getItem('spotify_token_expires_in');
        
        if (tokenTimestamp && expiresIn) {
            this.tokenExpirationTime = parseInt(tokenTimestamp) + parseInt(expiresIn) * 1000;
        }
    }
    
    /**
     * Save tokens to localStorage
     * @param {string} accessToken - Access token
     * @param {string} refreshToken - Refresh token
     * @param {number} expiresIn - Token expiration time in seconds
     */
    saveTokens(accessToken, refreshToken, expiresIn) {
        localStorage.setItem('spotify_token', accessToken);
        localStorage.setItem('spotify_refresh_token', refreshToken || '');
        localStorage.setItem('spotify_token_timestamp', Date.now().toString());
        localStorage.setItem('spotify_token_expires_in', expiresIn.toString());
        
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.tokenExpirationTime = Date.now() + expiresIn * 1000;
    }
    
    /**
     * Check for authentication response in URL
     * @returns {boolean} - Whether authentication was successful
     */
    checkAuthResponse() {
        const hash = window.location.hash.substring(1);
        if (!hash) return false;
        
        const params = new URLSearchParams(hash);
        
        // Check for error
        if (params.has('error')) {
            const error = params.get('error');
            console.error(`Authentication error: ${error}`);
            this.onError({ message: `Authentication error: ${error}` });
            return false;
        }
        
        // Check for access token
        if (params.has('access_token')) {
            const accessToken = params.get('access_token');
            const expiresIn = params.get('expires_in') || '3600';
            const refreshToken = params.get('refresh_token') || '';
            
            console.log(`Authentication successful. Token expires in ${expiresIn} seconds`);
            
            // Save tokens
            this.saveTokens(accessToken, refreshToken, expiresIn);
            
            // Clear hash from URL
            history.replaceState(null, null, ' ');
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Load Spotify Web Playback SDK
     * @returns {Promise<void>}
     */
    loadSpotifySDK() {
        return new Promise((resolve, reject) => {
            // Check if SDK is already loaded
            if (window.Spotify) {
                console.log('Spotify SDK already loaded');
                this.initPlayer();
                resolve();
                return;
            }
            
            console.log('Loading Spotify Web Playback SDK');
            
            // Load the SDK script
            const script = document.createElement('script');
            script.src = 'https://sdk.scdn.co/spotify-player.js';
            script.async = true;
            
            script.onload = () => {
                console.log('Spotify SDK script loaded');
            };
            
            document.body.appendChild(script);
            
            // Wait for SDK to be ready
            window.onSpotifyWebPlaybackSDKReady = () => {
                console.log('Spotify Web Playback SDK ready');
                this.initPlayer();
                resolve();
            };
        });
    }
    
    /**
     * Initialize Spotify Web Player
     */
    initPlayer() {
        if (!this.accessToken) {
            console.error('No access token available');
            this.onError({ message: 'No Spotify access token available' });
            return;
        }
        
        console.log('Initializing Spotify Web Player');
        
        this.player = new Spotify.Player({
            name: 'Vinyl Vibe Player',
            getOAuthToken: cb => { cb(this.accessToken); },
            volume: this.volume
        });
        
        // Error handling
        this.player.addListener('initialization_error', ({ message }) => {
            console.error(`Initialization error: ${message}`);
            this.onError({ message: `Spotify initialization error: ${message}` });
        });
        
        this.player.addListener('authentication_error', ({ message }) => {
            console.error(`Authentication error: ${message}`);
            this.onError({ message: `Spotify authentication error: ${message}` });
            
            // Token might be expired, clear it
            this.clearTokens();
        });
        
        this.player.addListener('account_error', ({ message }) => {
            console.error(`Account error: ${message}`);
            this.onError({ message: `Spotify account error: ${message}` });
        });
        
        this.player.addListener('playback_error', ({ message }) => {
            console.error(`Playback error: ${message}`);
            this.onError({ message: `Spotify playback error: ${message}` });
        });
        
        // Ready
        this.player.addListener('ready', ({ device_id }) => {
            console.log(`Player ready with device ID: ${device_id}`);
            this.deviceId = device_id;
            this.isConnected = true;
            
            // Store the device ID
            localStorage.setItem('spotify_device_id', device_id);
            
            // Call the ready callback
            this.onReady({ deviceId: device_id });
        });
        
        // Not Ready
        this.player.addListener('not_ready', ({ device_id }) => {
            console.log(`Player not ready. Device ID: ${device_id}`);
            this.isConnected = false;
        });
        
        // Player State Changed
        this.player.addListener('player_state_changed', state => {
            this.handleStateChange(state);
        });
        
        // Connect to the player
        this.player.connect().then(success => {
            if (success) {
                console.log('Successfully connected to Spotify Player');
            } else {
                console.log('Failed to connect to Spotify Player');
                this.onError({ message: 'Failed to connect to Spotify Player' });
            }
        });
    }
    
    /**
     * Handle player state change
     * @param {Object} state - Player state
     */
    handleStateChange(state) {
        if (!state) {
            console.log('No state received');
            return;
        }
        
        // Update current track
        const track = state.track_window.current_track;
        const isNewTrack = !this.currentTrack || this.currentTrack.id !== track.id;
        
        if (isNewTrack) {
            this.currentTrack = {
                id: track.id,
                name: track.name,
                artist: track.artists.map(a => a.name).join(', '),
                album: track.album.name,
                albumArt: track.album.images[0]?.url,
                uri: track.uri
            };
            
            // Call track changed callback
            this.onTrackChanged(this.currentTrack);
        }
        
        // Update playing state
        this.isPlaying = !state.paused;
        
        // Call state changed callback
        this.onPlayerStateChanged({
            isPlaying: this.isPlaying,
            track: this.currentTrack,
            position: state.position,
            duration: state.duration,
            context: state.context
        });
    }
    
    /**
     * Clear tokens
     */
    clearTokens() {
        localStorage.removeItem('spotify_token');
        localStorage.removeItem('spotify_refresh_token');
        localStorage.removeItem('spotify_token_timestamp');
        localStorage.removeItem('spotify_token_expires_in');
        
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpirationTime = null;
    }
    
    /**
     * Start Spotify authentication flow
     */
    authenticate() {
        console.log('Starting Spotify authentication flow');
        
        // Build the authorization URL
        const authUrl = 'https://accounts.spotify.com/authorize' +
            '?response_type=token' +
            '&client_id=' + encodeURIComponent(this.clientId) +
            '&scope=' + encodeURIComponent(this.scopes) +
            '&redirect_uri=' + encodeURIComponent(this.redirectUri);
        
        console.log(`Redirecting to Spotify authorization: ${authUrl}`);
        
        // Redirect to Spotify authorization page
        window.location.href = authUrl;
    }
    
    /**
     * Play a track
     * @param {string} uri - Spotify URI
     * @returns {Promise<void>}
     */
    async play(uri) {
        if (!this.isConnected || !this.deviceId) {
            console.error('Spotify player not connected');
            this.onError({ message: 'Spotify player not connected' });
            return;
        }
        
        try {
            const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`
                },
                body: JSON.stringify({
                    uris: [uri]
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to play track: ${response.status} - ${errorText}`);
            }
            
            this.isPlaying = true;
        } catch (error) {
            console.error('Error playing track:', error);
            this.onError({ message: `Error playing track: ${error.message}` });
        }
    }
    
    /**
     * Resume playback
     */
    resume() {
        if (this.player) {
            this.player.resume();
        }
    }
    
    /**
     * Pause playback
     */
    pause() {
        if (this.player) {
            this.player.pause();
        }
    }
    
    /**
     * Toggle play/pause
     */
    togglePlay() {
        if (this.player) {
            this.player.togglePlay();
        }
    }
    
    /**
     * Skip to next track
     */
    next() {
        if (this.player) {
            this.player.nextTrack();
        }
    }
    
    /**
     * Skip to previous track
     */
    previous() {
        if (this.player) {
            this.player.previousTrack();
        }
    }
    
    /**
     * Set volume
     * @param {number} volume - Volume from 0 to 1
     */
    setVolume(volume) {
        if (this.player) {
            this.player.setVolume(volume);
            this.volume = volume;
        }
    }
    
    /**
     * Search for tracks
     * @param {string} query - Search query
     * @returns {Promise<Array>} - Search results
     */
    async searchTracks(query) {
        if (!this.accessToken) {
            console.error('No access token available');
            this.onError({ message: 'No Spotify access token available' });
            return [];
        }
        
        try {
            const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to search tracks: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            
            // Map tracks to a simpler format
            return data.tracks.items.map(track => ({
                id: track.id,
                name: track.name,
                artist: track.artists.map(a => a.name).join(', '),
                album: track.album.name,
                albumArt: track.album.images[0]?.url,
                uri: track.uri,
                previewUrl: track.preview_url
            }));
        } catch (error) {
            console.error('Error searching tracks:', error);
            this.onError({ message: `Error searching tracks: ${error.message}` });
            return [];
        }
    }
    
    /**
     * Get track by ID
     * @param {string} trackId - Spotify track ID
     * @returns {Promise<Object>} - Track object
     */
    async getTrack(trackId) {
        if (!this.accessToken) {
            console.error('No access token available');
            this.onError({ message: 'No Spotify access token available' });
            return null;
        }
        
        try {
            const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to get track: ${response.status} - ${errorText}`);
            }
            
            const track = await response.json();
            
            // Map track to a simpler format
            return {
                id: track.id,
                name: track.name,
                artist: track.artists.map(a => a.name).join(', '),
                album: track.album.name,
                albumArt: track.album.images[0]?.url,
                uri: track.uri,
                previewUrl: track.preview_url
            };
        } catch (error) {
            console.error('Error getting track:', error);
            this.onError({ message: `Error getting track: ${error.message}` });
            return null;
        }
    }
}

export default SpotifyIntegration;
