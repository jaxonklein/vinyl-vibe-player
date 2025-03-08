/**
 * example.js
 * Example usage of the recommendation engine
 */

import RecommendationEngine from './RecommendationEngine.js';

// Initialize the engine with configuration
const engine = new RecommendationEngine({
  apiKey: 'YOUR_API_KEY', // Replace with your actual API key
  debug: true // Enable debug mode for verbose logging
});

// Example of generating a playlist from a seed
document.getElementById('generate-btn').addEventListener('click', () => {
  const seedInput = document.getElementById('seed-input');
  if (seedInput && seedInput.value.trim()) {
    engine.generateFromSeed({
      type: 'text',
      value: seedInput.value.trim()
    });
  }
});

// Example of playing a song
document.getElementById('play-btn').addEventListener('click', () => {
  const songIndex = 0; // Play the first song in the playlist
  const song = engine.playSong(songIndex);
  
  if (song) {
    console.log(`Now playing: ${song.song} by ${song.artist}`);
    // Here you would trigger your actual audio player
  }
});

// Example of accessing the current state
document.getElementById('state-btn').addEventListener('click', () => {
  const state = engine.getState();
  console.log('Current engine state:', state);
});

// Example of manually setting a cooldown
document.getElementById('cooldown-btn').addEventListener('click', () => {
  const songId = 'Example_Song_Artist';
  engine.cooldownManager.setCooldown(songId, 'turtle'); // Set a long cooldown
});

// Example of updating a slider
document.getElementById('slider-example').addEventListener('input', (event) => {
  const name = event.target.name;
  const value = parseInt(event.target.value);
  engine.handleSliderChange(name, value);
});

// Example of providing feedback
document.getElementById('feedback-btn').addEventListener('click', () => {
  const songId = 'Example_Song_Artist';
  const trait = 'genre';
  const value = '+'; // Positive feedback
  engine.handleFeedback(songId, trait, value);
});

// Example of initializing with a default seed
window.addEventListener('DOMContentLoaded', () => {
  // Initialize with a default seed after a short delay
  setTimeout(() => {
    engine.generateFromSeed({
      type: 'text',
      value: 'Happy indie folk music'
    });
  }, 1000);
});
