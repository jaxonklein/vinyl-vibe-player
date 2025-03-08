// LLM Integration Module for AI-Powered Playlist Generation
const { OpenAI } = require('openai');
const db = require('./db');

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Mock Spotify track data for demo purposes with real Spotify track IDs
const mockSpotifyTracks = [
    { id: '4cOdK2wGLETKBW3PvgPWqT', name: 'Take On Me', artist: 'a-ha', albumCover: null },
    { id: '4RvWPyQ5RL0ao9LPZeSouE', name: 'Everybody Wants to Rule the World', artist: 'Tears for Fears', albumCover: null },
    { id: '1TfqLAPs4K3s2rJMoCoD76', name: 'Sweet Dreams (Are Made of This)', artist: 'Eurythmics', albumCover: null },
    { id: '5ChkMS8OtdzJeqyybCc9R5', name: 'Billie Jean', artist: 'Michael Jackson', albumCover: null },
    { id: '4y1LsJpmMti1PfRQV9AWWe', name: 'Girls Just Want to Have Fun', artist: 'Cyndi Lauper', albumCover: null },
    { id: '0ikz6tENMONtK6qGkOrU3c', name: 'Wake Me Up Before You Go-Go', artist: 'Wham!', albumCover: null },
    { id: '2tUBqZG2AbRi7Q0BIrVrEj', name: 'I Wanna Dance with Somebody', artist: 'Whitney Houston', albumCover: null },
    { id: '1z4g3DjTBBQTNHtEKjAEJi', name: 'Like a Prayer', artist: 'Madonna', albumCover: null },
    { id: '2nGFzvICaeEWCIYB640Ny3', name: 'Karma Chameleon', artist: 'Culture Club', albumCover: null },
    { id: '4uLU6hMCjMI75M1A2tKUQC', name: 'Never Gonna Give You Up', artist: 'Rick Astley', albumCover: null },
    { id: '6epn3r7S14KUqlReYr77hA', name: 'Blue Monday', artist: 'New Order', albumCover: null },
    { id: '0A4vzXkXANMNq6Xm03AoAW', name: 'Don\'t You (Forget About Me)', artist: 'Simple Minds', albumCover: null },
    { id: '4BxCdvhCYEBKJHy4zqNkfA', name: 'Tainted Love', artist: 'Soft Cell', albumCover: null },
    { id: '1bVxZA8UmTjj7zBNKKMbVU', name: 'Just Like Heaven', artist: 'The Cure', albumCover: null },
    { id: '1AEYT6VxrxKNBnfRJ01Wvq', name: 'Love Will Tear Us Apart', artist: 'Joy Division', albumCover: null },
    { id: '1FvDJ9KGxcqwv1utyPL3JZ', name: 'This Charming Man', artist: 'The Smiths', albumCover: null },
    { id: '4bl1HBZliBBWoVkK9notJr', name: 'Once in a Lifetime', artist: 'Talking Heads', albumCover: null },
    { id: '5yWVwZHYY8110hfWVd9VQh', name: 'Bizarre Love Triangle', artist: 'New Order', albumCover: null },
    { id: '0UrWr7Jnu1heq7ErNYVJ5i', name: 'I Melt With You', artist: 'Modern English', albumCover: null },
    { id: '2374M0fQpWi3dLnB54qaLX', name: 'Africa', artist: 'Toto', albumCover: null },
    { id: '3dd5Wr3oWAGTWdWcGJGcP1', name: 'Video Killed the Radio Star', artist: 'The Buggles', albumCover: null },
    { id: '2wv3Qx78ZNhx7Y1Z0lv8RF', name: 'Hungry Like the Wolf', artist: 'Duran Duran', albumCover: null },
    { id: '4bHsxqR3GMrXTxEPLuK5ue', name: 'Don\'t Stop Believin\'', artist: 'Journey', albumCover: null },
    { id: '0WqIKmW4BTrj3eJFmnCKMv', name: 'Every Breath You Take', artist: 'The Police', albumCover: null },
    { id: 'Livin\' on a Prayer', artist: 'Bon Jovi', albumCover: null },
    { id: 'Sweet Child o\' Mine', artist: 'Guns N\' Roses', albumCover: null },
    { id: 'Smells Like Teen Spirit', artist: 'Nirvana', albumCover: null },
    { id: 'Wonderwall', artist: 'Oasis', albumCover: null },
    { id: 'Bitter Sweet Symphony', artist: 'The Verve', albumCover: null },
    { id: 'Creep', artist: 'Radiohead', albumCover: null }
];

// Generate a playlist based on a text description
async function generatePlaylist(description, userId) {
    try {
        console.log(`Generating playlist for description: "${description}"`);
        
        // In a real app, we would call the OpenAI API here
        // For this demo, we'll use a mock implementation
        
        if (process.env.OPENAI_API_KEY) {
            // If API key is available, use OpenAI
            return await generatePlaylistWithOpenAI(description, userId);
        } else {
            // Otherwise, use mock implementation
            return await mockGeneratePlaylist(description, userId);
        }
    } catch (error) {
        console.error('Error generating playlist with LLM:', error);
        throw new Error('Failed to generate playlist: ' + error.message);
    }
}

