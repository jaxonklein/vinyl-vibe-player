/**
 * index.js
 * Exports all recommendation engine components
 */

import RecommendationEngine from './RecommendationEngine.js';
import DataManager from './DataManager.js';
import LLMInterface from './LLMInterface.js';
import PlaylistGenerator from './PlaylistGenerator.js';
import FeedbackProcessor from './FeedbackProcessor.js';
import CooldownManager from './CooldownManager.js';
import UIBridge from './UIBridge.js';

// Export all components
export {
  RecommendationEngine,
  DataManager,
  LLMInterface,
  PlaylistGenerator,
  FeedbackProcessor,
  CooldownManager,
  UIBridge
};

// Export default RecommendationEngine
export default RecommendationEngine;
