(() => {
  if (globalThis.__codexWebTranslatorInstalled) {
    return;
  }
  globalThis.__codexWebTranslatorInstalled = true;

  const TRANSLATION_CLASS = "codex-web-translator-translation";
  const MAX_BLOCKS = 80;
  const MAX_ITEMS_PER_BATCH = 80;
  const MAX_BATCH_LENGTH = 50_000;
  const MAX_TEXT_LENGTH = 3_000;
  const BLOCK_SELECTOR = "h1, h2, h3, h4, p, blockquote, li";
  const SKIP_SELECTOR = [
    "nav",
    "header",
    "footer",
    "aside",
    "form",
    "pre",
    "code",
    "script",
    "style",
    "textarea",
    "input",
    "select",
    "button",
    "[contenteditable='true']",
    `.${TRANSLATION_CLASS}`
  ].join(",");

  const state = {
    phase: "idle",
    runToken: 0,
    total: 0,
    completed: 0,
    error: null
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "getStatus") {
      sendResponse(getStatus());
      return undefined;
    }

    if (message?.type === "restorePage") {
      restorePage();
      sendResponse(getStatus());
      return undefined;
    }

    if (message?.type === "translatePage") {
      translatePage(String(message.targetLanguage || "zh-CN"))
        .then(sendResponse)
        .catch((error) => {
          state.phase = "idle";
          state.error = toMessage(error);
          sendProgress();
          sendResponse(getStatus());
        });
      return true;
    }

    return undefined;
  });

  async function translatePage(targetLanguage) {
    if (state.phase === "translating") {
      return getStatus();
    }

    removeTranslationNodes();
    const blocks = collectBlocks();
    if (blocks.length === 0) {
      state.phase = "idle";
      state.total = 0;
      state.completed = 0;
      state.error = "没有识别到适合翻译的正文段落。";
      sendProgress();
      return getStatus();
    }

    const runToken = ++state.runToken;
    state.phase = "translating";
    state.total = blocks.length;
    state.completed = 0;
    state.error = null;
    sendProgress();

    const batches = createBatches(blocks);

    for (const batch of batches) {
      if (runToken !== state.runToken) {
        return getStatus();
      }

      const response = await chrome.runtime.sendMessage({
        type: "translateBatch",
        targetLanguage,
        items: batch.map(({ id, text }) => ({ id, text }))
      });

      if (runToken !== state.runToken) {
        return getStatus();
      }
      if (!response?.ok) {
        throw new Error(response?.error || "翻译服务返回失败。");
      }

      renderBatch(batch, response.translations, targetLanguage);
      state.completed += batch.length;
      sendProgress();
    }

    state.phase = "translated";
    sendProgress();
    return getStatus();
  }

  function collectBlocks() {
    const preferredRoot = document.querySelector("article, main, [role='main']");
    const root = preferredRoot || document.body;
    if (!root) {
      return [];
    }

    const elements = Array.from(root.querySelectorAll(BLOCK_SELECTOR));
    const blocks = [];

    for (const element of elements) {
      if (blocks.length >= MAX_BLOCKS) {
        break;
      }
      if (!isEligible(element)) {
        continue;
      }

      const text = normalizeText(element.innerText || element.textContent || "");
      if (text.length < 2 || text.length > MAX_TEXT_LENGTH || !/\p{L}/u.test(text)) {
        continue;
      }

      blocks.push({
        id: `b${blocks.length + 1}`,
        text,
        element
      });
    }

    return blocks;
  }

  function isEligible(element) {
    if (element.closest(SKIP_SELECTOR)) {
      return false;
    }
    if (element.getClientRects().length === 0) {
      return false;
    }
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") {
      return false;
    }
    return true;
  }

  function createBatches(blocks) {
    const batches = [];
    let current = [];
    let currentLength = 0;

    for (const block of blocks) {
      const wouldOverflow =
        current.length >= MAX_ITEMS_PER_BATCH ||
        (current.length > 0 && currentLength + block.text.length > MAX_BATCH_LENGTH);

      if (wouldOverflow) {
        batches.push(current);
        current = [];
        currentLength = 0;
      }

      current.push(block);
      currentLength += block.text.length;
    }

    if (current.length > 0) {
      batches.push(current);
    }
    return batches;
  }

  function renderBatch(batch, translations, targetLanguage) {
    const translationMap = new Map(
      translations
        .filter((item) => item && typeof item.id === "string" && typeof item.text === "string")
        .map((item) => [item.id, item.text.trim()])
    );

    for (const block of batch) {
      const translatedText = translationMap.get(block.id);
      if (!translatedText) {
        throw new Error(`翻译结果缺少段落 ${block.id}。`);
      }

      const node = document.createElement("div");
      node.className = TRANSLATION_CLASS;
      node.dataset.codexBlockId = block.id;
      node.lang = targetLanguage;
      node.textContent = translatedText;

      if (block.element.tagName === "LI") {
        node.classList.add(`${TRANSLATION_CLASS}--inside-list`);
        block.element.append(node);
      } else {
        block.element.insertAdjacentElement("afterend", node);
      }
    }
  }

  function restorePage() {
    state.runToken += 1;
    removeTranslationNodes();
    state.phase = "idle";
    state.total = 0;
    state.completed = 0;
    state.error = null;
    sendProgress();
  }

  function removeTranslationNodes() {
    document.querySelectorAll(`.${TRANSLATION_CLASS}`).forEach((node) => node.remove());
  }

  function getStatus() {
    return {
      ok: !state.error,
      phase: state.phase,
      total: state.total,
      completed: state.completed,
      translatedCount: document.querySelectorAll(`.${TRANSLATION_CLASS}`).length,
      error: state.error
    };
  }

  function sendProgress() {
    chrome.runtime.sendMessage({
      type: "translationProgress",
      ...getStatus()
    }).catch(() => undefined);
  }

  function normalizeText(text) {
    return text.replace(/\s+/g, " ").trim();
  }

  function toMessage(error) {
    return String(error?.message || error || "未知错误").slice(0, 500);
  }
})();
