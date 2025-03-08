/**
 * LLMInterface.js
 * Manages LLM API calls with rate limiting, caching, and error handling
 */

import debugLogger from './DebugLogger.js';

class LLMInterface {
  /**
   * Initialize the LLM interface
   * @param {string} apiKey - API key for the LLM service
   */
  constructor(apiKey) {
    if (!apiKey || apiKey.trim() === '') {
      const error = new Error("No API key provided. A valid OpenAI API key is required.");
      debugLogger.logError(error);
      throw error;
    }
    
    this.apiKey = apiKey;
    this.cache = new Map();
    this.callCount = 0;
    this.lastCall = 0;
    this.rateLimitWindow = 60000; // 1 minute in milliseconds
    this.maxCallsPerMinute = 10;
    this.cacheTTL = 300000; // 5 minutes in milliseconds
  }

  /**
   * Make an API call to the LLM service
   * @param {Function} promptGenerator - Function that generates the prompt from context
   * @param {Object} context - Context data for the prompt
   * @returns {Promise<Object>} - Response from the LLM
   */
  async call(promptGenerator, context) {
    // Generate the prompt
    const prompt = promptGenerator(context);
    
    // Log the request
    debugLogger.logRequest(prompt, context);
    
    // Rate limiting check
    const now = Date.now();
    if (now - this.lastCall < this.rateLimitWindow) {
      this.callCount++;
      if (this.callCount > this.maxCallsPerMinute) {
        const error = new Error("Rate limit exceeded: maximum 10 calls per minute");
        debugLogger.logError(error);
        throw error;
      }
    } else {
      // Reset counter for a new window
      this.callCount = 1;
    }

    // Update last call timestamp
    this.lastCall = now;

    // Check cache
    const cacheKey = JSON.stringify({ prompt, context });
    if (this.cache.has(cacheKey)) {
      const { timestamp, data } = this.cache.get(cacheKey);
      if (now - timestamp < this.cacheTTL) {
        debugLogger.log("Cache hit for prompt", "info");
        return data;
      } else {
        // Cache expired
        this.cache.delete(cacheKey);
      }
    }

    try {
      // Make the API call
      debugLogger.log("Making API call to LLM service", "info");
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a music recommendation assistant. You provide detailed, accurate responses about music in JSON format."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`API call failed: ${response.status} - ${errorText}`);
        debugLogger.logError(error);
        throw error;
      }

      const data = await response.json();
      const rawContent = data.choices[0].message.content;
      
      try {
        // Try to parse the response as JSON
        let result;
        
        // First attempt: direct JSON parsing
        try {
          result = JSON.parse(rawContent);
          debugLogger.log("Successfully parsed response as JSON", "info");
        } catch (directParseError) {
          // Second attempt: Look for JSON array in the content
          debugLogger.log("Failed direct JSON parse, trying to extract JSON array", "warning");
          
          // Try to find a JSON array in the content
          const arrayMatch = rawContent.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (arrayMatch) {
            try {
              result = JSON.parse(arrayMatch[0]);
              debugLogger.log("Successfully extracted and parsed JSON array", "info");
            } catch (arrayParseError) {
              throw new Error("Failed to parse extracted JSON array");
            }
          } else {
            // Third attempt: Try to find a JSON object in the content
            const objectMatch = rawContent.match(/\{\s*"[\s\S]*"\s*:\s*[\s\S]*\}/);
            if (objectMatch) {
              try {
                result = JSON.parse(objectMatch[0]);
                debugLogger.log("Successfully extracted and parsed JSON object", "info");
              } catch (objectParseError) {
                throw new Error("Failed to parse extracted JSON object");
              }
            } else {
              // If all parsing attempts fail, create a simple object with the raw content
              debugLogger.log("All JSON parsing attempts failed, creating manual recommendations", "warning");
              
              // Try to extract song titles and artists from the raw content
              const songMatches = rawContent.match(/"([^"]+)"\s+by\s+([^,\n]+)/g) || [];
              if (songMatches.length > 0) {
                result = songMatches.map(match => {
                  const parts = match.match(/"([^"]+)"\s+by\s+([^,\n]+)/);
                  if (parts && parts.length >= 3) {
                    return {
                      title: parts[1].trim(),
                      artist: parts[2].trim(),
                      reason: "Extracted from API response"
                    };
                  }
                  return null;
                }).filter(item => item !== null);
                
                if (result.length > 0) {
                  debugLogger.log("Created recommendations by extracting song titles and artists", "info");
                } else {
                  throw new Error("Could not extract song information from response");
                }
              } else {
                throw new Error("Could not find any song information in response");
              }
            }
          }
        }
        
        // Cache the result
        this.cache.set(cacheKey, { timestamp: now, data: result });
        
