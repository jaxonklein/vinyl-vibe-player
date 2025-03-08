/**
 * RecommendationEngine.js
 * Main entry point for the recommendation engine
 */

import DataManager from './DataManager.js';
import LLMInterface from './LLMInterface.js';
import PlaylistGenerator from './PlaylistGenerator.js';
import FeedbackProcessor from './FeedbackProcessor.js';
import CooldownManager from './CooldownManager.js';
import UIBridge from './UIBridge.js';
import config from './config.js';
import debugLogger from './DebugLogger.js';

class RecommendationEngine {
  /**
   * Initialize the recommendation engine
   * @param {Object} userConfig - Configuration options
   */
  constructor(userConfig = {}) {
    this.config = {
      ...config,
      ...userConfig
    };

    // Enable debug mode if requested
    if (this.config.debug) {
      console.log("Recommendation Engine starting in DEBUG mode");
      debugLogger.log("Recommendation Engine starting in DEBUG mode", "info");
    }

    // Initialize components
    this.initComponents();
    
    // Bind event handlers
    this.bindEventHandlers();
  }

  /**
   * Initialize all engine components
   */
  initComponents() {
    try {
      // Create components in dependency order
      this.dataManager = new DataManager();
      this.uiBridge = new UIBridge(this.dataManager);
      
      // Validate API key
      if (!this.config.apiKey || this.config.apiKey.trim() === '') {
        throw new Error("No API key provided. A valid OpenAI API key is required.");
      }
      
      this.llmInterface = new LLMInterface(this.config.apiKey);
      this.playlistGenerator = new PlaylistGenerator(this.dataManager, this.llmInterface, this.uiBridge);
      this.feedbackProcessor = new FeedbackProcessor(this.dataManager, this.llmInterface, this.playlistGenerator, this.uiBridge);
      this.cooldownManager = new CooldownManager(this.dataManager, this.playlistGenerator, this.uiBridge);
      
      debugLogger.log("All engine components initialized", "info");
    } catch (error) {
      debugLogger.logError(error);
      if (this.config.onError) {
        this.config.onError(error);
      }
      throw error;
    }
  }

  /**
   * Bind event handlers to UI elements
   */
  bindEventHandlers() {
    const handlers = {
      // Add seed button handler
      onAddSeed: () => this.promptForSeed(),
      
      // Slider change handler
      onSliderChange: (name, value) => this.handleSliderChange(name, value),
      
      // Reset sliders handler
      onResetSliders: () => this.resetSliders(),
      
      // Feedback button handler
      onFeedback: (songId, trait, value) => this.handleFeedback(songId, trait, value),
      
      // Cooldown cycle handler
      onCycleCooldown: (songId) => this.handleCycleCooldown(songId),
      
      // Play song handler
      onPlaySong: (index) => this.playSong(index)
    };
    
    // Bind to UI bridge
    this.uiBridge.bindEvents(handlers);
    
    debugLogger.log("Event handlers bound to UI elements", "info");
  }

  /**
   * Prompt user for a seed
   */
  promptForSeed() {
    // Show a simple prompt dialog
    const seedValue = prompt("Enter a song, artist, or mood to generate recommendations:");
    
    if (seedValue && seedValue.trim()) {
      this.generateFromSeed({
        type: 'text',
        value: seedValue.trim()
      });
    }
  }

  /**
   * Generate playlist from a seed
   * @param {Object} seed - Seed object {type, value}
   */
  async generateFromSeed(seed) {
    try {
      debugLogger.log("Generating playlist from seed: " + JSON.stringify(seed), "info");
      await this.playlistGenerator.generate(seed);
    } catch (error) {
      console.error("Error generating from seed:", error);
      debugLogger.logError(error);
      this.uiBridge.displayError(`Failed to generate playlist: ${error.message}`);
    }
  }

