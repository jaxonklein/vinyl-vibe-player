/**
 * config.js
 * Configuration settings for the recommendation engine
 */

// Default configuration
const config = {
  // Default API key (replace with your actual key)
  apiKey: '',
  
  // Debug mode
  debug: true,
  
  // Default cooldown settings (in seconds)
  cooldowns: {
    rabbit: 86400,   // 1 day
    default: 172800, // 2 days
    turtle: 259200   // 3 days
  },
  
  // Default slider values
  defaultSliders: {
    genreVariety: 50,
    artistFame: 50,
    themeFocus: 50,
    seedArtistMix: 50
  }
};

export default config;
