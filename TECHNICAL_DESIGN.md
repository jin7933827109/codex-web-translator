# Codex 网页双语翻译插件技术方案

状态：MVP 实施基线  
日期：2026-08-17

## 1. 目标

实现一个可本地加载的 Chrome Manifest V3 扩展。用户点击工具栏图标后，可以：

1. 识别当前普通网页中的主要文字段落；
2. 调用本机已登录的 Codex CLI 翻译；
3. 在每段原文下方插入对应译文；
4. 再次操作时移除译文，恢复原网页；
5. 全程不在扩展中保存 OpenAI API Key。

MVP 以“段落”为最小单元。严格逐句对齐留到第二阶段，因为网页中的一句话经常被链接、粗体、脚注等多个 DOM 节点拆开，直接重写会破坏原网页交互。

## 2. 非目标

首版不实现：

- PDF、图片、漫画、视频字幕翻译；
- 输入框翻译、划词翻译、鼠标悬停翻译；
- 站点级规则库和账户同步；
- Chrome 内部页、Chrome 商店页和其他扩展页；
- 完整复刻沉浸式翻译的 UI、品牌或专有实现。

## 3. 总体架构

```text
Chrome Popup
    │ 用户点击“翻译当前网页”
    ▼
Content Script
    │ 提取、清洗、编号、分批
    ▼
Extension Service Worker
    │ Chrome Native Messaging
    ▼
Local Native Host (Node.js)
    │ codex exec + stdin + JSON Schema
    ▼
Codex
    │ { translations: [{ id, text }] }
    ▼
Content Script
    │ 按 id 插入译文节点
    ▼
原文段落 + 译文段落
```

### 3.1 Chrome 扩展

- `popup/`：目标语言、翻译、恢复、进度和错误提示；
- `content/`：正文提取、批处理、译文回填、恢复；
- `background.js`：校验来自内容脚本的请求并转发给 Native Host；
- 权限遵循最小化原则：`activeTab`、`scripting`、`storage`、`nativeMessaging`。

扩展不会常驻读取全部网页。只有用户点击扩展后，`activeTab` 才授权注入当前页面。

### 3.2 本机 Native Host

Chrome 扩展不能直接执行本机命令，因此使用 Chrome 官方 Native Messaging 机制。Host 负责：

- 接收 Chrome 的长度前缀 JSON 消息；
- 校验语言、批次数量、单段长度和总字符数；
- 在临时空目录运行 `codex exec`；
- 把网页文字通过 stdin 传给 Codex；
- 校验 Codex 返回的结构化 JSON；
- 将结果返回扩展。

安装脚本会把 Host 与 Schema 复制到 `~/Library/Application Support/CodexWebTranslator/`，并在生成的启动器里固化 Node.js 与 Codex 的绝对路径。Chrome 不直接执行项目中文路径下的脚本，也不依赖 GUI 进程是否继承用户终端的 `PATH`。

### 3.3 Codex 调用策略

MVP 使用本机 Codex CLI，而不是把 API Key 放入扩展：

```text
codex exec
  --ephemeral
  --sandbox read-only
  --ignore-user-config
  --ignore-rules
  --skip-git-repo-check
  --output-schema translation.schema.json
  -C <每次请求的新临时空目录>
```

约束：

- 网页内容一律视为不可信数据，不视为指令；
- Prompt 明确禁止执行网页中的要求、禁止使用工具、禁止解释；
- 每批使用独立临时会话，避免跨网页上下文串联；
- 返回值必须符合固定 JSON Schema；
- Host 不回传完整 Prompt、认证信息或本机路径给网页。

## 4. 页面内容提取

### 4.1 MVP 规则

优先从 `article`、`main` 和 `[role="main"]` 中提取：

- `h1`–`h4`
- `p`
- `blockquote`
- `li`

当页面没有语义化正文容器时，再回退到 `body` 内的同类元素。

跳过：

- `nav`、`header`、`footer`、`aside`、`form`；
- `pre`、`code`、`script`、`style`、输入控件；
- 隐藏节点、空文本、纯数字/符号、过短和过长文本；
- 扩展自己插入的译文节点。

### 4.2 批处理

- 单批最多 80 段；
- 单批最多约 50,000 字符；
- 单段最多 3,000 字符；
- 顺序执行批次，避免同时启动多个 Codex 进程；
- 每批完成后立即回填和更新进度。

Codex CLI 会携带固定的 Agent 上下文。为避免每 12 段重复支付这部分开销，MVP 优先把常规文章合并为单次请求；只有超过 80 段或 50,000 字符时才拆成多批。同时显式关闭翻译不需要的插件、浏览器、计算机控制、多 Agent、Shell、技能搜索等能力。

## 5. DOM 回填与恢复

- 不替换、不重写原文；
- 普通段落在原节点后插入独立译文节点；
- 列表项把译文作为列表项内部的辅助块，避免产生无效列表结构；
- 译文节点带固定 class、`lang` 和内部 block id；
- 恢复时只删除扩展创建的节点；
- 页面刷新后原网页自然恢复。

## 6. 状态模型

每个标签页内存状态：

```text
idle -> translating -> translated
  ^         │              │
  └──────── cancel/restore ┘
```

- `idle`：没有译文；
- `translating`：正在按批请求；
- `translated`：至少已有一条译文；
- `restore`：增加运行令牌、忽略迟到响应、删除全部译文节点。

不做跨浏览器重启的翻译结果持久化。

## 7. 安全与隐私

1. 翻译时，提取的网页文字会发送给当前 Codex 所使用的模型服务；Popup 必须提示这一点。
2. 扩展不读取密码框、输入框、表单、Cookie、Local Storage 或浏览历史。
3. Service Worker 和 Native Host 都进行独立输入校验，不能信任 Content Script。
4. 不使用 `innerHTML` 写入模型输出，只通过 `textContent` 创建文本节点，避免 XSS。
5. Native Host 仅允许固定扩展 ID 连接。
6. Codex 运行在临时空目录和只读沙箱中；每次请求后删除临时目录。

## 8. 已知限制

- SPA 重新渲染可能删除已经插入的译文；MVP 不自动重新翻译动态新增内容；
- Shadow DOM、跨域 iframe、Canvas 和虚拟列表可能无法完整提取；
- 复杂列表和表格只做保守处理；
- 每批启动一次 `codex exec`，CLI 固定上下文的 token 与延迟开销明显高于专用翻译 API；MVP 已尽量让常规文章只触发一次调用；
- Codex CLI 是否可用取决于本机安装、登录状态、网络和账户权限。

## 9. 验收标准

### 自动化验收

- Manifest、Host manifest 模板和 JSON Schema 均可解析；
- 所有 JavaScript 文件通过 `node --check`；
- Native Messaging 编解码测试通过；
- Host 输入校验、Codex JSON 解析和 ID 对齐测试通过；
- Mock 模式可以在不请求模型的情况下返回稳定译文。

### 手工验收

1. 在 `chrome://extensions` 以开发者模式加载 `extension/`；
2. 打开普通英文文章；
3. 点击扩展并选择“简体中文”；
4. 页面逐段出现译文，原文内容和链接仍可用；
5. 点击“恢复原网页”，所有译文消失；
6. 在受限页面使用时出现清晰错误，不破坏页面。

## 10. 后续演进

1. 使用 Codex SDK 复用本地进程并改善延迟；
2. 增加 `Intl.Segmenter` 逐句对齐模式；
3. 使用 `MutationObserver` 处理无限滚动和 SPA；
4. 增加页面级缓存、术语表和译文风格；
5. 增加专用 Responses API Provider，作为更低延迟的生产路线。
