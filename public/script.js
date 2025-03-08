// Vinyl Vibe Music Player - Main JavaScript
import { 
    engine, 
    playSong, 
    playNextSong, 
    toggleSpotifyPlayback, 
    skipToNextSpotifyTrack, 
    skipToPreviousSpotifyTrack 
} from './js/engine-integration.js';
import { 
    initSpotifyAuth, 
    spotifyAuthState, 
    playSpotifyTrack, 
    logoutFromSpotify,
    updateAuthUI,
    refreshAccessToken
} from './js/spotify-auth.js';

// Debug mode
const DEBUG = true;
function log(...args) {
    if (DEBUG) {
        console.log('[Vinyl Vibe UI]', ...args);
        
        // Add to debug panel if it exists
        if (debugOutput) {
            const timestamp = new Date().toISOString().substr(11, 8);
            const logMessage = document.createElement('div');
            logMessage.className = 'log-entry';
            logMessage.innerHTML = `<span class="log-timestamp">[${timestamp}]</span> <span class="log-source">[Vinyl Vibe UI]</span> ${args.join(' ')}`;
            debugOutput.appendChild(logMessage);
            
            // Auto-scroll to bottom
            debugOutput.scrollTop = debugOutput.scrollHeight;
        }
    }
}

// DOM Elements
const carousel = document.querySelector('.carousel');
const prevBtn = document.querySelector('.prev-btn');
const nextBtn = document.querySelector('.next-btn');
const addSeedBtn = document.querySelector('.add-seed');
const slidersHeader = document.querySelector('.sliders-header');
const slidersContent = document.querySelector('.sliders-content');
const toggleSlidersBtn = document.querySelector('.toggle-sliders');
const resetSlidersBtn = document.querySelector('.reset-sliders');
const sliders = document.querySelectorAll('input[type="range"]');
const addSeedModal = document.querySelector('.add-seed-modal');
const seedInput = document.getElementById('seed-input');
const cancelSeedBtn = document.getElementById('cancel-seed');
const submitSeedBtn = document.getElementById('submit-seed');
const playBtn = document.getElementById('play-track');
const pauseBtn = document.getElementById('pause-track');
const prevTrackBtn = document.getElementById('prev-track');
const nextTrackBtn = document.getElementById('next-track');
const progressBar = document.querySelector('.progress-bar');
const progress = document.querySelector('.progress');
const volumeControl = document.getElementById('volume');
const debugPane = document.querySelector('.debug-pane');
const toggleDebugBtn = document.getElementById('toggle-debug');
const clearDebugBtn = document.getElementById('clear-debug');
const debugOutput = document.getElementById('debug-output');

// App State
let isPlaying = false;
let currentSongIndex = 0;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    log('Vinyl Vibe Music Player UI initialized');
    log('DOM Content Loaded');
    
    // Initialize Spotify authentication
    initSpotifyAuth();
    
    // Initialize UI components
    initCarousel();
    initSliders();
    initButtons();
    initAudio();
    
    // Debug: Check if Spotify auth button exists
    const spotifyAuthBtn = document.getElementById('spotify-auth-btn');
    console.log('Spotify auth button exists:', !!spotifyAuthBtn);
    if (spotifyAuthBtn) {
        console.log('Adding click listener to Spotify auth button');
    }
    
    // Add event listener for the start button
    const startButton = document.querySelector('.start-button');
    if (startButton) {
        log('Found start button, adding event listener');
        startButton.addEventListener('click', function(e) {
            log('Start button clicked from script.js');
            e.preventDefault();
            e.stopPropagation();
            openAddSeedModal();
        });
    }
    
    // Add event listener for toggle debug button
    if (toggleDebugBtn) {
        toggleDebugBtn.addEventListener('click', () => {
            debugPane.classList.toggle('hidden');
        });
    }
    
    // Add event listener for clear debug button
    if (clearDebugBtn) {
        clearDebugBtn.addEventListener('click', () => {
            if (debugOutput) {
                debugOutput.innerHTML = '';
            }
        });
    }
});

