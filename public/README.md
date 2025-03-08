# Vinyl Vibe Music Player with Recommendation Engine

This is a music player with an LLM-powered recommendation engine that provides real-time song selection without fallback songs.

## How to Use

1. Open the Vinyl Vibe player by clicking on the "Try Vinyl Vibe Player" button from the main app.
2. Click the "+" button to add a seed (artist, song, genre, or mood).
3. Enter your seed text (e.g., "Happy indie folk music") and optionally your LLM API key.
4. The recommendation engine will generate a playlist based on your seed.
5. Use the feedback buttons to refine your recommendations:
   - 👍/👎 for general feedback
   - Trait buttons (Lyrics, Genre, Speed, Topic, Time) with + or - to provide specific feedback
6. Adjust the sliders to customize your recommendations:
   - Genre Variety: Controls how diverse the genres are (0=focused, 100=diverse)
   - Artist Fame: Controls artist popularity (0=obscure, 100=popular)
   - Theme Focus: Controls theme adherence (0=loose, 100=strict)
   - Seed Artist Mix: Controls similarity to seed artists (0=different, 100=similar)

## API Key

The recommendation engine requires an LLM API key to generate recommendations. You can enter your API key when adding a seed, and it will be saved for future use.

If no API key is provided, the engine will use mock data for demonstration purposes.

## Features

- Real-time song selection using LLM
- Automatic playlist regeneration after trait updates
- Enhanced error logging
- Cooldown management with customizable options
- User preference sliders
- Feedback processing to refine recommendations
- Persistent storage of user preferences

## Technical Details

The recommendation engine is built with a modular architecture consisting of the following components:

1. **RecommendationEngine**: Main entry point that coordinates all components
2. **LLMInterface**: Manages LLM API calls with rate limiting, caching, and error handling
3. **DataManager**: Manages application state, user preferences, and bounded history
4. **PlaylistGenerator**: Generates playlists based on seed, traits, and user preferences
5. **FeedbackProcessor**: Processes user feedback and updates traits with debouncing
6. **CooldownManager**: Manages song cooldowns and play tracking
7. **UIBridge**: Connects the recommendation engine to the UI elements

For more details, see the [engine README](js/engine/README.md).
