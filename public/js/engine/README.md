# Vinyl Vibe Recommendation Engine

A modular JavaScript recommendation engine for the Vinyl Vibe music player that uses LLM for real-time song selection without fallback songs.

## Architecture

The recommendation engine is built with a modular architecture consisting of the following components:

1. **RecommendationEngine**: Main entry point that coordinates all components
2. **LLMInterface**: Manages LLM API calls with rate limiting, caching, and error handling
3. **DataManager**: Manages application state, user preferences, and bounded history
4. **PlaylistGenerator**: Generates playlists based on seed, traits, and user preferences
5. **FeedbackProcessor**: Processes user feedback and updates traits with debouncing
6. **CooldownManager**: Manages song cooldowns and play tracking
7. **UIBridge**: Connects the recommendation engine to the UI elements

## Key Features

- **Real-time Song Selection**: Uses LLM to select songs in real-time without fallback songs
- **Automatic Playlist Regeneration**: Regenerates playlist after trait updates
- **Enhanced Error Logging**: Comprehensive error handling and logging
- **Cooldown Management**: Default 2-day cooldown with customizable options
- **User Preference Sliders**: Adjustable sliders for genre variety, artist fame, theme focus, and seed artist mix
- **Feedback Processing**: Process user feedback to refine recommendations
- **Persistent Storage**: Saves user preferences to localStorage

## Usage

```javascript
import RecommendationEngine from './engine/RecommendationEngine.js';

// Initialize the engine
const engine = new RecommendationEngine({
  apiKey: 'YOUR_API_KEY',
  debug: true
});

// Generate a playlist from a seed
engine.generateFromSeed({
  type: 'text',
  value: 'Happy indie folk music'
});

// Play a song
const song = engine.playSong(0);

// Get current state
const state = engine.getState();

// Update a slider
engine.handleSliderChange('genreVariety', 75);

// Provide feedback
engine.handleFeedback('Song_Name_Artist_Name', 'genre', '+');
```

## Component Details

### LLMInterface

Manages communication with the LLM API, handling rate limiting, caching, and error handling. Provides methods for interpreting seeds, suggesting songs, and updating traits.

### DataManager

Manages application state and user preferences, including sliders, cooldowns, and play history. Handles persistence to localStorage.

### PlaylistGenerator

Generates playlists based on seed, traits, and user preferences. Handles debouncing of slider changes and processes raw LLM suggestions.

### FeedbackProcessor

Processes user feedback and updates traits with debouncing. Automatically regenerates playlist after trait updates.

### CooldownManager

Manages song cooldowns and play tracking. Provides different cooldown types (short, medium, long) and formats remaining time.

### UIBridge

Connects the recommendation engine to the UI elements. Handles updating the carousel, displaying errors, and showing loading indicators.

## Integration

To integrate the recommendation engine into your application:

1. Import the RecommendationEngine class
2. Create an instance with your API key
3. Bind UI elements to the engine methods
4. Call generateFromSeed with a seed to start generating recommendations

See `example.js` for a complete usage example.