// Initialize carousel navigation
function initCarousel() {
    // Scroll carousel left
    prevBtn.addEventListener('click', () => {
        carousel.scrollBy({
            left: -250,
            behavior: 'smooth'
        });
    });

    // Scroll carousel right
    nextBtn.addEventListener('click', () => {
        carousel.scrollBy({
            left: 250,
            behavior: 'smooth'
        });
    });

    // Enable keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            prevBtn.click();
        } else if (e.key === 'ArrowRight') {
            nextBtn.click();
        }
    });
}

// Initialize sliders functionality
function initSliders() {
    // Toggle sliders visibility
    slidersHeader.addEventListener('click', () => {
        slidersContent.classList.toggle('collapsed');
        toggleSlidersBtn.textContent = slidersContent.classList.contains('collapsed') ? '▼' : '▲';
    });

    // Update slider values
    sliders.forEach(slider => {
        const valueDisplay = slider.previousElementSibling.querySelector('.slider-value');
        
        slider.addEventListener('input', () => {
            valueDisplay.textContent = slider.value;
            log(`Slider ${slider.name} changed to ${slider.value}`);
            updatePlaylist();
        });
    });

    // Reset sliders
    resetSlidersBtn.addEventListener('click', () => {
        sliders.forEach(slider => {
            slider.value = 50;
            const valueDisplay = slider.previousElementSibling.querySelector('.slider-value');
            valueDisplay.textContent = '50';
        });
        log('Sliders reset to default values');
        updatePlaylist();
    });
}

