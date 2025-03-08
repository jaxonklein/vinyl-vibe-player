// User Interaction Module
const express = require('express');
const router = express.Router();
const { authenticate } = require('./auth');
const llmService = require('./llm');
const db = require('./db');

// Middleware to authenticate requests
router.use(authenticate);

// POST endpoint to handle user interactions (thumbs up, thumbs down, skip)
router.post('/', async (req, res, next) => {
    try {
        const { action, trackId } = req.body;
        
        if (!action || !trackId) {
            return res.status(400).json({ 
                error: 'Action and trackId are required' 
            });
        }
        
        // Validate action type
        const validActions = ['play', 'pause', 'thumbsUp', 'thumbsDown', 'skip'];
        if (!validActions.includes(action)) {
            return res.status(400).json({ 
                error: `Invalid action. Must be one of: ${validActions.join(', ')}` 
            });
        }
        
        // Get user ID (in a real app, this would come from the token)
        const userId = req.token.substring(0, 10); // Mock user ID for demo
        
        // Record the interaction in the database
        await db.saveInteraction(userId, {
            trackId,
            action,
            timestamp: new Date().toISOString()
        });
        
        // Handle different actions
        switch (action) {
            case 'play':
            case 'pause':
                // For play/pause, we just record the action but don't update the playlist
                return res.json({ 
                    message: `Track ${action === 'play' ? 'playing' : 'paused'}` 
                });
                
            case 'thumbsUp':
                // For thumbs up, we update the playlist to include more similar tracks
                const currentPlaylist = await db.getCurrentPlaylist(userId);
                const updatedPlaylist = await llmService.updatePlaylistAfterThumbsUp(
                    currentPlaylist, 
                    trackId, 
                    userId
                );
                
                // Save the updated playlist
                await db.updatePlaylist(userId, updatedPlaylist);
                
                return res.json({
                    message: 'Thumbs up recorded and playlist updated',
                    updatedPlaylist
                });
                
            case 'thumbsDown':
                // For thumbs down, we update the playlist to remove similar tracks
                const playlist = await db.getCurrentPlaylist(userId);
                const newPlaylist = await llmService.updatePlaylistAfterThumbsDown(
                    playlist, 
                    trackId, 
                    userId
                );
                
                // Save the updated playlist
                await db.updatePlaylist(userId, newPlaylist);
                
                return res.json({
                    message: 'Thumbs down recorded and playlist updated',
                    updatedPlaylist: newPlaylist
                });
                
            case 'skip':
                // For skip, we just record the action but don't update the playlist
                // In a more advanced implementation, we might use skip data to influence future playlists
                return res.json({ 
                    message: 'Skip recorded' 
                });
                
            default:
                return res.status(400).json({ 
                    error: 'Invalid action' 
                });
        }
        
    } catch (error) {
        console.error('Error handling interaction:', error);
        next(error);
    }
});

// GET endpoint to retrieve a user's interaction history
router.get('/history', async (req, res, next) => {
    try {
        // Get user ID (in a real app, this would come from the token)
        const userId = req.token.substring(0, 10); // Mock user ID for demo
        
        // Get user's interaction history
        const interactions = await db.getInteractionHistory(userId);
        
        res.json({
            interactions
        });
        
    } catch (error) {
        console.error('Error retrieving interaction history:', error);
        next(error);
    }
});

module.exports = router;
