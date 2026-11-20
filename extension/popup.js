document.getElementById("open-x").addEventListener("click", () => {
  chrome.tabs.create({ url: "https://x.com" });
});
document.getElementById("open-tiktok").addEventListener("click", () => {
  chrome.tabs.create({ url: "https://www.tiktok.com" });
});
document.getElementById("open-fb").addEventListener("click", () => {
  chrome.tabs.create({ url: "https://www.facebook.com" });
});
document.getElementById("open-ig").addEventListener("click", () => {
  chrome.tabs.create({ url: "https://www.instagram.com" });
});

