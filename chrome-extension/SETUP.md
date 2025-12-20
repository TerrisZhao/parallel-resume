# Chrome Extension Setup Guide

## 快速开始

### 1. 创建图标

在构建之前，需要在 `src/assets/icons/` 目录下创建以下图标：
- icon16.png (16x16)
- icon48.png (48x48)
- icon128.png (128x128)

**临时方案**：可以使用任意 PNG 图片重命名为这些文件名，稍后再替换为正式图标。

### 2. 配置 Google Client ID

编辑 `manifest.json`，将 `YOUR_GOOGLE_CLIENT_ID` 替换为你的实际 Client ID：

```json
"oauth2": {
  "client_id": "你的实际ClientID.apps.googleusercontent.com",
  "scopes": ["openid", "email", "profile"]
}
```

### 3. 构建插件

```bash
# 开发模式（监听文件变化）
npm run dev

# 生产构建
npm run build
```

### 4. 加载到 Chrome

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启右上角"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `chrome-extension/dist` 目录

### 5. 测试插件

1. 确保后端服务正在运行（`http://localhost:3100`）
2. 点击插件图标
3. 使用 Google 登录
4. 选择简历
5. 访问任意求职网站的表单页面
6. 点击"自动填充"按钮

## 常见问题

### 构建失败：找不到图标

暂时创建空的 PNG 文件作为占位符：
```bash
cd src/assets/icons
touch icon16.png icon48.png icon128.png
```

### 登录失败

- 检查 Google Client ID 是否配置正确
- 检查后端服务是否运行
- 查看浏览器控制台的错误信息

### 自动填充不工作

- 打开浏览器控制台（F12）查看错误
- 确保已选择简历
- 检查页面是否有表单字段

## 下一步开发

当前版本是基础功能实现。后续可以：

1. **实现智能字段检测** - `src/content/field-detector.ts`
2. **添加平台处理器** - `src/content/platform-handlers/`
3. **创建字段映射规则** - `src/shared/field-mappings.ts`
4. **优化 UI** - 改进弹窗界面
5. **添加错误处理** - 更好的用户反馈
