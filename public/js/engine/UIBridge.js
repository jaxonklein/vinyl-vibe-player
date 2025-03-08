/**
 * UIBridge.js
 * Connects the recommendation engine to the UI elements
 */

class UIBridge {
  /**
   * Initialize the UI bridge
   * @param {Object} dataManager - Data manager instance
   */
  constructor(dataManager) {
    this.data = dataManager;
    
    // UI elements
    this.carousel = document.querySelector('.carousel');
    this.addSeedBtn = document.querySelector('.add-seed');
    this.sliders = document.querySelectorAll('input[type="range"]');
    this.resetSlidersBtn = document.querySelector('.reset-sliders');
    
    // Create error display element
    this.errorDiv = document.createElement('div');
    this.errorDiv.className = 'error-message';
    this.errorDiv.style.cssText = 'color: #FFF; padding: 10px; display: none; position: fixed; top: 10px; left: 50%; transform: translateX(-50%); background: rgba(255, 0, 0, 0.8); border-radius: 4px; z-index: 1000; max-width: 80%; text-align: center;';
    document.body.appendChild(this.errorDiv);
    
    // Create loading indicator
    this.loadingDiv = document.createElement('div');
    this.loadingDiv.className = 'loading-indicator';
    this.loadingDiv.style.cssText = 'display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(139, 69, 19, 0.9); color: #FFF8DC; padding: 15px 20px; z-index: 1000; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.3);';
    document.body.appendChild(this.loadingDiv);
    
    // Create status indicators
    this.statusDiv = document.createElement('div');
    this.statusDiv.className = 'status-indicators';
    this.statusDiv.style.cssText = 'position: fixed; bottom: 10px; right: 10px; display: flex; gap: 10px; z-index: 900;';
    document.body.appendChild(this.statusDiv);
    
    // Slider pending indicator
    this.sliderPendingIndicator = this.createStatusIndicator('slider-pending', '🎛️', 'Updating from sliders...');
    this.statusDiv.appendChild(this.sliderPendingIndicator);
    
    // Feedback pending indicator
    this.feedbackPendingIndicator = this.createStatusIndicator('feedback-pending', '👍', 'Processing feedback...');
    this.statusDiv.appendChild(this.feedbackPendingIndicator);
  }

  /**
   * Create a status indicator element
   * @param {string} id - Element ID
   * @param {string} icon - Icon to display
   * @param {string} tooltip - Tooltip text
   * @returns {HTMLElement} - Status indicator element
   */
  createStatusIndicator(id, icon, tooltip) {
    const indicator = document.createElement('div');
    indicator.id = id;
    indicator.className = 'status-indicator';
    indicator.innerHTML = icon;
    indicator.title = tooltip;
    indicator.style.cssText = 'display: none; background: rgba(255, 165, 0, 0.8); color: #FFF; padding: 5px 10px; border-radius: 4px; cursor: help;';
    return indicator;
  }

  /**
   * Update the song cards in the carousel
   * @param {Array} playlist - Playlist data
   */
  updateCards(playlist) {
    // Clear existing cards except the add seed button
    if (this.carousel) {
      // Keep the add seed button if it exists
      const addSeedBtn = this.carousel.querySelector('.add-seed');
      const welcomeCard = this.carousel.querySelector('.welcome-card');
      
      // Clear the carousel
      this.carousel.innerHTML = '';
      
      // If playlist is empty, show welcome card
      if (!playlist || playlist.length === 0) {
        if (welcomeCard) {
          this.carousel.appendChild(welcomeCard);
        } else {
          // Create welcome card if it doesn't exist
          const newWelcomeCard = document.createElement('div');
          newWelcomeCard.className = 'welcome-card';
          newWelcomeCard.innerHTML = `
            <h2>Welcome to Vinyl Vibe</h2>
            <p>Start by adding a song, artist, genre, or mood to create your personalized playlist.</p>
            <button class="start-button">Get Started</button>
          `;
          
          this.carousel.appendChild(newWelcomeCard);
        }
      } else {
        // Add song cards
        playlist.forEach((song, index) => {
          const isNowPlaying = index === 0;
          const card = this.createSongCard(song, isNowPlaying);
          this.carousel.appendChild(card);
          
          // Attach event listeners to the card
          this.attachCardEventListeners(card, song);
        });
      }
      
      // Add the seed button back
      if (addSeedBtn) {
        this.carousel.appendChild(addSeedBtn);
      }
    }
  }

