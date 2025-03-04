(function() {
  'use strict';
  
  let isEnabled = false; // Default off

  // Check if extension context is valid
  function isExtensionValid() {
    try {
      chrome.runtime.getURL('');
      return true;
    } catch (e) {
      console.error('Extension context invalidated. Please reload the page.');
      showStaticNotification('Extension context invalidated. Please reload the page.', 'error');
      return false;
    }
  }

  // Show a static notification using DOM (doesn’t use Chrome APIs)
  function showStaticNotification(message, type) {
    try {
      const existing = document.querySelector('.twitter-quick-mute-notification');
      if (existing) { existing.remove(); }
      const notification = document.createElement('div');
      notification.className = 'twitter-quick-mute-notification';
      notification.style.position = 'fixed';
      notification.style.bottom = '20px';
      notification.style.right = '20px';
      notification.style.backgroundColor = type === 'success' ? '#17bf63' : type === 'error' ? '#e0245e' : '#1da1f2';
      notification.style.color = 'white';
      notification.style.padding = '10px 20px';
      notification.style.borderRadius = '4px';
      notification.style.zIndex = '9999';
      notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
      notification.style.transition = 'opacity 0.5s ease';
      notification.textContent = message;
      document.body && document.body.appendChild(notification);
      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => { 
          try { notification.remove(); } catch (err) { console.error('Removal error:', err); }
        }, 500);
      }, 5000);
    } catch (e) {
      console.error('Failed to show static notification:', e);
    }
  }

  // Show notification (tries to use DOM; falls back to static)
  function showNotification(message, type = 'info') {
    if (!isExtensionValid()) {
      showStaticNotification(message, type);
      return;
    }
    try {
      const existing = document.querySelector('.twitter-quick-mute-notification');
      if (existing) { existing.remove(); }
      const notification = document.createElement('div');
      notification.className = 'twitter-quick-mute-notification';
      notification.style.position = 'fixed';
      notification.style.bottom = '20px';
      notification.style.right = '20px';
      notification.style.backgroundColor = type === 'success' ? '#17bf63' : type === 'error' ? '#e0245e' : '#1da1f2';
      notification.style.color = 'white';
      notification.style.padding = '10px 20px';
      notification.style.borderRadius = '4px';
      notification.style.zIndex = '9999';
      notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
      notification.style.transition = 'opacity 0.5s ease';
      notification.textContent = message;
      document.body && document.body.appendChild(notification);
      setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => { 
          try { notification.remove(); } catch (err) { console.error('Removal error:', err); }
        }, 500);
      }, 3000);
    } catch (e) {
      console.error('showNotification failed:', e);
      showStaticNotification(message, type);
    }
  }

  // Load current enabled state from storage (default off)
  chrome.storage.sync.get(['enabled'], function(result) {
    isEnabled = result.enabled !== undefined ? result.enabled : false;
    console.log('Twitter Quick Mute: Extension enabled:', isEnabled);
  });

  // Listen for keyboard shortcut
  document.addEventListener('keydown', function(event) {
    if (!isEnabled) {
      showNotification("Extension is currently off. Enable via the popup.", "error");
      return;
    }
    if (!isExtensionValid()) return;
    if (event.ctrlKey && event.key === 'b') {
      event.preventDefault();
      const selectedText = window.getSelection().toString().trim();
      if (selectedText) {
        try {
          chrome.runtime.sendMessage({ action: 'muteWord', word: selectedText });
          showNotification(`Processing: "${selectedText}"`);
        } catch (e) {
          console.error('Failed to send message:', e);
          showStaticNotification('Error: Please refresh the page.', 'error');
        }
      }
    }
  });

  // Listen for messages to update enabled state or show notifications
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!isExtensionValid()) return;
    if (request.action === 'showNotification') {
      showNotification(request.message, request.type || 'info');
    } else if (request.action === 'toggleState') {
      isEnabled = request.enabled;
      console.log('Twitter Quick Mute: Extension enabled set to:', isEnabled);
    }
  });

  console.log('Twitter Quick Mute: Content script loaded');
})();