// Track the tab that initiated the muting
let sourceTabId = null;

// Message listener from content or popup scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'muteWord') {
    sourceTabId = sender.tab.id;
    processWordInBackground(request.word);
  }
});

// Process a word in the background
async function processWordInBackground(word) {
  console.log('Processing word in background:', word);
  try {
    // Create a hidden tab; store it in newTab
    const newTab = await chrome.tabs.create({
      url: 'https://x.com/settings/muted_keywords',
      active: false
    });
    await chrome.storage.local.set({ 'currentProcessingWord': word });
    // Listen for updates specifically for newTab
    chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, tab) {
      if (tabId === newTab.id && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        // Allow time for page to initialize
        setTimeout(async () => {
          try {
            console.log(`Executing script to mute word: ${word}`);
            const results = await chrome.scripting.executeScript({
              target: { tabId: newTab.id },
              func: addWordToMutedKeywords,
              args: [word]
            });
            const result = results[0].result;
            console.log('Script execution result:', result);
            // Wait briefly then remove the hidden tab
            setTimeout(() => {
              chrome.tabs.remove(newTab.id);
              console.log('Background tab closed');
              if (result?.success) {
                updateRecentMutedWords(word);
                if (sourceTabId) {
                  chrome.tabs.sendMessage(sourceTabId, {
                    action: 'showNotification',
                    message: `Added "${word}" to muted keywords`,
                    type: 'success'
                  });
                }
              } else if (sourceTabId) {
                chrome.tabs.sendMessage(sourceTabId, {
                  action: 'showNotification',
                  message: `Error: ${result?.error || 'Could not add word'}`,
                  type: 'error'
                });
              }
            }, 2000);
          } catch (error) {
            console.error('Error during script execution:', error);
            chrome.tabs.remove(newTab.id);
            if (sourceTabId) {
              chrome.tabs.sendMessage(sourceTabId, {
                action: 'showNotification',
                message: `Error: ${error.message || 'Unknown error occurred'}`,
                type: 'error'
              });
            }
          }
        }, 3000);
      }
    });
  } catch (error) {
    console.error('Error creating background tab:', error);
    if (sourceTabId) {
      chrome.tabs.sendMessage(sourceTabId, {
        action: 'showNotification',
        message: `Error: ${error.message || 'Could not process word'}`,
        type: 'error'
      });
    }
  }
}

// Function running in the muted keywords page context
function addWordToMutedKeywords(word) {
  console.log(`In page context: Adding word "${word}" to muted keywords`);
  try {
    let addButton = document.querySelector('a[href="/settings/add_muted_keyword"][aria-label="Add muted word or phrase"]');
    if (!addButton) {
      addButton = document.querySelector('a[href="/settings/add_muted_keyword"]');
    }
    if (!addButton) {
      const possibleButtons = Array.from(document.querySelectorAll('a[role="button"]'));
      addButton = possibleButtons.find(button => 
        button.textContent.toLowerCase().includes('add') ||
        button.getAttribute('aria-label')?.toLowerCase().includes('add')
      );
    }
    if (!addButton) {
      console.error('Add button not found on page');
      return { success: false, error: 'Add button not found' };
    }
    console.log('Found add button, clicking...');
    addButton.click();
    return new Promise((resolve) => {
      setTimeout(() => {
        const inputField = document.querySelector('input[name="keyword"]');
        if (!inputField) {
          console.error('Input field not found after clicking add button');
          return resolve({ success: false, error: 'Input field not found' });
        }
        console.log('Found input field, entering word...');
        inputField.value = word;
        inputField.dispatchEvent(new Event('input', { bubbles: true }));
        setTimeout(() => {
          let saveButton = document.querySelector('button[data-testid="settingsDetailSave"]');
          if (!saveButton) {
            saveButton = document.querySelector('div[role="button"][data-testid="confirmationSheetConfirm"]');
          }
          if (!saveButton) {
            const possibleButtons = Array.from(document.querySelectorAll('button, div[role="button"]'));
            saveButton = possibleButtons.find(button => 
              button.textContent.toLowerCase().includes('save') ||
              button.textContent.toLowerCase().includes('add')
            );
          }
          if (!saveButton) {
            console.error('Save button not found');
            return resolve({ success: false, error: 'Save button not found' });
          }
          console.log('Found save button, clicking...');
          saveButton.click();
          setTimeout(() => {
            const alreadyMutedMessage = document.querySelector('div[role="status"]');
            const anyErrorMessage = document.querySelector('.error-message, [aria-live="assertive"]');
            if (alreadyMutedMessage?.textContent?.includes('already muted')) {
              console.log('Word was already muted');
              resolve({ success: true, status: 'already_muted' });
            } else if (anyErrorMessage) {
              console.error('Error message found:', anyErrorMessage.textContent);
              resolve({ success: false, error: anyErrorMessage.textContent });
            } else {
              console.log('Word added successfully');
              resolve({ success: true, status: 'added' });
            }
          }, 1000);
        }, 1000);
      }, 1000);
    });
  } catch (error) {
    console.error('Error in addWordToMutedKeywords:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
}

// Update recent muted words (limit to 5, no duplicates)
function updateRecentMutedWords(word) {
  chrome.storage.local.get(['recentMutes'], function(result) {
    let recentMutes = result.recentMutes || [];
    if (!recentMutes.includes(word)) {
      recentMutes.unshift(word);
    }
    if (recentMutes.length > 5) {
      recentMutes = recentMutes.slice(0, 5);
    }
    chrome.storage.local.set({ recentMutes: recentMutes });
  });
}

// Set initial extension state (default off)
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['enabled'], function(result) {
    if (result.enabled === undefined) {
      chrome.storage.sync.set({ enabled: false });
    }
  });
});