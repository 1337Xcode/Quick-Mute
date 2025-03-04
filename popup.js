document.addEventListener('DOMContentLoaded', function() {
  const enableToggle = document.getElementById('enableToggle');
  
  // Load current state from storage (default to off)
  chrome.storage.sync.get(['enabled'], function(result) {
    // If not set, default disabled (false)
    enableToggle.checked = result.enabled !== undefined ? result.enabled : false;
  });
  
  // Save state when toggled and prompt for reload if turned on
  enableToggle.addEventListener('change', function() {
    const newState = enableToggle.checked;
    chrome.storage.sync.set({ enabled: newState });
    
    // Send message to content script about state change
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'toggleState',
          enabled: newState,
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Message failed:', chrome.runtime.lastError.message);
            // Optionally, notify the user or retry
          } else {
            console.log('Message sent successfully.');
          }
        });
      }
    });
    
    // If turning on, ask the user if they want to reload the page
    if (newState) {
      if (confirm("Extension turned on. Would you like to reload the page?")) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.reload(tabs[0].id);
          }
        });
      }
    }
  });
  
  // Load recently muted words
  loadRecentMutes();
});

function loadRecentMutes() {
  const recentlyMutedList = document.getElementById('recentlyMuted');
  
  chrome.storage.local.get(['recentMutes'], function(result) {
    const recentMutes = result.recentMutes || [];
    
    // Only display up to 5 words (should be 5 due to background setting)
    const displayMutes = recentMutes.slice(0, 5);
    
    if (displayMutes.length === 0) {
      recentlyMutedList.innerHTML = '<li>No recent words</li>';
      return;
    }
    // Clear the list and add each word
    recentlyMutedList.innerHTML = '';
    displayMutes.forEach(function(word) {
      const li = document.createElement('li');
      li.textContent = word;
      recentlyMutedList.appendChild(li);
    });
  });
}
