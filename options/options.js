// Purpose: This script is used to handle the options page for the extension.
document.addEventListener('DOMContentLoaded', () => {
  updateBlocklistDisplay();
  document.getElementById('addWords').addEventListener('click', () => {
    const words = document.getElementById('words').value.split('\n').filter(word => word.trim() !== '');
    if (words.length === 0) {
      document.getElementById('status').textContent = 'Please enter at least one word.';
      return;
    }
    chrome.storage.sync.get("blocklist", (data) => {
      let blocklist = data.blocklist || [];
      words.forEach(word => {
        if (!blocklist.includes(word)) {
          blocklist.push(word);
        }
      });
      chrome.storage.sync.set({ blocklist: blocklist }, () => {
        document.getElementById('status').textContent = 'Blocklist updated.';
        updateBlocklistDisplay();
      });
    });
  });
});

// Update the displayed blocklist
function updateBlocklistDisplay() {
  chrome.storage.sync.get("blocklist", (data) => {
    const blocklist = data.blocklist || [];
    const blocklistElement = document.getElementById('blocklist');
    blocklistElement.innerHTML = '';
    blocklist.forEach(word => {
      const listItem = document.createElement('li');
      listItem.textContent = word;
      blocklistElement.appendChild(listItem);
    });
  });
}
