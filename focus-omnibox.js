// content script: focus the address bar on new tab page load
if (location.href === 'chrome://newtab/') {
  // chrome.omnibox is not available in content scripts,
  // but chrome.tabs.update with selected:true + windows.focus triggers omnibox focus
}
