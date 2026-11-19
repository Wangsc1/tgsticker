# TG 表情导入 · iPhone Scripting

使用提供 `Archive.extractZip` 的 Scripting 版本（官方文档列在 3.2.1）。不是 Scriptable，也不需要 Apple「快捷指令」。

## 安装

下载项目 ZIP。若 Scripting 的导入入口支持选择本地 ZIP，直接选择它。若你的版本没有本地 ZIP 导入入口，先在「文件」App 解压项目 ZIP，在 Scripting 新建「TG 表情导入」，将 `index.tsx`、`intent.tsx`、`importer.ts` 和 `import-view.tsx` 导入到同一项目（也可新建同名文件并粘贴代码）。不要把项目 ZIP 当作待导入的表情包分享。

1. 从 GitHub 新安装时，项目预设勾选 Text、URLs、Images、FileURLs，并开启「总是在 App 中运行」。脚本仍只导入通过分享传入的本地 ZIP。已有安装若仍显示旧选项，可在项目编辑器点标题，进入 Intent 设置手动勾选，无需删除重装。
2. 首次导入时如果系统提示权限，允许文件系统访问与向「照片」添加图片。从 1.0.1–1.0.5 手动更新代码时，在原项目中替换 `importer.ts` 和 `import-view.tsx`，保留 `script.json` 和原有 Intent 设置。

## 使用

在 Nagram 或 Telegram 打开机器人发来的 ZIP 预览 → 系统分享 → Scripting → TG 表情导入。不需要先保存 ZIP；如果 ZIP 已在「文件」App，也可以从那里调用系统分享。页面会显示解压、保存进度和结果。

脚本仅处理 ZIP 内的 JPG、JPEG 和 GIF。GIF 按原文件路径交给「照片」，脚本不会做图片解码、压缩或转换。导入结果分别显示成功保存的图片和 GIF 数量，有失败时也会显示失败详情。多卷 ZIP 分别分享，每卷都可独立导入。重复导入不会自动去重。

归档上限：单个 ZIP 60 MB、最多 512 个条目，单条目解压最多 20 MB，总解压最多 100 MB，足够容纳机器人当前输出的一卷。脚本只清理自己创建的临时解压目录，不删除原 ZIP；不访问网络，不上传图片。
