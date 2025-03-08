/**
 * PlaylistGenerator.js
 * Generates playlists based on seed, traits, and user preferences
 */

class PlaylistGenerator {
  /**
   * Initialize the playlist generator
   * @param {Object} dataManager - Data manager instance
   * @param {Object} llmInterface - LLM interface instance
   * @param {Object} uiBridge - UI bridge instance
   */
  constructor(dataManager, llmInterface, uiBridge) {
    this.data = dataManager;
    this.llm = llmInterface;
    this.uiBridge = uiBridge;
    this.sliderDebounce = null;
    this.isGenerating = false;
  }

  /**
   * Generate a playlist based on a seed
   * @param {Object} seed - Seed object {type, value}
   * @returns {Promise<Array>} - Generated playlist
   */
  async generate(seed) {
    // Prevent concurrent generation
    if (this.isGenerating) {
      console.log("Playlist generation already in progress, request queued");
      this._queuedSeed = seed;
      return;
    }
    
    this.isGenerating = true;
    this.uiBridge.showLoading("Generating playlist...");
    
    try {
      const state = this.data.getState();
      state.seed = seed;
      
      console.log(`Generating playlist for seed: ${seed.type} - ${seed.value}`);
      
      // Step 1: Interpret seed if needed
      if (!state.traits || !Object.keys(state.traits).length || seed.value !== state._lastSeedValue) {
        console.log("Interpreting seed traits...");
        const result = await this.llm.interpretSeed(seed);
        
        if (result.error) {
          throw new Error(`Failed to interpret seed: ${result.error}`);
        }
        
        state.traits = result;
        state._lastSeedValue = seed.value;
        
        // Update state directly instead of using setState
        this.data.session.traits = result;
        this.data.session._lastSeedValue = seed.value;
        
        console.log("Seed interpreted into traits:", state.traits);
      }
      
      // Step 2: Generate song recommendations
      console.log("Generating song recommendations based on traits...");
      this.uiBridge.showLoading("Generating song recommendations...");
      
      let recommendations = await this.llm.generateRecommendations(state.traits);
      
      // Log the recommendations for debugging
      console.log("Raw recommendations received:", JSON.stringify(recommendations));
      
      // If recommendations are empty or invalid, use fallback mock data
      if (!recommendations || !Array.isArray(recommendations) || recommendations.length === 0 || 
          recommendations.some(rec => !rec.title && !rec.song)) {
        console.log("Using fallback recommendations due to invalid result");
        recommendations = this._getFallbackRecommendations(seed.value, state.traits);
      }
      
      // Step 3: Create playlist from recommendations
      const playlist = recommendations.map((rec, index) => {
        // Ensure we have valid title and artist
        const title = rec.title || rec.song || `Song ${index + 1}`;
        const artist = rec.artist || "Unknown Artist";
        const reason = rec.reason || `Matches your ${seed.type}: ${seed.value}`;
        
        return {
          id: `song-${Date.now()}-${index}`,
          title: title,
          artist: artist,
          reason: reason,
          traits: { ...state.traits },
          seed: seed.value,
          cooldown: 0,
          feedback: []
        };
      });
      
      // Step 4: Update state with new playlist
      // Update state directly instead of using setState
      this.data.session.playlist = playlist;
      this.data.session.currentSongIndex = 0;
      
      // Update UI with new playlist
      this.uiBridge.updateCards(playlist);
      
      console.log("Playlist generated:", playlist);
      this.uiBridge.hideLoading();
      
      // Process queued seed if any
      if (this._queuedSeed) {
        const queuedSeed = this._queuedSeed;
        this._queuedSeed = null;
        this.isGenerating = false;
        this.generate(queuedSeed);
      } else {
        this.isGenerating = false;
      }
      
      return playlist;
    } catch (error) {
      this.isGenerating = false;
      this.uiBridge.hideLoading();
      console.error("Error generating playlist:", error);
      // Use the correct method to display errors
      this.uiBridge.displayError(`Failed to generate playlist: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get fallback recommendations when API fails
   * @param {string} seedValue - The seed value
   * @param {Object} traits - The interpreted traits
   * @returns {Array} - Fallback recommendations
   * @private
   */
  _getFallbackRecommendations(seedValue, traits) {
    console.log("Generating fallback recommendations for seed:", seedValue);
    
    // Generic recommendations based on common genres
    const fallbackSets = {
      rock: [
        { title: "Bohemian Rhapsody", artist: "Queen", reason: "Classic rock anthem with wide appeal" },
        { title: "Sweet Child O' Mine", artist: "Guns N' Roses", reason: "Iconic rock song with memorable guitar riff" },
        { title: "Stairway to Heaven", artist: "Led Zeppelin", reason: "Progressive rock masterpiece with folk influences" },
        { title: "Back in Black", artist: "AC/DC", reason: "Hard rock classic with driving rhythm" },
        { title: "Smells Like Teen Spirit", artist: "Nirvana", reason: "Grunge anthem that defined a generation" }
      ],
      pop: [
        { title: "Billie Jean", artist: "Michael Jackson", reason: "Iconic pop song with unforgettable bassline" },
        { title: "Shape of You", artist: "Ed Sheeran", reason: "Modern pop hit with catchy hooks" },
        { title: "Bad Guy", artist: "Billie Eilish", reason: "Contemporary pop with unique production" },
        { title: "Uptown Funk", artist: "Mark Ronson ft. Bruno Mars", reason: "Funk-inspired pop hit with retro feel" },
        { title: "Shake It Off", artist: "Taylor Swift", reason: "Upbeat pop anthem with catchy chorus" }
      ],
      jazz: [
        { title: "Take Five", artist: "Dave Brubeck", reason: "Jazz classic with distinctive 5/4 time signature" },
        { title: "So What", artist: "Miles Davis", reason: "Modal jazz masterpiece with cool, relaxed feel" },
        { title: "Take the 'A' Train", artist: "Duke Ellington", reason: "Swing era standard with memorable melody" },
        { title: "Autumn Leaves", artist: "Cannonball Adderley", reason: "Beautiful jazz standard with rich harmonies" },
        { title: "My Favorite Things", artist: "John Coltrane", reason: "Innovative jazz interpretation of a Broadway classic" }
      ],
      country: [
        { title: "Friends in Low Places", artist: "Garth Brooks", reason: "Country anthem with singalong chorus" },
        { title: "Jolene", artist: "Dolly Parton", reason: "Classic country with emotional storytelling" },
        { title: "Ring of Fire", artist: "Johnny Cash", reason: "Iconic country song with distinctive sound" },
        { title: "Cruise", artist: "Florida Georgia Line", reason: "Modern country with pop crossover appeal" },
        { title: "Before He Cheats", artist: "Carrie Underwood", reason: "Country hit with powerful vocals and narrative" }
      ],
      electronic: [
        { title: "Strobe", artist: "deadmau5", reason: "Progressive house classic with emotional build" },
        { title: "Levels", artist: "Avicii", reason: "EDM anthem with memorable melody" },
        { title: "Scary Monsters and Nice Sprites", artist: "Skrillex", reason: "Dubstep track that defined the genre" },
        { title: "Around the World", artist: "Daft Punk", reason: "Electronic dance classic with repetitive hook" },
        { title: "Sandstorm", artist: "Darude", reason: "Iconic trance track with recognizable melody" }
      ]
    };
    
    // Determine which set to use based on traits or seed
    let bestMatch = "pop"; // Default to pop
    
    if (traits && traits.genre && Array.isArray(traits.genre)) {
      // Try to match a genre from traits
      for (const genre of traits.genre) {
        const lowerGenre = genre.toLowerCase();
        for (const key of Object.keys(fallbackSets)) {
          if (lowerGenre.includes(key)) {
            bestMatch = key;
            break;
          }
        }
      }
    } else if (seedValue) {
      // Try to match seed value to a genre
      const lowerSeed = seedValue.toLowerCase();
      for (const key of Object.keys(fallbackSets)) {
        if (lowerSeed.includes(key)) {
          bestMatch = key;
          break;
        }
      }
    }
    
    console.log(`Selected fallback set: ${bestMatch}`);
    return fallbackSets[bestMatch];
  }

  /**
   * Process and filter the raw playlist from LLM
   * @param {Array} rawSongs - Raw song suggestions
   * @returns {Array} - Processed playlist
   */
  processPlaylist(rawSongs) {
    // Step 1: Deduplicate songs
    const uniqueSongs = this.deduplicate(rawSongs);
    
    // Step 2: Filter out songs on cooldown
    const availableSongs = uniqueSongs.filter(song => {
      const songId = this.createSongId(song.title, song.artist);
      return this.checkCooldown(songId);
    });
    
    // Step 3: Ensure we have at least some songs
    if (availableSongs.length === 0 && rawSongs.length > 0) {
      console.warn("All suggested songs are on cooldown, using first suggestion anyway");
      return [rawSongs[0]];
    }
    
    return availableSongs;
  }

  /**
   * Create a consistent song ID
   * @param {string} song - Song name
   * @param {string} artist - Artist name
   * @returns {string} - Song ID
   */
  createSongId(song, artist) {
    return `${song}_${artist}`.replace(/\s+/g, '_');
  }

  /**
   * Check if a song is on cooldown
   * @param {string} songId - Song identifier
   * @returns {boolean} - True if song is not on cooldown
   */
  checkCooldown(songId) {
    const cooldown = this.data.preferences.cooldowns.get(songId);
    
    // If no cooldown info, song is available
    if (!cooldown) {
      return true;
    }
    
    const now = Date.now();
    const lastPlayed = cooldown.lastPlayed || 0;
    const duration = cooldown.duration * 1000; // Convert to milliseconds
    
    // Check if cooldown has expired
    return (now - lastPlayed) > duration;
  }

  /**
   * Remove duplicate songs from playlist
   * @param {Array} songs - Song list
   * @returns {Array} - Deduplicated song list
   */
  deduplicate(songs) {
    const seen = new Set();
    return songs.filter(song => {
      // Skip songs without required fields
      if (!song.title && !song.song) {
        return false;
      }
      
      const key = `${song.title || song.song}_${song.artist}`.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      
      seen.add(key);
      return true;
    });
  }

  /**
   * Handle playlist generation errors
   * @param {string} message - Error message
   */
  handleError(message) {
    console.error(message);
    this.data.addError(message);
    this.uiBridge.displayError(message);
    this.uiBridge.hideLoading();
  }

  /**
   * Update playlist based on slider changes (with debounce)
   */
  updateFromSliders() {
    // Clear existing debounce timer
    clearTimeout(this.sliderDebounce);
    
    // Set UI to indicate pending update
    this.uiBridge.showSliderPending();
    
    // Set a new debounce timer (2 seconds)
    this.sliderDebounce = setTimeout(() => {
      const state = this.data.getState();
      if (state.seed) {
        console.log("Regenerating playlist due to slider changes");
        this.generate(state.seed);
      }
    }, 2000);
  }

  /**
   * Cancel any pending slider updates
   */
  cancelSliderUpdate() {
    if (this.sliderDebounce) {
      clearTimeout(this.sliderDebounce);
      this.sliderDebounce = null;
      this.uiBridge.hideSliderPending();
    }
  }
}

// Export the class
export default PlaylistGenerator;