// Initialize button interactions
function initButtons() {
    // Play button
    playBtn.addEventListener('click', () => {
        log('Play button clicked');
        playTrack();
    });
    
    // Pause button
    pauseBtn.addEventListener('click', () => {
        log('Pause button clicked');
        pauseTrack();
    });

    // Spotify auth button
    const spotifyAuthBtn = document.getElementById('spotify-auth-btn');
    if (spotifyAuthBtn) {
        spotifyAuthBtn.addEventListener('click', () => {
            log('Spotify auth button clicked');
            // Redirect to Spotify auth endpoint
            window.location.href = '/api/auth/spotify?show_dialog=true';
        });
    }

    // Previous track button
    prevTrackBtn.addEventListener('click', () => {
        log('Previous track button clicked');
        playPreviousTrack();
    });

    // Next track button
    document.getElementById('next-track').addEventListener('click', async function() {
        console.log('Next track button clicked');
        
        // Add debug info
        if (window.debugLogger) {
            window.debugLogger.log('Next track button clicked');
        }
        
        // Check if we're using Spotify
        if (window.spotifyAuthState && window.spotifyAuthState.isAuthenticated) {
            try {
                // Try to skip to next track via Spotify
                const response = await fetch('https://api.spotify.com/v1/me/player/next', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${window.spotifyAuthState.accessToken}`
                    }
                });
                
                if (response.ok || response.status === 204) {
                    console.log('Skipped to next track via Spotify');
                    if (window.debugLogger) {
                        window.debugLogger.log('Skipped to next track via Spotify');
                    }
                    
                    // Wait a moment for Spotify to update
                    setTimeout(async () => {
                        // Get current playback state to update UI
                        if (window.getSpotifyPlaybackState) {
                            await window.getSpotifyPlaybackState();
                        }
                    }, 500);
                    
                    return;
                } else {
                    console.error('Failed to skip track via Spotify:', response.status);
                    if (window.debugLogger) {
                        window.debugLogger.log(`Failed to skip track via Spotify: ${response.status}`);
                    }
                }
            } catch (error) {
                console.error('Error skipping track via Spotify:', error);
                if (window.debugLogger) {
                    window.debugLogger.log(`Error skipping track via Spotify: ${error.message}`);
                }
            }
        }
        
        // Fallback to simulated next track
        nextTrack();
    });

    // Volume control
    volumeControl.addEventListener('input', () => {
        const volume = volumeControl.value / 100; // Convert percentage to decimal (0-1)
        log(`Volume set to ${volumeControl.value}%`);
        
        // Set actual audio volume in the Spotify player
        if (window.spotifyIntegration && typeof window.spotifyIntegration.setVolume === 'function') {
            window.spotifyIntegration.setVolume(volume);
        }
    });

    // Feedback buttons
    document.querySelectorAll('.thumbs-up, .thumbs-down').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.target.classList.contains('thumbs-up') ? 'positive' : 'negative';
            const trait = 'general';
            const songCard = e.target.closest('.song-card');
            if (!songCard) return;
            
            const songName = songCard.querySelector('.song-name').textContent.replace('Name: ', '');
            
            log(`${action} feedback for ${songName} (${trait})`);
            logFeedback(action, trait, songName);
            
            // Visual feedback
            btn.classList.add('active');
            setTimeout(() => {
                btn.classList.remove('active');
            }, 300);
        });
    });

    // Trait buttons
    document.querySelectorAll('.trait-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = btn.classList.contains('positive-btn') ? 'positive' : 'negative';
            const trait = btn.dataset.trait;
            const songCard = e.target.closest('.song-card');
            if (!songCard) return;
            
            const songName = songCard.querySelector('.song-name').textContent.replace('Name: ', '');
            
            log(`${action} feedback for ${songName} (${trait})`);
            logFeedback(action, trait, songName);
            
            // Visual feedback
            btn.classList.add('active');
            setTimeout(() => {
                btn.classList.remove('active');
            }, 300);
            
            updatePlaylist();
        });
    });
}

// Initialize audio controls
function initAudio() {
    // Play/Pause button
    playPauseBtn.addEventListener('click', () => {
        togglePlayPause();
    });

    // Previous track button
    prevTrackBtn.addEventListener('click', () => {
        playPreviousTrack();
    });

    // Next track button
    nextTrackBtn.addEventListener('click', () => {
        playNextTrack();
    });

    // Progress bar click
    progressBar.addEventListener('click', (e) => {
        const clickPosition = e.offsetX / progressBar.offsetWidth;
        audioProgress = clickPosition * 100;
        updateProgressBar();
        log(`Seek to ${Math.round(audioProgress)}%`);
    });

    // Volume control
    volumeControl.addEventListener('input', () => {
        const volume = volumeControl.value;
        log(`Volume set to ${volume}%`);
        // Would set actual audio volume here
    });
}

// Play track function
function playTrack() {
    console.log('playTrack called');
    
    isPlaying = true;
    startProgressSimulation();
    
    // Get the current song data from the now playing card
    const nowPlayingCard = document.querySelector('.song-card.now-playing');
    if (nowPlayingCard) {
        const songName = nowPlayingCard.querySelector('.song-name').textContent.replace('Name: ', '');
        const songArtist = nowPlayingCard.querySelector('.song-artist').textContent.replace('Artist: ', '');
        
        log(`Playing: ${songName} by ${songArtist}`);
        
        // If Spotify is connected, play this track
        if (spotifyAuthState.isAuthenticated) {
            // Check if the card has a Spotify URI
            const spotifyUri = nowPlayingCard.dataset.spotifyUri;
            if (spotifyUri) {
                log(`Playing Spotify track: ${spotifyUri}`);
                playSpotifyTrack(spotifyUri);
            } else {
                log('No Spotify URI found for this track, searching...');
                searchAndPlaySpotifyTrack(songName, songArtist);
            }
        }
    } else {
        // If no card is selected, just toggle Spotify playback
        if (spotifyAuthState.isAuthenticated) {
            toggleSpotifyPlayback().catch(error => {
                log('Error toggling Spotify playback:', error);
            });
        }
    }
}

// Pause track function
function pauseTrack() {
    console.log('pauseTrack called');
    
    isPlaying = false;
    stopProgressSimulation();
    
    // If Spotify is connected, toggle playback
    if (spotifyAuthState.isAuthenticated) {
        toggleSpotifyPlayback().catch(error => {
            log('Error toggling Spotify playback:', error);
        });
    }
}

// Toggle play/pause (kept for backward compatibility)
function togglePlayPause() {
    console.log('togglePlayPause called');
    
    if (isPlaying) {
        pauseTrack();
    } else {
        playTrack();
    }
    
    updateNowPlayingCard();
}

// Start progress bar simulation
function startProgressSimulation() {
    stopProgressSimulation(); // Clear any existing interval
    
    audioInterval = setInterval(() => {
        audioProgress += 0.5;
        if (audioProgress >= 100) {
            audioProgress = 0;
            playNextTrack();
        }
        updateProgressBar();
    }, 500);
}

// Stop progress bar simulation
function stopProgressSimulation() {
    if (audioInterval) {
        clearInterval(audioInterval);
    }
}

// Update progress bar
function updateProgressBar() {
    progress.style.width = `${audioProgress}%`;
}

// Play next track
function playNextTrack() {
    if (isPlaying) {
        stopProgressSimulation();
    }
    
    playVinylScratchSound();
    
    // If Spotify is connected, skip to next track
    if (spotifyAuthState.isAuthenticated) {
        skipToNextSpotifyTrack().then(success => {
            if (!success) {
                // Fallback to engine if Spotify fails
                playNextSong();
            }
        }).catch(error => {
            log('Error skipping to next track:', error);
            playNextSong();
        });
    } else {
        // Use engine to play next song
        playNextSong();
    }
    
    if (!isPlaying) {
        togglePlayPause();
    }
}

// Play previous track
function playPreviousTrack() {
    stopProgressSimulation();
    audioProgress = 0;
    updateProgressBar();
    
    // If Spotify is connected, skip to previous track
    if (spotifyAuthState.isAuthenticated) {
        skipToPreviousSpotifyTrack().catch(error => {
            log('Error skipping to previous track:', error);
        });
    } else {
        // Move last card to the beginning
        const lastCard = carousel.children[carousel.children.length - 1];
        carousel.insertBefore(lastCard, carousel.firstChild);
        
        // Update current song index
        if (currentSongIndex === 0) {
            currentSongIndex = carousel.children.length - 1;
        } else {
            currentSongIndex--;
        }
        
        // Update now playing card
        updateNowPlayingCard();
    }
    
    if (!isPlaying) {
        togglePlayPause();
    }
}

// Update now playing card display
function updateNowPlayingCard() {
    // Would update any special UI elements for the now playing card
}

// Open add seed modal
function openAddSeedModal() {
    // This is now handled by engine-integration.js
    // Keeping this function as a stub for backward compatibility
    if (typeof window.openAddSeedModal === 'function') {
        window.openAddSeedModal();
    } else {
        const modal = document.querySelector('.add-seed-modal');
        if (modal) {
            modal.style.display = 'flex';
            const input = document.getElementById('seed-input');
            if (input) input.focus();
        }
    }
}

// Close add seed modal
function closeAddSeedModal() {
    // This is now handled by engine-integration.js
    // Keeping this function as a stub for backward compatibility
    if (typeof window.closeAddSeedModal === 'function') {
        window.closeAddSeedModal();
    } else {
        const modal = document.querySelector('.add-seed-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

// Add song to queue based on seed
function addSongToQueue(seed) {
    log('Adding song to queue based on seed:', seed);
    
    // This function is now handled by the engine
    // The engine-integration.js will call engine.generateFromSeed()
    
    // For backwards compatibility, we'll check if engine exists
    if (typeof engine !== 'undefined') {
        engine.generateFromSeed({
            type: 'text',
            value: seed
        });
    } else {
        // Fallback to mock data for testing
        const mockSong = generateMockSong(seed);
        
        // If Spotify is authenticated, try to find a matching track
        if (spotifyAuthState.isAuthenticated) {
            findSpotifyTrack(mockSong.name, mockSong.artist)
                .then(spotifyUri => {
                    if (spotifyUri) {
                        mockSong.spotifyUri = spotifyUri;
                        log(`Found Spotify URI for ${mockSong.name}: ${spotifyUri}`);
                    }
                    
                    // Create and add the card
                    const card = createSongCard(mockSong);
                    carousel.insertBefore(card, carousel.lastElementChild);
                    attachEventListenersToCard(card);
                });
        } else {
            // Create and add the card without Spotify URI
            const card = createSongCard(mockSong);
            carousel.insertBefore(card, carousel.lastElementChild);
            attachEventListenersToCard(card);
        }
    }
}

// Attach event listeners to a newly created card
function attachEventListenersToCard(card) {
    // Thumbs buttons
    card.querySelectorAll('.thumbs-up, .thumbs-down').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.target.classList.contains('thumbs-up') ? 'positive' : 'negative';
            const trait = 'general';
            const songName = card.querySelector('.song-name').textContent.replace('Name: ', '');
            
            log(`${action} feedback for ${songName} (${trait})`);
            logFeedback(action, trait, songName);
            
            // Visual feedback
            btn.classList.add('active');
            setTimeout(() => {
                btn.classList.remove('active');
            }, 300);
            
            updatePlaylist();
        });
    });

    // Trait buttons
    card.querySelectorAll('.trait-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.target.classList.contains('positive-btn') ? 'positive' : 'negative';
            const trait = e.target.textContent.replace(/[+-]/g, '').trim();
            const songName = card.querySelector('.song-name').textContent.replace('Name: ', '');
            
            log(`${action} feedback for ${songName} (${trait})`);
            logFeedback(action, trait, songName);
            
            // Visual feedback
            btn.classList.add('active');
            setTimeout(() => {
                btn.classList.remove('active');
            }, 300);
            
            updatePlaylist();
        });
    });

    // Cooldown toggle
    card.querySelector('.cooldown').addEventListener('click', (e) => {
        const currentCooldown = parseInt(e.target.dataset.cooldown);
        let newCooldown = (currentCooldown % 3) + 1;
        e.target.dataset.cooldown = newCooldown;
        
        // Update cooldown icon
        if (newCooldown === 1) {
            e.target.textContent = '🐇'; // 1-day cooldown
        } else if (newCooldown === 2) {
            e.target.textContent = '⏳'; // 2-day cooldown
        } else {
            e.target.textContent = '🐢'; // 3-day cooldown
        }
        
        const songName = card.querySelector('.song-name').textContent.replace('Name: ', '');
        log(`Cooldown for ${songName} set to ${newCooldown} days`);
        
        updatePlaylist();
    });
}

// Log feedback (would send to backend in real implementation)
function logFeedback(action, trait, songName) {
    // In a real implementation, this would send data to the backend
    console.log(`FEEDBACK: ${action} | ${trait} | ${songName}`);
    
    // Play a vinyl scratch sound for feedback
    playVinylScratchSound();
}

// Update playlist based on feedback and slider values
function updatePlaylist() {
    log('Updating playlist based on feedback and slider values');
    
    // This is now handled by the engine
    // The engine will automatically update the playlist
    
    // For backwards compatibility, we'll check if engine exists
    if (typeof engine === 'undefined') {
        // Fallback to mock data for testing
        loadMockPlaylist();
    }
}

// Play vinyl scratch sound effect
function playVinylScratchSound() {
    // In a real implementation, this would play an actual sound
    log('*vinyl scratch sound*');
}

// Generate mock song data based on seed
function generateMockSong(seed) {
    // This would be replaced with actual API calls to generate recommendations
    const genres = ['Rock', 'Pop', 'Hip Hop', 'Country', 'Jazz', 'Electronic', 'R&B', 'Folk', 'Classical'];
    const years = [1970, 1980, 1990, 2000, 2010, 2020];
    
    // Simple "algorithm" to generate consistent but varied results based on seed
    const seedHash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    return {
        name: `${seed} Vibes`,
        artist: `The ${seed.charAt(0).toUpperCase() + seed.slice(1)} Band`,
        album: `${seed.charAt(0).toUpperCase() + seed.slice(1)} Sessions`,
        year: years[seedHash % years.length],
        genre: genres[seedHash % genres.length],
        why: `Based on your "${seed}" seed - matching mood and style`
    };
}

// Create a new song card
function createSongCard(songData) {
    const newCard = document.createElement('div');
    newCard.className = 'song-card';
    
    // Store Spotify URI in the card's dataset if available
    if (songData.spotifyUri) {
        newCard.dataset.spotifyUri = songData.spotifyUri;
    }
    
    newCard.innerHTML = `
        <div class="song-info">
            <p class="song-name">Name: ${songData.name}</p>
            <p class="song-artist">Artist: ${songData.artist}</p>
            <p class="song-album">Album: ${songData.album}</p>
            <p class="song-year">Year: ${songData.year}</p>
            <p class="song-genre">Genre: ${songData.genre}</p>
            <p class="song-why">Why: ${songData.why}</p>
            <p class="song-stats">Plays: 0 | Freq: 0x/day | <span class="cooldown" data-cooldown="1">🐇</span></p>
        </div>
        <div class="feedback">
            <div class="positive">
                <button class="thumbs-up">👍</button>
                <button class="trait-btn positive-btn" data-trait="Lyrics">Lyrics +</button>
                <button class="trait-btn positive-btn" data-trait="Genre">Genre +</button>
                <button class="trait-btn positive-btn" data-trait="Speed">Speed +</button>
                <button class="trait-btn positive-btn" data-trait="Topic">Topic +</button>
                <button class="trait-btn positive-btn" data-trait="Time">Time +</button>
            </div>
            <div class="negative">
                <button class="thumbs-down">👎</button>
                <button class="trait-btn negative-btn" data-trait="Lyrics">Lyrics -</button>
                <button class="trait-btn negative-btn" data-trait="Genre">Genre -</button>
                <button class="trait-btn negative-btn" data-trait="Speed">Speed -</button>
                <button class="trait-btn negative-btn" data-trait="Topic">Topic -</button>
                <button class="trait-btn negative-btn" data-trait="Time">Time -</button>
            </div>
        </div>
    `;
    
    // Add click event listener to play the song when the card is clicked
    newCard.addEventListener('click', function(event) {
        // Ignore clicks on buttons
        if (event.target.tagName === 'BUTTON') {
            return;
        }
        
        log(`Song card clicked: ${songData.name} by ${songData.artist}`);
        
        // Set this card as the now playing card
        const allCards = document.querySelectorAll('.song-card');
        allCards.forEach(card => card.classList.remove('now-playing'));
        newCard.classList.add('now-playing');
        
        // Update the now playing display
        updateNowPlayingCard();
        
        // If not already playing, start playback
        if (!isPlaying) {
            togglePlayPause();
        } else {
            // If already playing, just switch to this track
            if (spotifyAuthState.isAuthenticated) {
                // Check if the card has a Spotify URI
                const spotifyUri = newCard.dataset.spotifyUri;
                if (spotifyUri) {
                    log(`Playing Spotify track: ${spotifyUri}`);
                    playSpotifyTrack(spotifyUri);
                } else {
                    log('No Spotify URI found for this track, searching...');
                    searchAndPlaySpotifyTrack(songData.name, songData.artist);
                }
            }
        }
    });
    
    return newCard;
}

// Load mock playlist data
function loadMockPlaylist() {
    // In a real implementation, this would load actual playlist data
    log('Loading mock playlist data');
    
    // Start with paused state
    isPlaying = false;
    playPauseBtn.textContent = '▶️';
    
    // Set first card as now playing
    const firstCard = document.querySelector('.song-card');
    if (firstCard) {
        firstCard.classList.add('now-playing');
    }
}

function nextTrack() {
    playNextTrack();
}

// Play a track on Spotify
async function playSpotifyTrack(songData) {
    if (!spotifyAuthState.isAuthenticated || !spotifyAuthState.deviceId) {
        log('Spotify not authenticated or no device ID available');
        return false;
    }
    
    try {
        log(`Searching for track: ${songData.name} by ${songData.artist}`);
        
        // Search for the track
        const searchResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(songData.name + ' ' + songData.artist)}&type=track&limit=1`, {
            headers: {
                'Authorization': `Bearer ${spotifyAuthState.accessToken}`
            }
        });
        
        if (!searchResponse.ok) {
            log(`Spotify search API error: ${searchResponse.status}`);
            return false;
        }
        
        const searchData = await searchResponse.json();
        
        if (!searchData.tracks || !searchData.tracks.items || searchData.tracks.items.length === 0) {
            log('No tracks found');
            return false;
        }
        
        const track = searchData.tracks.items[0];
        log(`Found track: ${track.name} by ${track.artists[0].name} (${track.uri})`);
        
        // Play the track
        const playResponse = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${spotifyAuthState.deviceId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${spotifyAuthState.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                uris: [track.uri]
            })
        });
        
        if (!playResponse.ok && playResponse.status !== 204) {
            const errorText = await playResponse.text();
            log(`Failed to play track: ${playResponse.status} - ${errorText}`);
            return false;
        }
        
        log(`Now playing: ${track.name} by ${track.artists[0].name}`);
        
        // Update UI to reflect playing state
        isPlaying = true;
        playPauseBtn.textContent = '⏸️';
        startProgressSimulation();
        updateNowPlayingCard();
        
        return true;
    } catch (error) {
        log(`Error playing Spotify track: ${error.message}`);
        return false;
    }
}

// Make the function available globally
window.playSpotifyTrack = playSpotifyTrack;

// Search for and play a Spotify track
async function searchAndPlaySpotifyTrack(songName, songArtist) {
    try {
        log(`Searching for track: ${songName} by ${songArtist}`);
        
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
        
        // Search for the track
        const searchResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(songName + ' ' + songArtist)}&type=track&limit=1`, {
            headers: {
                'Authorization': `Bearer ${spotifyAuthState.accessToken}`
            }
        });
        
        if (!searchResponse.ok) {
            log(`Spotify search API error: ${searchResponse.status}`);
            return false;
        }
        
        const searchData = await searchResponse.json();
        
        if (!searchData.tracks || !searchData.tracks.items || searchData.tracks.items.length === 0) {
            log('No tracks found');
            return false;
        }
        
        const track = searchData.tracks.items[0];
        log(`Found track: ${track.name} by ${track.artists[0].name} (${track.uri})`);
        
        // Play the track
        const playResponse = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${spotifyAuthState.deviceId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${spotifyAuthState.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                uris: [track.uri]
            })
        });
        
        if (!playResponse.ok && playResponse.status !== 204) {
            const errorText = await playResponse.text();
            log(`Failed to play track: ${playResponse.status} - ${errorText}`);
            return false;
        }
        
        log(`Now playing: ${track.name} by ${track.artists[0].name}`);
        
        // Update UI to reflect playing state
        isPlaying = true;
        playPauseBtn.textContent = '⏸️';
        startProgressSimulation();
        updateNowPlayingCard();
        
        return true;
    } catch (error) {
        log(`Error playing Spotify track: ${error.message}`);
        return false;
    }
}

// Find a Spotify track by name and artist
async function findSpotifyTrack(songName, songArtist) {
    try {
        log(`Searching for track: ${songName} by ${songArtist}`);
        
        // Search for the track
        const searchResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(songName + ' ' + songArtist)}&type=track&limit=1`, {
            headers: {
                'Authorization': `Bearer ${spotifyAuthState.accessToken}`
            }
        });
        
        if (!searchResponse.ok) {
            log(`Spotify search API error: ${searchResponse.status}`);
            return null;
        }
        
        const searchData = await searchResponse.json();
        
        if (!searchData.tracks || !searchData.tracks.items || searchData.tracks.items.length === 0) {
            log('No tracks found');
            return null;
        }
        
        const track = searchData.tracks.items[0];
        log(`Found track: ${track.name} by ${track.artists[0].name} (${track.uri})`);
        
        return track.uri;
    } catch (error) {
        log(`Error finding Spotify track: ${error.message}`);
        return null;
    }
}