        // Log the response
        debugLogger.logResponse(result);
        
        return result;
      } catch (parseError) {
        // If all parsing attempts fail, log the error and raw content
        debugLogger.log(`Failed to parse response: ${parseError.message}`, "error");
        debugLogger.log("Raw content from API:", "info");
        debugLogger.log(rawContent, "info");
        
        return { 
          error: "Failed to parse response as JSON", 
          rawContent: rawContent,
          parseError: parseError.message
        };
      }
    } catch (error) {
      debugLogger.logError(error);
      throw error;
    }
  }

  /**
   * Interpret a seed to extract music traits
   * @param {Object} seed - The seed object {type, value}
   * @returns {Promise<Object>} - Extracted traits
   */
  async interpretSeed(seed) {
    if (!seed || !seed.value?.trim()) {
      return { error: "Invalid or empty seed" };
    }

    return this.call(context => `
      You are a music expert. Given "${context.seed.value}", extract or infer these traits:
      - Primary genre(s)
      - Mood
      - Tempo
      - Lyrics theme
      - Instruments
      
      Return in JSON format only: 
      {
        "genre": ["genre1", "genre2"],
        "mood": "descriptive mood",
        "tempo": number between 0-100 (0=very slow, 100=very fast),
        "lyricsTheme": "theme description",
        "instruments": ["instrument1", "instrument2"]
      }
      
      Example: For "Wagon Wheel" → 
      {
        "genre": ["folk-country"],
        "mood": "nostalgic",
        "tempo": 65,
        "lyricsTheme": "travel and longing",
        "instruments": ["acoustic guitar", "fiddle", "banjo"]
      }
      
      If you cannot interpret the seed, return {"error": "reason"}.
    `, { seed });
  }

  /**
   * Suggest songs based on traits, sliders, and listening history
   * @param {Object} traits - Music traits
   * @param {Object} sliders - User preference sliders
   * @param {Array} last10 - Last 10 songs listened to
   * @returns {Promise<Array>} - Suggested songs
   */
  async suggestSongs(traits, sliders, last10) {
    return this.call(context => `
      You are a music curator. Suggest 5 unique song titles and artists based on:
      
      - Base traits: ${JSON.stringify(context.traits)}
      - Sliders: ${JSON.stringify(context.sliders)}
      - Last 10 songs: ${JSON.stringify(context.last10.map(s => s.song + ' by ' + s.artist))}
      
      Slider meanings:
      - genreVariety (0=focused on exact genres, 100=diverse genres)
      - artistFame (0=obscure artists, 100=popular artists)
      - themeFocus (0=loose theme adherence, 100=strict theme adherence)
      - seedArtistMix (0=different artists than seed, 100=similar artists to seed)
      
      Avoid repetition of songs or artists from the last 10 songs.
      Prioritize songs that are adjacent to the traits but still match the overall theme.
      
      Return in JSON format only, an array of objects:
      [
        {
          "song": "Song Title",
          "artist": "Artist Name",
          "reason": "Brief explanation of why this song matches"
        },
        ...
      ]
      
      Example: For traits with folk-country genre and travel theme, with genreVariety=75:
      [
        {
          "song": "On the Road Again",
          "artist": "Willie Nelson",
          "reason": "Classic country travel song with similar nostalgic feel"
        },
        ...
      ]
    `, { traits, sliders, last10 });
  }

  /**
   * Generate recommendations based on traits
   * @param {Object} traits - Music traits
   * @returns {Promise<Array>} - Recommended songs
   */
  async generateRecommendations(traits) {
    console.log("Generating recommendations with traits:", traits);
    
    // Get the current sliders from the data manager
    const sliders = window.engine ? window.engine.getPreferences().sliders : {
      genreVariety: 50,
      artistFame: 50,
      themeFocus: 50,
      seedArtistMix: 50
    };
    
    console.log("Using sliders for recommendations:", sliders);
    
    try {
      const result = await this.call(context => `
        You are a music curator. Suggest 5 unique song titles and artists based on these traits and user preferences:
        
        Traits: ${JSON.stringify(context.traits)}
        
        User Preferences (adjust recommendations accordingly):
        - Genre Variety: ${context.sliders.genreVariety}/100 (${context.sliders.genreVariety < 50 ? 'focused on exact genres' : 'explore diverse genres'})
        - Artist Fame: ${context.sliders.artistFame}/100 (${context.sliders.artistFame < 50 ? 'prefer obscure artists' : 'prefer popular artists'})
        - Theme Focus: ${context.sliders.themeFocus}/100 (${context.sliders.themeFocus < 50 ? 'loose theme adherence' : 'strict theme adherence'})
        - Seed Artist Mix: ${context.sliders.seedArtistMix}/100 (${context.sliders.seedArtistMix < 50 ? 'different artists than seed' : 'similar artists to seed'})
        
        Return in JSON format only, an array of objects:
        [
          {
            "title": "Song Title",
            "artist": "Artist Name",
            "reason": "Brief explanation of why this song matches the traits and preferences"
          },
          ...
        ]
        
        Example response:
        [
          {
            "title": "On the Road Again",
            "artist": "Willie Nelson",
            "reason": "Classic country travel song with similar nostalgic feel"
          },
          {
            "title": "Wagon Wheel",
            "artist": "Old Crow Medicine Show",
            "reason": "Folk-country song with themes of travel and longing"
          }
        ]
      `, { traits, sliders });
      
      console.log("Raw recommendation result:", result);
      
      // Check if we got a valid response
      if (result.error) {
        console.error("Error in recommendation response:", result.error);
        if (result.rawContent) {
          // Try to extract recommendations from raw content
          console.log("Attempting to extract recommendations from raw content:", result.rawContent);
          try {
            // Look for array pattern in the raw content
            const arrayMatch = result.rawContent.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (arrayMatch) {
              const extractedJson = arrayMatch[0];
              console.log("Extracted JSON:", extractedJson);
              const parsedRecommendations = JSON.parse(extractedJson);
              if (Array.isArray(parsedRecommendations) && parsedRecommendations.length > 0) {
                console.log("Successfully extracted recommendations:", parsedRecommendations);
                return this._normalizeRecommendations(parsedRecommendations);
              }
            }
          } catch (parseError) {
            console.error("Failed to extract recommendations from raw content:", parseError);
          }
        }
        return []; // Return empty array on error
      }
      
      // If result is not an array, check if it has a recommendations property
      if (!Array.isArray(result)) {
        console.log("Result is not an array, checking for recommendations property");
        if (result.recommendations && Array.isArray(result.recommendations)) {
          return this._normalizeRecommendations(result.recommendations);
        }
        
        // Try to find any array property that might contain recommendations
        for (const key in result) {
          if (Array.isArray(result[key]) && result[key].length > 0) {
            const firstItem = result[key][0];
            if ((firstItem.title || firstItem.song) && firstItem.artist) {
              console.log(`Found recommendations in property '${key}'`);
              return this._normalizeRecommendations(result[key]);
            }
          }
        }
        
        console.error("Could not find valid recommendations in result:", result);
        return []; // Return empty array if no valid recommendations found
      }
      
      // Validate that the array contains valid recommendation objects
      return this._normalizeRecommendations(result);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      return []; // Return empty array on error
    }
  }
  
  /**
   * Normalize recommendations to ensure they have the correct property names
   * @param {Array} recommendations - Array of recommendation objects
   * @returns {Array} - Normalized recommendations
   * @private
   */
  _normalizeRecommendations(recommendations) {
    if (!Array.isArray(recommendations) || recommendations.length === 0) {
      return [];
    }
    
    return recommendations.map(rec => {
      // Handle case where API returns 'song' instead of 'title'
      if (rec.song && !rec.title) {
        return {
          title: rec.song,
          artist: rec.artist,
          reason: rec.reason || 'Matches your music preferences'
        };
      }
      
      // Make sure all required fields are present
      return {
        title: rec.title || 'Unknown Song',
        artist: rec.artist || 'Unknown Artist',
        reason: rec.reason || 'Matches your music preferences'
      };
    });
  }

  /**
   * Update traits based on user feedback
   * @param {Object} traits - Current music traits
   * @param {Array} feedback - User feedback
   * @returns {Promise<Object>} - Updated traits
   */
  async updateTraits(traits, feedback) {
    return this.call(context => `
      You are a music analyst. Update these musical traits based on user feedback:
      
      - Current traits: ${JSON.stringify(context.traits)}
      - Feedback: ${JSON.stringify(context.feedback)}
      
      Feedback format is an array of objects with trait and value (+/-).
      Adjust numeric traits (mood, tempo, lyricsTheme) by approximately:
      - +10 for positive feedback (+)
      - -10 for negative feedback (-)
      
      Cap all numeric values between 0-100.
      For non-numeric traits, adjust by adding or removing elements.
      
      Return in JSON format only:
      {
        "genre": ["updated genres"],
        "mood": "updated mood",
        "tempo": updated number,
        "lyricsTheme": "updated theme",
        "instruments": ["updated instruments"]
      }
      
      Example: For traits with tempo=50 and feedback [{trait: "speed", value: "+"}]:
      {
        "genre": ["folk-country"],
        "mood": "nostalgic",
        "tempo": 60,
        "lyricsTheme": "travel and longing",
        "instruments": ["acoustic guitar", "fiddle"]
      }
    `, { traits, feedback });
  }
}

// Export the class
export default LLMInterface;
