document.getElementById("open-x").addEventListener("click", () => {
  chrome.tabs.create({ url: "https://x.com" });
});

