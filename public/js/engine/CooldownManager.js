/**
 * CooldownManager.js
 * Manages song cooldowns and play tracking
 */

class CooldownManager {
  /**
   * Initialize the cooldown manager
   * @param {Object} dataManager - Data manager instance
   * @param {Object} playlistGenerator - Playlist generator instance
   * @param {Object} uiBridge - UI bridge instance
   */
  constructor(dataManager, playlistGenerator, uiBridge) {
    this.data = dataManager;
    this.playlistGen = playlistGenerator;
    this.uiBridge = uiBridge;
    
    // Cooldown types and durations (in seconds)
    this.cooldownTypes = {
      rabbit: {
        icon: '🐇',
        duration: 86400,    // 1 day
        name: 'Short'
      },
      default: {
        icon: '⏳',
        duration: 172800,   // 2 days
        name: 'Medium'
      },
      turtle: {
        icon: '🐢',
        duration: 259200,   // 3 days
        name: 'Long'
      }
    };
  }

  /**
   * Set cooldown for a specific song
   * @param {string} songId - Song identifier
   * @param {string} type - Cooldown type (rabbit, default, turtle)
   */
  setCooldown(songId, type) {
    if (!this.cooldownTypes[type]) {
      console.error(`Invalid cooldown type: ${type}`);
      return;
    }
    
    const cooldownInfo = this.cooldownTypes[type];
    
    // Create cooldown object
    const cooldown = {
      type,
      lastPlayed: Date.now(),
      duration: cooldownInfo.duration,
      plays: 0
    };
    
    // Get existing cooldown to preserve play count if it exists
    const existingCooldown = this.data.preferences.cooldowns.get(songId);
    if (existingCooldown) {
      cooldown.plays = existingCooldown.plays || 0;
    }
    
    // Save to data manager
    this.data.preferences.cooldowns.set(songId, cooldown);
    this.data.saveToStorage();
    
    console.log(`Set ${cooldownInfo.name} cooldown (${cooldownInfo.duration}s) for ${songId}`);
    
    // Update UI to reflect the change
    this.uiBridge.updateCooldownDisplay(songId, type, cooldownInfo.icon);
  }

  /**
   * Cycle to the next cooldown type for a song
   * @param {string} songId - Song identifier
   */
  cycleCooldown(songId) {
    // Get current cooldown
    const currentCooldown = this.data.preferences.cooldowns.get(songId);
    let currentType = currentCooldown?.type || 'default';
    
    // Determine next type in cycle
    let nextType;
    switch (currentType) {
      case 'rabbit':
        nextType = 'default';
        break;
      case 'default':
        nextType = 'turtle';
        break;
      case 'turtle':
        nextType = 'rabbit';
        break;
      default:
        nextType = 'default';
    }
    
    // Set the new cooldown
    this.setCooldown(songId, nextType);
    return nextType;
  }

  /**
   * Check if a song is on cooldown
   * @param {string} songId - Song identifier
   * @returns {boolean} - True if song is not on cooldown
   */
  check(songId) {
    return this.playlistGen.checkCooldown(songId);
  }

  /**
   * Get cooldown information for a song
   * @param {string} songId - Song identifier
   * @returns {Object} - Cooldown information
   */
  getCooldownInfo(songId) {
    const cooldown = this.data.preferences.cooldowns.get(songId);
    
    if (!cooldown) {
      return {
        type: 'default',
        icon: this.cooldownTypes.default.icon,
        active: false,
        remainingTime: 0
      };
    }
    
    const now = Date.now();
    const lastPlayed = cooldown.lastPlayed || 0;
    const duration = cooldown.duration * 1000; // Convert to milliseconds
    const elapsed = now - lastPlayed;
    const remaining = Math.max(0, duration - elapsed);
    const active = remaining > 0;
    
    return {
      type: cooldown.type || 'default',
      icon: this.cooldownTypes[cooldown.type || 'default'].icon,
      active,
      remainingTime: remaining,
      formattedTime: this.formatRemainingTime(remaining)
    };
  }

  /**
   * Format remaining cooldown time
   * @param {number} milliseconds - Remaining time in milliseconds
   * @returns {string} - Formatted time string
   */
  formatRemainingTime(milliseconds) {
    if (milliseconds <= 0) {
      return 'Available';
    }
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get all cooldown types
   * @returns {Object} - Cooldown types
   */
  getCooldownTypes() {
    return this.cooldownTypes;
  }
}

// Export the class
export default CooldownManager;
