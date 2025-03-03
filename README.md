# Spotify AI Music Player

A web application that uses AI to generate personalized playlists and play them through Spotify's Web Playback SDK.

## Features

- OAuth authentication with Spotify
- AI-powered playlist generation based on text descriptions
- Web-based music playback using Spotify Web Playback SDK
- Interactive UI with player controls
- Feedback mechanism for refining music recommendations

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
   node server/app.js
   ```
5. Open http://localhost:3000 in your browser

## Usage

1. Log in with your Spotify account
2. Enter a description for the playlist you want to generate
3. Click "Generate Playlist" to create a personalized playlist
4. Use the player controls to play, pause, and skip tracks
5. Provide feedback with thumbs up/down to improve recommendations

## License

MIT