  /**
   * Create a song card element
   * @param {Object} song - Song data
   * @param {boolean} isNowPlaying - Whether this is the currently playing song
   * @returns {HTMLElement} - Song card element
   */
  createSongCard(song, isNowPlaying = false) {
    const songId = `${song.title}_${song.artist}`.replace(/\s+/g, '_');
    
    // Create card element
    const card = document.createElement('div');
    card.className = isNowPlaying ? 'song-card now-playing' : 'song-card';
    card.dataset.songId = songId;
    
    // Get play stats
    const cooldown = this.data.preferences.cooldowns.get(songId);
    const plays = cooldown?.plays || 0;
    const frequency = this.data.getPlayFrequency(songId);
    
    // Create card content
    card.innerHTML = `
      <div class="song-info">
        <p class="song-name">Name: ${song.title}</p>
        <p class="song-artist">Artist: ${song.artist}</p>
        <p class="song-why">Why: ${song.reason || 'Based on your preferences'}</p>
        <p class="song-stats">Plays: ${plays} | Freq: ${frequency} | <span class="cooldown" data-cooldown="default">⏳</span></p>
      </div>
      <div class="feedback">
        <div class="positive">
          <button class="thumbs-up" data-trait="general" data-value="+">👍</button>
          <button class="trait-btn positive-btn" data-trait="lyrics" data-value="+">Lyrics +</button>
          <button class="trait-btn positive-btn" data-trait="genre" data-value="+">Genre +</button>
          <button class="trait-btn positive-btn" data-trait="speed" data-value="+">Speed +</button>
          <button class="trait-btn positive-btn" data-trait="topic" data-value="+">Topic +</button>
          <button class="trait-btn positive-btn" data-trait="time" data-value="+">Time +</button>
        </div>
        <div class="negative">
          <button class="thumbs-down" data-trait="general" data-value="-">👎</button>
          <button class="trait-btn negative-btn" data-trait="lyrics" data-value="-">Lyrics -</button>
          <button class="trait-btn negative-btn" data-trait="genre" data-value="-">Genre -</button>
          <button class="trait-btn negative-btn" data-trait="speed" data-value="-">Speed -</button>
          <button class="trait-btn negative-btn" data-trait="topic" data-value="-">Topic -</button>
          <button class="trait-btn negative-btn" data-trait="time" data-value="-">Time -</button>
        </div>
      </div>
    `;
    
    return card;
  }

  /**
   * Attach event listeners to a song card
   * @param {HTMLElement} card - Song card element
   * @param {Object} song - Song data
   */
  attachCardEventListeners(card, song) {
    // Make the entire card clickable to play the song
    card.addEventListener('click', (event) => {
      // Only trigger if the click is on the card itself or song-info, not on buttons
      if (!event.target.closest('.thumbs-up, .thumbs-down, .trait-btn, .cooldown')) {
        // Find the index of this song in the playlist
        const songId = card.dataset.songId;
        const playlist = this.data.getState().playlist;
        const index = playlist.findIndex(s => `${s.title}_${s.artist}`.replace(/\s+/g, '_') === songId);
        
        if (index !== -1 && this.onPlaySong) {
          this.onPlaySong(index);
        }
      }
    });
    
    // Add cursor pointer style to indicate clickability
    card.style.cursor = 'pointer';
    
    // Feedback buttons (thumbs up/down and trait buttons)
    const feedbackButtons = card.querySelectorAll('.thumbs-up, .thumbs-down, .trait-btn');
    feedbackButtons.forEach(button => {
      button.addEventListener('click', () => {
        const songId = card.dataset.songId;
        const trait = button.dataset.trait;
        const value = button.dataset.value;
        
        // Call the onFeedback handler
        if (this.onFeedback) {
          this.onFeedback(songId, trait, value);
        }
      });
    });
    
    // Cooldown toggle
    const cooldownSpan = card.querySelector('.cooldown');
    cooldownSpan.addEventListener('click', () => {
      const songId = card.dataset.songId;
      
      // Call the onCycleCooldown handler
      if (this.onCycleCooldown) {
        this.onCycleCooldown(songId);
      }
    });
  }