  /**
   * Handle slider change event
   * @param {string} name - Slider name
   * @param {number} value - Slider value
   */
  handleSliderChange(name, value) {
    console.log(`Slider changed: ${name} = ${value}`);
    
    // Update data manager
    const sliders = { ...this.dataManager.preferences.sliders };
    sliders[name] = value;
    this.dataManager.updatePreferences('sliders', sliders);
    
    // Trigger playlist update with debounce
    this.playlistGenerator.updateFromSliders();
  }

  /**
   * Reset sliders to default values
   */
  resetSliders() {
    console.log("Resetting sliders to default values");
    
    // Default slider values
    const defaultSliders = {
      genreVariety: 50,
      artistFame: 50,
      themeFocus: 50,
      seedArtistMix: 50
    };
    
    // Update data manager
    this.dataManager.updatePreferences('sliders', defaultSliders);
    
    // Update UI
    const sliders = document.querySelectorAll('input[type="range"]');
    sliders.forEach(slider => {
      if (defaultSliders[slider.name] !== undefined) {
        slider.value = defaultSliders[slider.name];
      }
    });
    
    // Trigger playlist update
    this.playlistGenerator.updateFromSliders();
  }

  /**
   * Update engine configuration
   * @param {Object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };
    
    // If API key was updated, recreate LLM interface
    if (newConfig.apiKey !== undefined) {
      try {
        if (!newConfig.apiKey || newConfig.apiKey.trim() === '') {
          throw new Error("No API key provided. A valid OpenAI API key is required.");
        }
        
        // Create new LLM interface with updated API key
        this.llmInterface = new LLMInterface(newConfig.apiKey);
        
        // Update components that depend on LLM interface
        this.playlistGenerator = new PlaylistGenerator(this.dataManager, this.llmInterface, this.uiBridge);
        this.feedbackProcessor = new FeedbackProcessor(this.dataManager, this.llmInterface, this.playlistGenerator, this.uiBridge);
        
        debugLogger.log("Engine configuration updated with new API key", "info");
      } catch (error) {
        debugLogger.logError(error);
        if (this.config.onError) {
          this.config.onError(error);
        }
        throw error;
      }
    }
  }

  /**
   * Handle feedback button click
   * @param {string} songId - Song identifier
   * @param {string} trait - Feedback trait
   * @param {string} value - Feedback value (+ or -)
   */
  handleFeedback(songId, trait, value) {
    console.log(`Feedback received: ${songId}, ${trait}, ${value}`);
    this.feedbackProcessor.process(songId, trait, value);
  }

  /**
   * Handle cooldown cycle click
   * @param {string} songId - Song identifier
   */
  handleCycleCooldown(songId) {
    console.log(`Cycling cooldown for: ${songId}`);
    const nextType = this.cooldownManager.cycleCooldown(songId);
    console.log(`New cooldown type: ${nextType}`);
  }

  /**
   * Play a song from the playlist
   * @param {number} index - Song index in playlist
   */
  playSong(index) {
    const state = this.dataManager.getState();
    const playlist = state.playlist;
    
    if (!playlist || index >= playlist.length) {
      console.error(`Invalid song index: ${index}`);
      return;
    }
    
    const song = playlist[index];
    console.log(`Playing song: ${song.song} by ${song.artist}`);
    
    // Add to last 10 songs
    this.dataManager.addToLast10(song.song, song.artist);
    
    // Reorder playlist to move the selected song to the first position
    if (index > 0) {
      // Remove the song from its current position
      const selectedSong = playlist.splice(index, 1)[0];
      // Add it to the beginning of the playlist
      playlist.unshift(selectedSong);
      
      // The playlist is already updated in the state since we're modifying the reference
      console.log("Moved selected song to first position in playlist");
    }
    
    // Update UI
    this.uiBridge.updateCards(playlist);
    
    // Return song info for external player
    return song;
  }

  /**
   * Get the current state
   * @returns {Object} - Current state
   */
  getState() {
    return this.dataManager.getState();
  }

  /**
   * Get user preferences
   * @returns {Object} - User preferences
   */
  getPreferences() {
    return this.dataManager.preferences;
  }
}

// Export the class
export default RecommendationEngine;
