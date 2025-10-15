// background.js
function triggerActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, { type: 'ULTRA_PRINT_FULL_EXAM' });
  });
}

chrome.commands.onCommand.addListener((command) => {
  if (command === 'print_full_exam') triggerActiveTab();
});

chrome.action.onClicked.addListener(() => {
  triggerActiveTab();
});
