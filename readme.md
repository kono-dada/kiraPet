# KiraPet

![项目横幅](./assets/banner.png)

> 让喜欢的角色常驻桌面，监督你有没有在好好工作学习！

## ✨ 核心亮点
- 🔌 **跨平台**：基于 Tauri + Vue 3，轻量且启动快（仅有20多MB）。（但其实还没有适配Windows）
- 🍅 **番茄钟**：内置番茄钟，你可以设置一段专注时间，她就会陪你一起工作（也许会在你分神的时候出言提醒哦）。
- 🧠 **多源上下文**：可插拔的 Context Source（如 ActivityWatch），赋予她看到你一举一动的能力。
- 🎨 **live2d**：LLM控制live2d的表情与动作。支持模型导入。

## 🛣️ Roadmap
- [ ] 更精准的主动性。让她多多主动找你聊天，社恐福音。
- [ ] 优秀的记忆机制。
- [ ] Windows适配。

## 使用案例

<div align="center">
<img src="./assets/output.gif" alt="使用案例" width="600"/>
</div>

## 安装

1. 前往 Releases 下载最新版本的dmg，然后安装。如果遇到不能打开的情况，使用`sudo xattr -d com.apple.quarantine "/Applications/kirapet.app"`命令解除macOS限制。
2. 同样在 Release 下载live2d模型文件，在程序内导入。
3. 点击菜单栏上的图标，打开设置配置你的LLM api。

## 🚀 开发

欢迎贡献pr~ 如果尚未接触过tauri，可以把仓库clone下来然后问问codex或者claude code。

> 如需首次运行 Tauri，请先安装 Rust 与 tauri-cli。

## 交流

> 可以加群 `1022181302` 讨论

## 鸣谢

- 感谢 [Lingchat](https://github.com/SlimeBoyOwO/LingChat/) 提供的灵感。
- 感谢 [BongoCat](https://github.com/ayangweb/BongoCat)提供的 tauri 案例。
- 感谢B站大佬 [是依七哒](https://space.bilibili.com/457683484) 的流萤前瞻小人 live2d 模型。