# PDF诊断工具使用指南

## 快速开始

### 在Mac mini上运行诊断

1. **基础环境检查**
   ```bash
   pnpm test:puppeteer
   ```
   或
   ```bash
   node scripts/test-puppeteer.js
   ```

   这会检查：
   - Node.js和系统信息
   - 环境变量配置
   - Chromium是否能启动
   - 基本的PDF生成功能
   - Google Fonts访问性

2. **测试实际PDF生成**
   ```bash
   pnpm test:pdf <resume-id>
   ```
   或
   ```bash
   node scripts/test-pdf-generation.js <resume-id>
   ```

   替换 `<resume-id>` 为实际的简历ID，例如：
   ```bash
   pnpm test:pdf 1
   ```

   这会：
   - 生成测试PDF文件
   - 生成页面截图
   - 显示详细的执行日志
   - 检查页面内容和结构

## 生成的文件

测试脚本会在项目根目录生成：

- `test-resume-<id>.pdf` - 测试生成的PDF
- `test-resume-<id>-screenshot.png` - 页面截图

## 对比测试

### 步骤1：在工作正常的机器上
```bash
cd /path/to/parallel-resume
pnpm test:pdf 1
```

保存生成的文件：
- `test-resume-1.pdf`
- `test-resume-1-screenshot.png`

### 步骤2：在Mac mini上
```bash
cd /path/to/parallel-resume
pnpm test:pdf 1
```

### 步骤3：对比
1. 比较PDF文件大小
2. 比较截图内容
3. 比较控制台输出

## 常见问题

### Q: 脚本提示"Resume not found"
**A:** 检查：
1. 数据库连接是否正常 (DATABASE_URL)
2. 简历ID是否存在
3. 应用程序是否正在运行

### Q: PDF生成但是空白
**A:** 查看截图文件，如果截图也是空白：
1. 检查 NEXTAUTH_URL 配置
2. 检查数据库数据是否正常
3. 查看服务器日志

### Q: 无法访问Google Fonts
**A:**
1. 检查网络连接
2. 考虑使用本地字体（参考故障排除指南）

### Q: Chromium启动失败
**A:** 运行：
```bash
npx puppeteer browsers install chrome
```

## 详细故障排除

查看完整的故障排除指南：
```bash
cat scripts/PDF_TROUBLESHOOTING.md
```

或在GitHub上查看：`scripts/PDF_TROUBLESHOOTING.md`

## 环境变量检查清单

在Mac mini上确认以下环境变量：

```env
# .env 文件

# ✅ 数据库连接
DATABASE_URL=postgres://user:pass@host:port/db

# ✅ NextAuth配置（最重要！）
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://192.168.1.100:3100  # 使用Mac mini的实际IP
# 或
# NEXTAUTH_URL=https://your-domain.com

# ✅ Cloudflare R2 (如果使用)
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_ENDPOINT=...
R2_PUBLIC_BASE_URL=...
```

## 提示

1. **最常见的问题是 NEXTAUTH_URL 配置错误**
   - 不要使用 `localhost`
   - 使用实际的IP地址或域名

2. **确保应用程序在运行**
   ```bash
   pnpm dev
   # 或
   pnpm start
   ```

3. **查看服务器日志**
   - 在导出PDF时观察终端输出
   - 现在有更详细的日志信息

4. **测试网络连接**
   ```bash
   curl https://fonts.googleapis.com
   ```

## 获取帮助

如果问题仍未解决，请提供：
1. 诊断脚本的完整输出
2. 生成的截图文件
3. 服务器日志
4. 环境信息（macOS版本、Node版本等）