  /**
   * Display an error message
   * @param {string} message - Error message
   */
  displayError(message) {
    console.error("Vinyl Vibe Error:", message);
    
    this.errorDiv.textContent = `Error: ${message}`;
    this.errorDiv.style.display = 'block';
    
    // Hide error after 5 seconds
    setTimeout(() => {
      this.errorDiv.style.display = 'none';
    }, 5000);
  }

  /**
   * Show loading indicator
   * @param {string} message - Loading message
   */
  showLoading(message = 'Loading...') {
    this.loadingDiv.textContent = message;
    this.loadingDiv.style.display = 'block';
  }

  /**
   * Hide loading indicator
   */
  hideLoading() {
    this.loadingDiv.style.display = 'none';
  }

  /**
   * Show slider pending indicator
   */
  showSliderPending() {
    this.sliderPendingIndicator.style.display = 'block';
  }

  /**
   * Hide slider pending indicator
   */
  hideSliderPending() {
    this.sliderPendingIndicator.style.display = 'none';
  }

  /**
   * Show feedback pending indicator
   */
  showFeedbackPending() {
    this.feedbackPendingIndicator.style.display = 'block';
  }

  /**
   * Hide feedback pending indicator
   */
  hideFeedbackPending() {
    this.feedbackPendingIndicator.style.display = 'none';
  }

  /**
   * Update cooldown display for a song
   * @param {string} songId - Song identifier
   * @param {string} type - Cooldown type
   * @param {string} icon - Cooldown icon
   */
  updateCooldownDisplay(songId, type, icon) {
    const cards = document.querySelectorAll(`.song-card[data-song-id="${songId}"]`);
    
    cards.forEach(card => {
      const cooldownSpan = card.querySelector('.cooldown');
      if (cooldownSpan) {
        cooldownSpan.textContent = icon;
        cooldownSpan.dataset.cooldown = type;
      }
    });
  }

  /**
   * Bind event handlers to UI elements
   * @param {Object} handlers - Event handler functions
   */
  bindEvents(handlers) {
    // Store handlers for later use
    this.onFeedback = handlers.onFeedback;
    this.onCycleCooldown = handlers.onCycleCooldown;
    this.onPlaySong = handlers.onPlaySong;
    
    // Add seed button
    if (this.addSeedBtn) {
      this.addSeedBtn.addEventListener('click', () => {
        if (handlers.onAddSeed) {
          handlers.onAddSeed();
        }
      });
    }
    
    // Slider inputs
    this.sliders.forEach(slider => {
      slider.addEventListener('input', (event) => {
        if (handlers.onSliderChange) {
          const name = event.target.name;
          const value = parseInt(event.target.value);
          handlers.onSliderChange(name, value);
        }
      });
    });
    
    // Reset sliders button
    if (this.resetSlidersBtn) {
      this.resetSlidersBtn.addEventListener('click', () => {
        if (handlers.onResetSliders) {
          handlers.onResetSliders();
        }
      });
    }
    
    // Delegate event listeners for dynamically created elements
    document.addEventListener('click', (event) => {
      // Feedback buttons (thumbs up/down and trait buttons)
      if (event.target.closest('.thumbs-up, .thumbs-down, .trait-btn')) {
        const button = event.target.closest('.thumbs-up, .thumbs-down, .trait-btn');
        const card = button.closest('.song-card');
        
        if (card && handlers.onFeedback) {
          const songId = card.dataset.songId;
          const trait = button.dataset.trait;
          const value = button.dataset.value;
          
          handlers.onFeedback(songId, trait, value);
        }
      }
      
      // Cooldown toggle
      if (event.target.closest('.cooldown')) {
        const cooldownSpan = event.target.closest('.cooldown');
        const card = cooldownSpan.closest('.song-card');
        
        if (card && handlers.onCycleCooldown) {
          const songId = card.dataset.songId;
          handlers.onCycleCooldown(songId);
        }
      }
      
      // Start button on welcome card
      if (event.target.closest('.start-button')) {
        const startButton = event.target.closest('.start-button');
        
        if (handlers.onAddSeed) {
          handlers.onAddSeed();
        }
      }
    });
  }
}

// Export the class
export default UIBridge;
