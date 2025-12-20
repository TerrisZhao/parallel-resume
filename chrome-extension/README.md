# Parallel Resume - Chrome Extension

智能简历自动填充 Chrome 插件，帮助用户快速填写求职表单。

## 功能特性

- Google OAuth 登录，安全可靠
- 从 Parallel Resume 应用同步简历数据
- 智能识别表单字段
- 一键自动填充
- 支持 LinkedIn、Seek、Indeed 等主流招聘平台
- 支持任意招聘网站的通用表单

## 开发环境设置

### 前置要求

- Node.js 16+
- pnpm
- Chrome 浏览器

### 安装依赖

```bash
cd chrome-extension
npm install
```

### 开发模式

```bash
npm run dev
```

这将启动 webpack 监听模式，自动编译代码到 `dist` 目录。

### 加载插件到 Chrome

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `chrome-extension/dist` 目录

### 生产构建

```bash
npm run build
npm run package
```

这将创建一个 `parallel-resume-extension.zip` 文件，可以上传到 Chrome Web Store。

## 项目结构

```
chrome-extension/
├── manifest.json          # Chrome 扩展配置
├── src/
│   ├── background/        # 后台脚本
│   │   ├── service-worker.ts
│   │   ├── auth-manager.ts
│   │   ├── api-client.ts
│   │   └── storage-manager.ts
│   ├── content/           # 内容脚本
│   │   ├── content-script.ts
│   │   ├── field-detector.ts (待实现)
│   │   ├── form-filler.ts (待实现)
│   │   └── platform-handlers/ (待实现)
│   ├── popup/             # 弹窗 UI
│   │   ├── popup.html
│   │   ├── popup.tsx
│   │   └── components/
│   ├── shared/            # 共享代码
│   │   ├── types.ts
│   │   ├── constants.ts
│   │   └── field-mappings.ts (待实现)
│   └── assets/            # 资源文件
│       ├── icons/
│       └── styles/
└── dist/                  # 构建输出
```

## 配置

### Google OAuth Client ID

在 `manifest.json` 中配置 Google OAuth Client ID:

```json
{
  "oauth2": {
    "client_id": "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
    "scopes": ["openid", "email", "profile"]
  }
}
```

### API 基础 URL

在 `src/shared/constants.ts` 中配置后端 API URL:

```typescript
export const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://parallel-resume.terriszhao.men"
    : "http://localhost:3100";
```

## 使用说明

### 首次使用

1. 安装插件后，点击浏览器工具栏的插件图标
2. 点击"使用 Google 登录"
3. 授权插件访问你的 Parallel Resume 账号
4. 选择要使用的简历

### 自动填充表单

1. 访问任意招聘网站的申请页面
2. 点击插件图标
3. 确认选中的简历
4. 点击"自动填充"按钮
5. 检查填充结果并提交

## 后端 API 要求

插件需要后端提供以下 API 端点：

- `POST /api/auth/extension-login` - Google token 验证和 JWT 生成
- `GET /api/auth/validate` - JWT token 验证
- `GET /api/resumes` - 获取用户简历列表
- `GET /api/resumes/{id}` - 获取特定简历详情

## 开发路线图

### 第一阶段（已完成）
- [x] 项目结构搭建
- [x] Google OAuth 认证
- [x] 后端 API 集成
- [x] 基础弹窗 UI
- [x] 简单的表单填充功能

### 第二阶段（进行中）
- [ ] 智能字段检测算法
- [ ] 平台特定处理器（LinkedIn、Seek、Indeed）
- [ ] 通用表单支持
- [ ] 字段映射规则库

### 第三阶段（计划中）
- [ ] 多步骤表单支持
- [ ] 文件上传（简历 PDF）
- [ ] 工作经历和教育背景填充
- [ ] 项目经验填充
- [ ] 技能标签填充

### 第四阶段（未来）
- [ ] AI 驱动的字段识别
- [ ] 申请历史跟踪
- [ ] 求职信生成
- [ ] 数据分析和统计

## 常见问题

### 1. 插件无法登录？

确保：
- Google Client ID 配置正确
- 后端 API 正在运行
- 网络连接正常

### 2. 填充的字段不准确？

当前版本使用简单的字段名匹配。未来版本将使用智能字段检测算法。

### 3. 某些网站不支持？

当前版本支持基本的表单填充。复杂的动态表单可能需要特定的平台处理器。

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT
