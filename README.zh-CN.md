# Codex 双语网页翻译

[English](./README.md)

一个非官方、本地优先的 Chrome 双语翻译扩展。它使用本机已经登录的 Codex CLI，把普通网页变成“原文一段、译文一段”的对照阅读页面。

点击扩展、选择目标语言，译文会显示在每段原文下方；点击“恢复原网页”即可删除扩展插入的全部译文，不会重写原始内容。

> **项目状态：** macOS MVP。当前版本可以使用，但还不是 Chrome 应用商店版本，也不是生产级翻译服务。

## 功能

- 网页段落级双语对照阅读
- 支持 8 种目标语言
- 一键翻译和恢复原网页
- 保守提取标题、段落、引用和列表项
- 扩展中不保存 API Key
- 通过 Chrome Native Messaging 调用本机 Codex CLI
- Codex 使用只读沙箱、临时会话和 JSON Schema 输出
- 把网页文字视为不可信输入，防止网页 Prompt Injection
- 运行时没有第三方 npm 依赖

## 工作方式

```text
Chrome 弹窗
  -> Content Script 提取并编号正文
  -> Service Worker 校验请求
  -> Chrome Native Messaging
  -> 本机 Node.js Host
  -> 在临时空目录运行 codex exec
  -> 校验结构化译文
  -> 以纯文本节点插回网页
```

完整架构和安全边界见 [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md)。

## 环境要求

- macOS
- Google Chrome
- Node.js 18 或更高版本
- 已安装并登录 [Codex CLI](https://learn.chatgpt.com/codex/cli)

v0.1.0 暂未提供 Windows 和 Linux 安装器。

## 快速开始

```bash
git clone https://github.com/jin7933827109/codex-web-translator.git
cd codex-web-translator
npm run verify
npm run install-host
```

然后：

1. 打开 `chrome://extensions`；
2. 开启“开发者模式”；
3. 点击“加载已解压的扩展程序”；
4. 选择仓库里的 `extension/` 目录；
5. 确认扩展 ID 是 `emnejkkppjmobchhidfddgedogbkdhcl`；
6. 把“Codex 双语翻译”固定到 Chrome 工具栏。

## 本地 Demo

```bash
npm run demo
```

访问 <http://127.0.0.1:4173/>，点击扩展即可测试。

## 更新

拉取新版本后，重新安装 Native Host，并在 `chrome://extensions` 重新加载扩展：

```bash
git pull
npm run verify
npm run install-host
```

## 卸载

先在 Chrome 删除扩展，然后运行：

```bash
npm run uninstall-host
```

## 隐私与安全

发起翻译后，扩展识别到的当前网页正文会发送给本机 Codex CLI 所使用的模型服务。本项目不会读取或发送输入框、密码、Cookie、Local Storage 或浏览历史。

网页文字一律视为不可信输入。Native Host 会让 Codex 在临时空目录、只读沙箱和临时会话中运行，关闭翻译不需要的工具，并使用严格 JSON Schema 约束输出。模型输出只通过 `textContent` 插入网页，不会作为 HTML 执行。

如果页面包含敏感信息，请确认你愿意把识别到的正文发送给当前配置的模型服务后再翻译。

漏洞报告方式见 [SECURITY.md](./SECURITY.md)。

## 已知限制

- 无法翻译 Chrome 内部页、Chrome 商店和其他扩展页面；
- Canvas、PDF 阅读器、跨域 iframe、Shadow DOM 和虚拟列表可能无法完整提取；
- SPA 重新渲染可能删除已经插入的译文；
- Codex CLI 的固定上下文和延迟高于专用翻译 API；
- 普通文章会尽量合并成少量请求，超长文章仍需分批；
- v0.1.0 只支持 macOS Google Chrome。

## 开发

项目没有安装时 npm 依赖。

```bash
npm run verify
npm run test
npm run extension-id
```

欢迎贡献。提交改动前请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## License

[MIT](./LICENSE)

## 免责声明

这是一个独立社区项目，与 OpenAI 没有隶属、背书或维护关系。“OpenAI”“Codex”及相关标识归其各自权利人所有。用户需要自行遵守所使用模型服务的条款和使用政策。
