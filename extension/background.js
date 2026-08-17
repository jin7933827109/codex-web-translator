const HOST_NAME = "com.codex.web_translator";
const MAX_ITEMS = 80;
const MAX_TEXT_LENGTH = 3_000;
const MAX_BATCH_LENGTH = 50_000;
const SUPPORTED_LANGUAGES = new Set([
  "zh-CN",
  "zh-TW",
  "en",
  "ja",
  "ko",
  "fr",
  "de",
  "es"
]);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "translateBatch") {
    return undefined;
  }

  translateBatch(message, sender)
    .then(sendResponse)
    .catch((error) => {
      sendResponse({
        ok: false,
        error: toPublicError(error)
      });
    });

  return true;
});

async function translateBatch(message, sender) {
  if (!sender.tab?.id) {
    throw new Error("翻译请求必须来自当前网页。");
  }

  const request = validateRequest(message);

  let response;
  try {
    response = await chrome.runtime.sendNativeMessage(HOST_NAME, request);
  } catch (error) {
    const detail = String(error?.message || error);
    if (/native messaging host.*not found|specified native messaging host/i.test(detail)) {
      throw new Error("本机 Codex Bridge 尚未安装，请先运行项目安装脚本。");
    }
    throw new Error(`无法连接本机 Codex Bridge：${detail}`);
  }

  if (!response || response.ok !== true || !Array.isArray(response.translations)) {
    throw new Error(response?.error || "本机 Codex Bridge 返回了无效结果。");
  }

  return {
    ok: true,
    translations: response.translations
  };
}

function validateRequest(message) {
  const targetLanguage = String(message.targetLanguage || "");
  if (!SUPPORTED_LANGUAGES.has(targetLanguage)) {
    throw new Error("不支持所选目标语言。");
  }

  if (!Array.isArray(message.items) || message.items.length === 0) {
    throw new Error("当前批次没有可翻译内容。");
  }
  if (message.items.length > MAX_ITEMS) {
    throw new Error("单次翻译段落过多。");
  }

  let totalLength = 0;
  const items = message.items.map((item) => {
    const id = String(item?.id || "");
    const text = String(item?.text || "").trim();
    if (!/^b\d+$/.test(id)) {
      throw new Error("段落编号无效。");
    }
    if (text.length < 2 || text.length > MAX_TEXT_LENGTH) {
      throw new Error("段落长度超出限制。");
    }
    totalLength += text.length;
    return { id, text };
  });

  if (totalLength > MAX_BATCH_LENGTH) {
    throw new Error("单次翻译总字符数超出限制。");
  }

  return {
    type: "translate",
    version: 1,
    targetLanguage,
    items
  };
}

function toPublicError(error) {
  const message = String(error?.message || error || "未知错误");
  return message.slice(0, 500);
}
