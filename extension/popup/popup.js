const translateButton = document.querySelector("#translate-button");
const restoreButton = document.querySelector("#restore-button");
const targetLanguage = document.querySelector("#target-language");
const statusText = document.querySelector("#status-text");
const progressBar = document.querySelector("#progress-bar");

let activeTabId = null;

document.addEventListener("DOMContentLoaded", initialize);
translateButton.addEventListener("click", startTranslation);
restoreButton.addEventListener("click", restorePage);
targetLanguage.addEventListener("change", saveLanguage);
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== "translationProgress" || sender.tab?.id !== activeTabId) {
    return;
  }
  renderStatus(message);
});

async function initialize() {
  const stored = await chrome.storage.local.get("targetLanguage");
  if (stored.targetLanguage) {
    targetLanguage.value = stored.targetLanguage;
  }

  try {
    const tab = await getActiveTab();
    activeTabId = tab.id;
    assertSupportedUrl(tab.url);
    await ensureInjected(activeTabId);
    const status = await chrome.tabs.sendMessage(activeTabId, { type: "getStatus" });
    renderStatus(status);
  } catch (error) {
    setError(toMessage(error));
    setBusy(true);
  }
}

async function startTranslation() {
  setBusy(true);
  setStatus("正在识别网页正文…", false);

  try {
    await saveLanguage();
    const tab = await getActiveTab();
    activeTabId = tab.id;
    assertSupportedUrl(tab.url);
    await ensureInjected(activeTabId);
    const status = await chrome.tabs.sendMessage(activeTabId, {
      type: "translatePage",
      targetLanguage: targetLanguage.value
    });
    renderStatus(status);
  } catch (error) {
    setError(toMessage(error));
  } finally {
    setBusy(false);
  }
}

async function restorePage() {
  setBusy(true);
  try {
    const tab = await getActiveTab();
    activeTabId = tab.id;
    assertSupportedUrl(tab.url);
    await ensureInjected(activeTabId);
    const status = await chrome.tabs.sendMessage(activeTabId, { type: "restorePage" });
    renderStatus(status);
  } catch (error) {
    setError(toMessage(error));
  } finally {
    setBusy(false);
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error("没有找到当前网页标签页。");
  }
  return tab;
}

async function ensureInjected(tabId) {
  await chrome.scripting.insertCSS({
    target: { tabId },
    files: ["content/content.css"]
  });
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content/content.js"]
  });
}

function assertSupportedUrl(url = "") {
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("当前页面受 Chrome 限制，无法注入翻译。请打开普通网页后重试。");
  }
}

function renderStatus(status = {}) {
  const total = Number(status.total || 0);
  const completed = Number(status.completed || 0);
  const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  progressBar.style.width = `${percent}%`;

  if (status.error) {
    setError(status.error);
    return;
  }
  if (status.phase === "translating") {
    setStatus(`正在翻译 ${completed}/${total} 段…`, false);
    return;
  }
  if (status.phase === "translated") {
    setStatus(`已完成 ${status.translatedCount || completed} 段翻译`, false);
    return;
  }
  setStatus("准备就绪", false);
}

function setBusy(busy) {
  translateButton.disabled = busy;
  restoreButton.disabled = busy;
  targetLanguage.disabled = busy;
}

function setStatus(message, isError) {
  statusText.textContent = message;
  statusText.classList.toggle("error", Boolean(isError));
}

function setError(message) {
  setStatus(message, true);
}

async function saveLanguage() {
  await chrome.storage.local.set({ targetLanguage: targetLanguage.value });
}

function toMessage(error) {
  const message = String(error?.message || error || "未知错误");
  if (/cannot access|missing host permission|chrome:\/\//i.test(message)) {
    return "当前页面受 Chrome 限制，无法注入翻译。请打开普通网页后重试。";
  }
  return message.slice(0, 500);
}
