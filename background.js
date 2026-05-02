// background.js v2.1
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

// When a new tab is opened from our panel, focus the omnibox
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.pendingUrl === 'chrome://newtab/' || tab.url === 'chrome://newtab/') {
    // Focus the window — Chrome automatically focuses the omnibox on newtab
    chrome.windows.update(tab.windowId, { focused: true });
  }
});
