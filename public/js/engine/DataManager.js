/**
 * DataManager.js
 * Manages application state, user preferences, and bounded history
 */

class DataManager {
  /**
   * Initialize the data manager with default values
   */
  constructor() {
    // User preferences (persist between sessions)
    this.preferences = {
      // Slider values (0-100)
      sliders: {
        genreVariety: 50,   // 0=focused, 100=diverse
        artistFame: 50,     // 0=obscure, 100=popular
        themeFocus: 50,     // 0=loose, 100=strict
        seedArtistMix: 50   // 0=different, 100=similar
      },
      // Default cooldown (2 days in seconds)
      defaultCooldown: {
        type: "default",
        duration: 172800  // 2 days in seconds
      },
      // Song-specific cooldowns (Map of songId -> cooldown info)
      cooldowns: new Map()
    };

    // Session state (reset on page reload)
    this.session = {
      seed: null,                  // Current seed {type, value}
      traits: {},                  // Extracted traits from seed
      playlist: [],                // Current playlist
      feedbackHistory: [],         // Limited to last 50 feedback items
      last10Songs: [],             // Last 10 songs played
      errors: []                   // Recent errors
    };

    // Load saved preferences from localStorage if available
    this.loadFromStorage();
  }

  /**
   * Load preferences from localStorage
   */
  loadFromStorage() {
    try {
      const savedPreferences = localStorage.getItem('vinylVibePreferences');
      if (savedPreferences) {
        const parsed = JSON.parse(savedPreferences);
        
        // Restore sliders
        if (parsed.sliders) {
          this.preferences.sliders = {
            ...this.preferences.sliders,
            ...parsed.sliders
          };
        }
        
        // Restore cooldowns (convert from object to Map)
        if (parsed.cooldowns) {
          this.preferences.cooldowns = new Map(Object.entries(parsed.cooldowns));
        }
        
        console.log("Loaded preferences from storage:", this.preferences);
      }
    } catch (error) {
      console.error("Failed to load preferences from storage:", error);
    }
  }

  /**
   * Save preferences to localStorage
   */
  saveToStorage() {
    try {
      // Convert Map to object for JSON serialization
      const cooldownsObj = Object.fromEntries(this.preferences.cooldowns);
      
      const toSave = {
        sliders: this.preferences.sliders,
        cooldowns: cooldownsObj
      };
      
      localStorage.setItem('vinylVibePreferences', JSON.stringify(toSave));
      console.log("Saved preferences to storage");
    } catch (error) {
      console.error("Failed to save preferences to storage:", error);
    }
  }

  /**
   * Update a specific preference
   * @param {string} key - Preference key
   * @param {any} value - New value
   */
  updatePreferences(key, value) {
    if (key === 'sliders') {
      this.preferences.sliders = {
        ...this.preferences.sliders,
        ...value
      };
    } else {
      this.preferences[key] = value;
    }
    
    // Save changes to storage
    this.saveToStorage();
  }

  /**
   * Get the current session state
   * @returns {Object} - Session state
   */
  getState() {
    return this.session;
  }

  /**
   * Add a song to the last 10 songs list
   * @param {string} song - Song name
   * @param {string} artist - Artist name
   */
  addToLast10(song, artist) {
    const entry = {
      song,
      artist,
      timestamp: Date.now()
    };
    
    // Add to the beginning of the array
    this.session.last10Songs.unshift(entry);
    
    // Keep only the last 10 items
    if (this.session.last10Songs.length > 10) {
      this.session.last10Songs.pop();
    }
    
    // Update play statistics
    this.updatePlayStats(song, artist);
  }

  /**
   * Update play statistics for a song
   * @param {string} song - Song name
   * @param {string} artist - Artist name
   */
  updatePlayStats(song, artist) {
    const songId = `${song}_${artist}`.replace(/\s+/g, '_');
    
    // Get existing cooldown or create a new one based on default
    const cooldown = this.preferences.cooldowns.get(songId) || {
      ...this.preferences.defaultCooldown,
      plays: 0,
      lastPlayed: 0
    };
    
    // Update play count and last played timestamp
    cooldown.plays = (cooldown.plays || 0) + 1;
    cooldown.lastPlayed = Date.now();
    
    // Reset play count if cooldown has expired
    if (Date.now() - cooldown.lastPlayed > cooldown.duration * 1000) {
      cooldown.plays = 1;
    }
    
    // Save updated cooldown
    this.preferences.cooldowns.set(songId, cooldown);
    this.saveToStorage();
  }

  /**
   * Get play frequency for a song
   * @param {string} songId - Song identifier
   * @returns {string} - Formatted frequency
   */
  getPlayFrequency(songId) {
    const cooldown = this.preferences.cooldowns.get(songId);
    if (!cooldown || !cooldown.plays) {
      return "0x/day";
    }
    
    // Calculate plays per day (rounded to 1 decimal)
    const playsPerDay = Math.round((cooldown.plays / 7) * 10) / 10;
    return `${playsPerDay}x/day`;
  }

  /**
   * Add feedback to history
   * @param {string} songId - Song identifier
   * @param {string} trait - Feedback trait
   * @param {string} value - Feedback value (+ or -)
   */
  addFeedback(songId, trait, value) {
    this.session.feedbackHistory.push({
      songId,
      trait,
      value,
      timestamp: Date.now()
    });
    
    this.trimFeedbackHistory();
  }

  /**
   * Trim feedback history to the last 50 items
   */
  trimFeedbackHistory() {
    if (this.session.feedbackHistory.length > 50) {
      this.session.feedbackHistory = this.session.feedbackHistory.slice(-50);
    }
  }

  /**
   * Add an error to the session
   * @param {string} message - Error message
   */
  addError(message) {
    this.session.errors.push({
      message,
      timestamp: Date.now()
    });
    
    // Keep only the last 10 errors
    if (this.session.errors.length > 10) {
      this.session.errors.shift();
    }
  }

  /**
   * Clear all errors
   */
  clearErrors() {
    this.session.errors = [];
  }
}

// Export the class
export default DataManager;
