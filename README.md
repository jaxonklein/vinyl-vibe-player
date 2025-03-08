# Spotify AI Music Player

A web application that uses AI to generate personalized playlists and play them through Spotify's Web Playback SDK.

## Features

- OAuth authentication with Spotify
- AI-powered playlist generation based on text descriptions
- Web-based music playback using Spotify Web Playback SDK
- Interactive UI with player controls
- Feedback mechanism for refining music recommendations
- Vinyl Vibe carousel player with retro vinyl-inspired design

## Components

### Main Music Player
- Spotify integration
- Text-based playlist generation
- Basic playback controls

### Vinyl Vibe Carousel Player
- Horizontal carousel of song cards
- Explorer sliders for fine-tuning recommendations
- Detailed feedback system with trait-specific controls
- Retro vinyl-inspired UI with animations
- Add seed functionality for new music discovery

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **Authentication**: Spotify OAuth
- **Music Playback**: Spotify Web Playback SDK
- **AI Integration**: OpenAI API

## Prerequisites

- Node.js and npm
- Spotify Developer Account
- Spotify Premium Account (required for Web Playback SDK)
- OpenAI API Key

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   REDIRECT_URI=http://localhost:3000
   OPENAI_API_KEY=your_openai_api_key
   PORT=3000
   ```
4. Start the server:
   ```
   npm start
   ```
5. Open http://localhost:3000 in your browser

## Usage

### Main Player
1. Log in with your Spotify account
2. Enter a description for the kind of playlist you want
3. Use the player controls to interact with your generated playlist

### Vinyl Vibe Player
1. Navigate to the Vinyl Vibe Player using the link on the main page
2. Browse through the carousel of song cards
3. Provide feedback using thumbs up/down and trait-specific buttons
4. Adjust the explorer sliders to fine-tune recommendations
5. Add new seeds to discover more music
6. Use the playback controls to play, pause, and navigate between songs

## License

MIT
