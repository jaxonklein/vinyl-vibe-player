/**
 * FeedbackProcessor.js
 * Processes user feedback and updates traits with debouncing
 */

class FeedbackProcessor {
  /**
   * Initialize the feedback processor
   * @param {Object} dataManager - Data manager instance
   * @param {Object} llmInterface - LLM interface instance
   * @param {Object} playlistGenerator - Playlist generator instance
   * @param {Object} uiBridge - UI bridge instance
   */
  constructor(dataManager, llmInterface, playlistGenerator, uiBridge) {
    this.data = dataManager;
    this.llm = llmInterface;
    this.playlistGen = playlistGenerator;
    this.uiBridge = uiBridge;
    this.debounceTimeout = null;
    this.pendingFeedback = [];
    this.isProcessing = false;
  }

  /**
   * Process feedback for a song
   * @param {string} songId - Song identifier
   * @param {string} trait - Feedback trait
   * @param {string} value - Feedback value (+ or -)
   */
  async process(songId, trait, value) {
    console.log(`Processing feedback: ${songId}, ${trait}, ${value}`);
    
    // Add to data manager
    this.data.addFeedback(songId, trait, value);
    
    // Add to pending feedback
    this.pendingFeedback.push({ songId, trait, value, timestamp: Date.now() });
    
    // Show feedback pending indicator
    this.uiBridge.showFeedbackPending();
    
    // Clear existing timeout
    clearTimeout(this.debounceTimeout);
    
    // Set new timeout (4 seconds)
    this.debounceTimeout = setTimeout(() => this.processPendingFeedback(), 4000);
  }

  /**
   * Process all pending feedback after debounce
   */
  async processPendingFeedback() {
    // Prevent concurrent processing
    if (this.isProcessing || this.pendingFeedback.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      const state = this.data.getState();
      
      // Ensure we have traits to update
      if (!state.traits || Object.keys(state.traits).length === 0) {
        console.warn("No traits to update, skipping feedback processing");
        this.uiBridge.hideFeedbackPending();
        return;
      }
      
      console.log("Processing pending feedback:", this.pendingFeedback);
      this.uiBridge.showLoading("Updating music preferences...");
      
      // Format feedback for LLM
      const formattedFeedback = this.pendingFeedback.map(item => ({
        trait: item.trait,
        value: item.value
      }));
      
      // Call LLM to update traits
      const result = await this.llm.updateTraits(state.traits, formattedFeedback);
      
      if (result.error) {
        this.handleError(`Failed to update traits: ${result.error}`);
        return;
      }
      
      // Update traits in state
      state.traits = result;
      console.log("Updated traits:", state.traits);
      
      // Clear pending feedback
      this.pendingFeedback = [];
      this.uiBridge.hideFeedbackPending();
      
      // Automatically regenerate playlist
      console.log("Regenerating playlist based on updated traits");
      await this.playlistGen.generate(state.seed);
      
    } catch (error) {
      this.handleError(`Feedback processing failed: ${error.message}`);
    } finally {
      this.isProcessing = false;
      this.uiBridge.hideLoading();
    }
  }

  /**
   * Handle feedback processing errors
   * @param {string} message - Error message
   */
  handleError(message) {
    console.error(message);
    this.data.addError(message);
    this.uiBridge.displayError(message);
    this.uiBridge.hideFeedbackPending();
  }

  /**
   * Cancel pending feedback processing
   */
  cancelPendingFeedback() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
    
    this.pendingFeedback = [];
    this.uiBridge.hideFeedbackPending();
  }
}

// Export the class
export default FeedbackProcessor;
