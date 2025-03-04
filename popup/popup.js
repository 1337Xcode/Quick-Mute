// Description: This script is responsible for the popup window that appears when the extension icon is clicked.
document.addEventListener('DOMContentLoaded', function() {
  const enableToggle = document.getElementById('enableToggle');
  
  chrome.storage.sync.get(['enabled'], function(result) {
    enableToggle.checked = result.enabled !== undefined ? result.enabled : false;
  });
  // Save state when toggled and prompt for reload if turned on
  enableToggle.addEventListener('change', function() {
    const newState = enableToggle.checked;
    chrome.storage.sync.set({ enabled: newState });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: 'toggleState', 
          enabled: newState 
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Message failed:', chrome.runtime.lastError.message);
          } else {
            console.log('Message sent successfully.');
          }
        });
      }
    });
    if (newState) {
      if (confirm("Extension turned on. Would you like to reload the page?")) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.reload(tabs[0].id); // Reload the page
          }
        });
      }
    }
  });
  
  loadRecentMutes();
});

function loadRecentMutes() {
  const recentlyMutedList = document.getElementById('recentlyMuted');
  chrome.storage.local.get(['recentMutes'], function(result) {
    const recentMutes = result.recentMutes || [];
    const displayMutes = recentMutes.slice(0, 5);
    if (displayMutes.length === 0) {
      recentlyMutedList.innerHTML = '<li>No recent words</li>';
      return;
    }
    recentlyMutedList.innerHTML = '';
    displayMutes.forEach(function(word) {
      const li = document.createElement('li');
      li.textContent = word;
      recentlyMutedList.appendChild(li);
    });
  });
}
