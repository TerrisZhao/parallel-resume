# Parallel Resume - 专业简历构建器

中文 | [English](./README.md)

Parallel Resume 是一个现代化的简历管理平台，帮助用户轻松创建、管理和导出专业简历。平台提供直观的编辑界面、多版本管理和一键 PDF 导出功能。

## ✨ 核心特性

### 📝 简历编辑
- **直观界面**：易于使用的编辑界面，轻松管理个人信息、工作经历、教育背景和项目经验
- **实时预览**：所见即所得的编辑体验
- **丰富内容**：支持详细的工作经历、教育背景和项目描述

### 📄 多版本管理
- **多个简历**：创建和管理多个简历版本
- **快速复制**：轻松复制现有简历，针对不同职位定制内容
- **批量更新**：一次性更新多个简历的联系方式

### 💾 PDF 导出
- **一键导出**：一键生成专业 PDF 格式简历
- **A4 标准**：完美适配打印和在线投递
- **高质量**：专业输出，适合求职使用

### 👥 用户系统
- **多种登录方式**：支持 Google OAuth 和账号密码登录
- **角色权限**：owner/admin/user 三级权限管理
- **登录历史**：追踪登录活动，保障安全

### 🎨 现代化界面
- **响应式设计**：完美适配桌面端和移动端
- **深色模式**：支持明暗主题切换
- **流畅交互**：基于 Framer Motion 的精美动画效果

## 🛠️ 技术栈

### 前端
- **[Next.js 15](https://nextjs.org/)** - React 全栈框架，使用 App Router
- **[React 18](https://react.dev/)** - 用户界面库
- **[TypeScript](https://www.typescriptlang.org/)** - 类型安全的 JavaScript
- **[HeroUI v2](https://heroui.com/)** - 现代化 React UI 组件库
- **[Tailwind CSS](https://tailwindcss.com/)** - 原子化 CSS 框架
- **[Framer Motion](https://www.framer.com/motion/)** - 动画库
- **[Lucide React](https://lucide.dev/)** - 图标库

### 后端
- **[NextAuth.js](https://next-auth.js.org/)** - 身份认证解决方案
- **[Drizzle ORM](https://orm.drizzle.team/)** - 类型安全的 TypeScript ORM
- **[PostgreSQL](https://www.postgresql.org/)** - 关系型数据库
- **[Puppeteer](https://pptr.dev/)** - PDF 生成工具

## 📦 安装

### 前置要求
- Node.js 18.x 或更高版本
- PostgreSQL 数据库
- pnpm 包管理器

### 步骤

1. 克隆仓库
```bash
git clone https://github.com/yourusername/parallel-resume.git
cd parallel-resume
```

2. 安装依赖
```bash
pnpm install
```

3. 配置环境变量
```bash
cp env.example .env
```

编辑 `.env` 文件并配置：
- 数据库连接字符串
- NextAuth 配置
- Google OAuth 凭证（可选）

4. 初始化数据库
```bash
pnpm db:generate
pnpm db:migrate
```

5. 启动开发服务器
```bash
pnpm dev
```

访问 `http://localhost:3100` 查看应用。

## 🚀 部署

### Vercel（推荐）
1. 将代码推送到 GitHub
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 部署

### Docker
```bash
docker build -t parallel-resume .
docker run -p 3100:3100 parallel-resume
```

## 📝 环境变量

必需的环境变量：

```env
# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/parallel-resume

# NextAuth
NEXTAUTH_URL=http://localhost:3100
NEXTAUTH_SECRET=your-secret-key

# Google OAuth（可选）
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## 🤝 贡献

欢迎贡献！请随时提交 Pull Request。

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React 框架
- [HeroUI](https://heroui.com/) - 精美的 UI 组件
- [Drizzle ORM](https://orm.drizzle.team/) - 类型安全的数据库工具包