// Generate a playlist using OpenAI
async function generatePlaylistWithOpenAI(description, userId) {
    try {
        // Get user's interaction history
        const userHistory = await db.getInteractionHistory(userId);
        
        // Prepare the prompt for OpenAI
        const prompt = `
            You are an AI DJ that creates personalized playlists. 
            
            User description: "${description}"
            
            ${userHistory.length > 0 ? `User's previous interactions: ${JSON.stringify(userHistory)}` : 'No previous interactions available.'}
            
            Create a playlist of 10 songs that match this description. 
            The playlist should be diverse but cohesive, with no repetition of artists.
            
            Return ONLY a JSON array of objects with the following structure:
            [
                {
                    "id": "unique_id",
                    "name": "Song Name",
                    "artist": "Artist Name"
                }
            ]
        `;
        
        // Call OpenAI API
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a music expert DJ that creates personalized playlists." },
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 1000
        });
        
        // Parse the response
        const content = response.choices[0].message.content;
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        
        if (!jsonMatch) {
            throw new Error('Invalid response format from OpenAI');
        }
        
        const playlistData = JSON.parse(jsonMatch[0]);
        
        // Add album covers (in a real app, we would get these from Spotify)
        return playlistData.map(track => ({
            ...track,
            albumCover: null
        }));
        
    } catch (error) {
        console.error('Error generating playlist with OpenAI:', error);
        // Fall back to mock implementation
        return await mockGeneratePlaylist(description, userId);
    }
}

// Mock implementation for generating a playlist
async function mockGeneratePlaylist(description, userId) {
    console.log('Using mock playlist generator');
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Select random tracks from the mock data based on the description
    const numTracks = 10;
    const selectedTracks = [];
    const selectedArtists = new Set();
    
    // Simple keyword matching for demo purposes
    const keywords = description.toLowerCase().split(/\s+/);
    const decades = {
        '80s': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
        '90s': [25, 26, 27, 28, 29]
    };
    
    // Filter tracks based on keywords
    let filteredTracks = [...mockSpotifyTracks];
    
    // Check for decade keywords
    for (const [decade, indices] of Object.entries(decades)) {
        if (keywords.some(k => k.includes(decade.toLowerCase()))) {
            filteredTracks = indices.map(i => mockSpotifyTracks[i]);
            break;
        }
    }
    
    // Shuffle the filtered tracks
    filteredTracks.sort(() => Math.random() - 0.5);
    
    // Select tracks ensuring artist diversity
    for (const track of filteredTracks) {
        if (selectedTracks.length >= numTracks) break;
        
        if (!selectedArtists.has(track.artist)) {
            selectedTracks.push(track);
            selectedArtists.add(track.artist);
        }
    }
    
    // If we don't have enough tracks, add more until we reach the desired number
    while (selectedTracks.length < numTracks && filteredTracks.length > selectedTracks.length) {
        const remainingTracks = filteredTracks.filter(track => !selectedTracks.includes(track));
        if (remainingTracks.length === 0) break;
        
        const randomTrack = remainingTracks[Math.floor(Math.random() * remainingTracks.length)];
        selectedTracks.push(randomTrack);
    }
    
    return selectedTracks;
}

// Update playlist after a thumbs up interaction
async function updatePlaylistAfterThumbsUp(currentPlaylist, likedTrackId, userId) {
    try {
        console.log(`Updating playlist after thumbs up for track ${likedTrackId}`);
        
        // In a real app, we would call the OpenAI API here
        // For this demo, we'll use a mock implementation
        
        if (process.env.OPENAI_API_KEY) {
            // If API key is available, use OpenAI
            return await updatePlaylistWithOpenAI(currentPlaylist, likedTrackId, 'thumbsUp', userId);
        } else {
            // Otherwise, use mock implementation
            return await mockUpdatePlaylist(currentPlaylist, likedTrackId, 'thumbsUp');
        }
    } catch (error) {
        console.error('Error updating playlist after thumbs up:', error);
        // Return the original playlist if there's an error
        return currentPlaylist;
    }
}

// Update playlist after a thumbs down interaction
async function updatePlaylistAfterThumbsDown(currentPlaylist, dislikedTrackId, userId) {
    try {
        console.log(`Updating playlist after thumbs down for track ${dislikedTrackId}`);
        
        // In a real app, we would call the OpenAI API here
        // For this demo, we'll use a mock implementation
        
        if (process.env.OPENAI_API_KEY) {
            // If API key is available, use OpenAI
            return await updatePlaylistWithOpenAI(currentPlaylist, dislikedTrackId, 'thumbsDown', userId);
        } else {
            // Otherwise, use mock implementation
            return await mockUpdatePlaylist(currentPlaylist, dislikedTrackId, 'thumbsDown');
        }
    } catch (error) {
        console.error('Error updating playlist after thumbs down:', error);
        // Return the original playlist if there's an error
        return currentPlaylist;
    }
}

// Update playlist using OpenAI
async function updatePlaylistWithOpenAI(currentPlaylist, trackId, action, userId) {
    try {
        // Get user's interaction history
        const userHistory = await db.getInteractionHistory(userId);
        
        // Find the track that was interacted with
        const interactedTrack = currentPlaylist.find(track => track.id === trackId);
        
        if (!interactedTrack) {
            throw new Error(`Track with ID ${trackId} not found in current playlist`);
        }
        
        // Prepare the prompt for OpenAI
        const prompt = `
            You are an AI DJ that updates playlists based on user feedback.
            
            Current playlist: ${JSON.stringify(currentPlaylist)}
            
            User ${action === 'thumbsUp' ? 'liked' : 'disliked'} the track: ${JSON.stringify(interactedTrack)}
            
            ${userHistory.length > 0 ? `User's previous interactions: ${JSON.stringify(userHistory)}` : 'No previous interactions available.'}
            
            ${action === 'thumbsUp' 
                ? 'Update the playlist to include more songs similar to the liked track, while maintaining diversity.' 
                : 'Update the playlist to remove the disliked track and any similar tracks, replacing them with alternatives.'}
            
            Return ONLY a JSON array of objects with the following structure:
            [
                {
                    "id": "unique_id",
                    "name": "Song Name",
                    "artist": "Artist Name"
                }
            ]
            
            The playlist should have exactly 10 tracks.
        `;
        
        // Call OpenAI API
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a music expert DJ that updates playlists based on user feedback." },
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 1000
        });
        
        // Parse the response
        const content = response.choices[0].message.content;
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        
        if (!jsonMatch) {
            throw new Error('Invalid response format from OpenAI');
        }
        
        const updatedPlaylistData = JSON.parse(jsonMatch[0]);
        
        // Add album covers (in a real app, we would get these from Spotify)
        return updatedPlaylistData.map(track => ({
            ...track,
            albumCover: null
        }));
        
    } catch (error) {
        console.error('Error updating playlist with OpenAI:', error);
        // Fall back to mock implementation
        return await mockUpdatePlaylist(currentPlaylist, trackId, action);
    }
}

// Mock implementation for updating a playlist
async function mockUpdatePlaylist(currentPlaylist, trackId, action) {
    console.log(`Using mock playlist updater for ${action}`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Find the track that was interacted with
    const trackIndex = currentPlaylist.findIndex(track => track.id === trackId);
    
    if (trackIndex === -1) {
        console.warn(`Track with ID ${trackId} not found in current playlist`);
        return currentPlaylist;
    }
    
    const interactedTrack = currentPlaylist[trackIndex];
    
    // Create a copy of the current playlist
    const updatedPlaylist = [...currentPlaylist];
    
    if (action === 'thumbsUp') {
        // For thumbs up, we'll add more tracks from the same era/genre
        // For demo purposes, we'll just add random tracks from our mock data
        
        // Remove some tracks to make room for new ones (but keep the liked track)
        const numTracksToReplace = 3;
        const tracksToKeep = [interactedTrack];
        
        // Keep some existing tracks (including the liked one)
        for (let i = 0; i < currentPlaylist.length - numTracksToReplace; i++) {
            const track = currentPlaylist[i];
            if (track.id !== trackId && tracksToKeep.length < currentPlaylist.length - numTracksToReplace) {
                tracksToKeep.push(track);
            }
        }
        
        // Add new tracks
        const availableTracks = mockSpotifyTracks.filter(track => 
            !tracksToKeep.some(t => t.id === track.id)
        );
        
        // Shuffle available tracks
        availableTracks.sort(() => Math.random() - 0.5);
        
        // Create the updated playlist
        updatedPlaylist.length = 0;
        updatedPlaylist.push(...tracksToKeep);
        
        // Add new tracks until we reach the original length
        for (const track of availableTracks) {
            if (updatedPlaylist.length >= currentPlaylist.length) break;
            updatedPlaylist.push(track);
        }
        
    } else if (action === 'thumbsDown') {
        // For thumbs down, we'll remove the disliked track and similar ones
        
        // Remove the disliked track
        updatedPlaylist.splice(trackIndex, 1);
        
        // Remove similar tracks (for demo purposes, we'll just remove tracks by the same artist)
        const artistToRemove = interactedTrack.artist;
        for (let i = updatedPlaylist.length - 1; i >= 0; i--) {
            if (updatedPlaylist[i].artist === artistToRemove) {
                updatedPlaylist.splice(i, 1);
            }
        }
        
        // Add new tracks to maintain the playlist length
        const availableTracks = mockSpotifyTracks.filter(track => 
            track.artist !== artistToRemove && 
            !updatedPlaylist.some(t => t.id === track.id)
        );
        
        // Shuffle available tracks
        availableTracks.sort(() => Math.random() - 0.5);
        
        // Add new tracks until we reach the original length
        for (const track of availableTracks) {
            if (updatedPlaylist.length >= currentPlaylist.length) break;
            updatedPlaylist.push(track);
        }
    }
    
    // Shuffle the playlist for variety
    updatedPlaylist.sort(() => Math.random() - 0.5);
    
    return updatedPlaylist;
}

module.exports = {
    generatePlaylist,
    updatePlaylistAfterThumbsUp,
    updatePlaylistAfterThumbsDown
};
