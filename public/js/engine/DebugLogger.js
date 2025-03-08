/**
 * DebugLogger.js
 * Utility for logging debug information to the UI
 */

class DebugLogger {
  constructor() {
    this.enabled = false;
    this.outputElement = null;
    this.toggleButton = null;
    this.clearButton = null;
    this.debugPane = null;
    this.buffer = [];
    this.maxBufferSize = 1000;
  }

  /**
   * Initialize the debug logger
   */
  init() {
    // Try to find the debug pane elements
    this.outputElement = document.getElementById('debug-output');
    this.toggleButton = document.getElementById('toggle-debug');
    this.clearButton = document.getElementById('clear-debug');
    this.debugPane = document.querySelector('.debug-pane');

    // If debug pane doesn't exist in the DOM, create it
    if (!this.debugPane) {
      this.createDebugPane();
    }

    // Bind event handlers
    if (this.toggleButton) {
      this.toggleButton.addEventListener('click', () => this.toggle());
    }
    
    if (this.clearButton) {
      this.clearButton.addEventListener('click', () => this.clear());
    }

    // Check for debug mode in localStorage
    const debugEnabled = localStorage.getItem('vinylVibeDebugEnabled');
    if (debugEnabled === 'true') {
      this.enable();
    }

    console.log('Debug logger initialized');
  }

  /**
   * Create the debug pane if it doesn't exist
   */
  createDebugPane() {
    // Create debug pane
    this.debugPane = document.createElement('div');
    this.debugPane.className = 'debug-pane';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'debug-header';
    
    const title = document.createElement('h3');
    title.textContent = 'Debug Output';
    
    this.toggleButton = document.createElement('button');
    this.toggleButton.id = 'toggle-debug';
    this.toggleButton.textContent = 'Toggle Debug';
    
    this.clearButton = document.createElement('button');
    this.clearButton.id = 'clear-debug';
    this.clearButton.textContent = 'Clear';
    
    header.appendChild(title);
    header.appendChild(this.toggleButton);
    header.appendChild(this.clearButton);
    
    // Create content
    const content = document.createElement('div');
    content.className = 'debug-content';
    
    this.outputElement = document.createElement('pre');
    this.outputElement.id = 'debug-output';
    
    content.appendChild(this.outputElement);
    
    // Assemble pane
    this.debugPane.appendChild(header);
    this.debugPane.appendChild(content);
    
    // Add to document
    document.body.appendChild(this.debugPane);
    
    // Bind events
    this.toggleButton.addEventListener('click', () => this.toggle());
    this.clearButton.addEventListener('click', () => this.clear());
  }

  /**
   * Enable the debug logger
   */
  enable() {
    this.enabled = true;
    if (this.debugPane) {
      this.debugPane.style.display = 'block';
    }
    localStorage.setItem('vinylVibeDebugEnabled', 'true');
    this.log('Debug mode enabled', 'info');
  }

  /**
   * Disable the debug logger
   */
  disable() {
    this.enabled = false;
    if (this.debugPane) {
      this.debugPane.style.display = 'none';
    }
    localStorage.setItem('vinylVibeDebugEnabled', 'false');
  }

  /**
   * Toggle the debug logger
   */
  toggle() {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
  }

  /**
   * Clear the debug output
   */
  clear() {
    if (this.outputElement) {
      this.outputElement.innerHTML = '';
    }
    this.buffer = [];
  }

  /**
   * Log a message to the debug output
   * @param {string} message - The message to log
   * @param {string} type - The type of message (info, request, response, error)
   */
  log(message, type = 'info') {
    // Always keep in buffer
    const timestamp = new Date().toISOString();
    const entry = { timestamp, message, type };
    
    // Add to buffer with limit
    this.buffer.push(entry);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }
    
    // Only update UI if enabled
    if (this.enabled && this.outputElement) {
      const formattedMessage = this.formatLogEntry(entry);
      this.outputElement.innerHTML += formattedMessage;
      
      // Auto-scroll to bottom
      this.outputElement.scrollTop = this.outputElement.scrollHeight;
    }
  }

  /**
   * Format a log entry for display
   * @param {Object} entry - The log entry
   * @returns {string} - Formatted HTML
   */
  formatLogEntry(entry) {
    const { timestamp, message, type } = entry;
    
    // Format based on type
    let formattedMessage = '';
    
    switch (type) {
      case 'request':
        formattedMessage = `<div class="debug-request">[${timestamp}] REQUEST: ${this.escapeHTML(message)}</div>`;
        break;
      case 'response':
        formattedMessage = `<div class="debug-response">[${timestamp}] RESPONSE: ${this.escapeHTML(message)}</div>`;
        break;
      case 'error':
        formattedMessage = `<div class="debug-error">[${timestamp}] ERROR: ${this.escapeHTML(message)}</div>`;
        break;
      case 'info':
      default:
        formattedMessage = `<div class="debug-info">[${timestamp}] INFO: ${this.escapeHTML(message)}</div>`;
    }
    
    return formattedMessage;
  }

  /**
   * Escape HTML special characters
   * @param {string} text - The text to escape
   * @returns {string} - Escaped text
   */
  escapeHTML(text) {
    if (typeof text !== 'string') {
      try {
        text = JSON.stringify(text, null, 2);
      } catch (e) {
        text = String(text);
      }
    }
    
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Log an LLM request
   * @param {string} prompt - The prompt sent to the LLM
   * @param {Object} context - The context data
   */
  logRequest(prompt, context) {
    const message = `Prompt: ${prompt}\nContext: ${JSON.stringify(context, null, 2)}`;
    this.log(message, 'request');
  }

  /**
   * Log an LLM response
   * @param {Object} response - The response from the LLM
   */
  logResponse(response) {
    const message = JSON.stringify(response, null, 2);
    this.log(message, 'response');
  }

  /**
   * Log an error
   * @param {Error} error - The error object
   */
  logError(error) {
    const message = error.stack || error.message || String(error);
    this.log(message, 'error');
  }
}

// Create singleton instance
const debugLogger = new DebugLogger();

export default debugLogger;
