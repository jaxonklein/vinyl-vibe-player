// Simple script to toggle the debug pane
document.addEventListener('DOMContentLoaded', function() {
  const debugPane = document.querySelector('.debug-pane');
  const toggleButton = document.getElementById('toggle-debug');
  const clearButton = document.getElementById('clear-debug');
  const outputElement = document.getElementById('debug-output');
  
  // Show debug pane by default for testing
  if (debugPane) {
    debugPane.style.display = 'block';
  }
  
  // Add toggle functionality
  if (toggleButton) {
    toggleButton.addEventListener('click', function() {
      if (debugPane) {
        debugPane.style.display = debugPane.style.display === 'none' ? 'block' : 'none';
      }
    });
  }
  
  // Add clear functionality
  if (clearButton) {
    clearButton.addEventListener('click', function() {
      if (outputElement) {
        outputElement.innerHTML = '';
      }
    });
  }
  
  // Add a test log entry
  if (outputElement) {
    const timestamp = new Date().toISOString();
    outputElement.innerHTML += `<div class="debug-info">[${timestamp}] INFO: Debug pane initialized and working!</div>`;
  }
});
