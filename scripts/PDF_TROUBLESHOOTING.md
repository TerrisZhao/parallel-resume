# PDF导出故障排除指南

如果在Mac mini上部署的项目导出的PDF没有内容，请按照以下步骤排查问题。

## 可能的原因

1. **Puppeteer/Chromium未正确安装**
2. **环境变量配置不正确**
3. **数据库连接问题**
4. **字体加载失败（Google Fonts无法访问）**
5. **页面渲染超时或失败**

---

## 第一步：确保Chromium正确安装

在Mac mini上运行：

```bash
# 安装或重新安装 Chrome
npx puppeteer browsers install chrome
```

---

## 第二步：检查环境变量

### 检查 `.env` 文件

在Mac mini上确保 `.env` 文件包含以下配置：

```env
# 数据库连接
DATABASE_URL=postgres://username:password@host:port/database

# NextAuth配置（重要！）
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://your-mac-mini-ip:3100
# 或者使用域名
# NEXTAUTH_URL=https://your-domain.com
```

### 重要提示

- **NEXTAUTH_URL** 必须指向Mac mini的实际IP地址或域名
- 不要使用 `http://localhost:3100`（除非在Mac mini本地测试）
- 如果使用域名，确保DNS解析正确

---

## 第三步：运行诊断脚本

### 3.1 基础环境测试

```bash
cd /path/to/parallel-resume
node scripts/test-puppeteer.js
```

这个脚本会测试：
- Node版本和平台信息
- 环境变量设置
- Chromium是否能正常启动
- 简单HTML渲染和PDF生成
- Google Fonts访问性
- 应用程序访问性

### 3.2 完整PDF生成测试

```bash
# 替换 <resume-id> 为实际的简历ID
node scripts/test-pdf-generation.js <resume-id>
```

这个脚本会：
- 模拟完整的PDF生成流程
- 生成截图和PDF文件用于对比
- 详细记录每一步的执行情况
- 检查页面结构和内容

**查看生成的文件：**
- `test-resume-<id>.pdf` - 生成的PDF
- `test-resume-<id>-screenshot.png` - 页面截图

---

## 第四步：对比测试

### 在工作正常的机器上运行

```bash
node scripts/test-pdf-generation.js <resume-id>
```

### 在Mac mini上运行

```bash
node scripts/test-pdf-generation.js <resume-id>
```

### 对比两台机器的输出

查看：
1. **环境变量差异**
   - NEXTAUTH_URL是否正确
   - DATABASE_URL是否相同

2. **页面结构差异**
   - 两边的截图是否一致
   - 控制台日志是否有错误

3. **PDF大小差异**
   - 正常PDF应该 > 20KB
   - 空白PDF通常 < 5KB

---

## 第五步：检查服务器日志

### 启动应用时查看日志

```bash
pnpm dev
# 或
pnpm start
```

### 导出PDF时查看日志

在浏览器中尝试导出PDF，同时观察服务器终端输出。

查找以下信息：
- `Navigating to: ...` - 确认访问的URL
- `Page title: ...` - 页面标题
- `Body text length: ...` - 内容长度
- `Page structure: ...` - 页面结构检查
- 任何错误或警告信息

---

## 常见问题和解决方案

### 问题1：PDF是空白的但没有错误

**可能原因：** 字体未加载或页面渲染超时

**解决方案：**
1. 检查Mac mini的网络连接
2. 确认能访问 `fonts.googleapis.com`
3. 尝试增加等待时间：

```typescript
// 在 app/api/export/route.ts 中
await new Promise((resolve) => setTimeout(resolve, 5000)); // 从2000改为5000
```

### 问题2：找不到简历数据

**可能原因：** 数据库连接失败

**解决方案：**
1. 检查 `DATABASE_URL` 配置
2. 确认Mac mini能连接到数据库
3. 测试数据库连接：

```bash
psql "$DATABASE_URL"
```

### 问题3：NEXTAUTH_URL错误

**症状：** 页面无法加载或返回404

**解决方案：**
确保 NEXTAUTH_URL 格式正确：
```env
# 使用IP地址
NEXTAUTH_URL=http://192.168.1.100:3100

# 或使用域名
NEXTAUTH_URL=https://parallel-resume.terriszhao.men
```

### 问题4：Chromium启动失败

**症状：** 报错 "Failed to launch chrome"

**解决方案：**
```bash
# 重新安装 Chromium
npx puppeteer browsers install chrome

# 检查系统依赖（macOS通常不需要额外依赖）
# 确认有足够的磁盘空间和内存
```

### 问题5：页面渲染超时

**症状：** "Ready signal timeout" 或 "Font loading timeout"

**解决方案：**
1. 检查网络连接（Google Fonts）
2. 增加超时时间
3. 检查Mac mini的系统资源（CPU、内存）

---

## 调试技巧

### 1. 启用详细日志

服务器日志已经包含详细信息。查看：
- 页面标题
- 内容长度
- 页面结构
- 控制台消息

### 2. 生成截图对比

运行测试脚本会自动生成截图，对比两台机器的截图：
```bash
# 工作机器
node scripts/test-pdf-generation.js 1

# Mac mini
node scripts/test-pdf-generation.js 1

# 对比两个 test-resume-1-screenshot.png
```

### 3. 直接访问打印页面

在浏览器中访问：
```
http://your-mac-mini-ip:3100/resume/print/1
```

查看页面是否正确显示。

### 4. 检查网络请求

在浏览器开发者工具中：
1. 打开 Network 标签
2. 访问打印页面
3. 检查是否有失败的请求（特别是Google Fonts）

---

## 快速修复建议

### 方案1：使用本地字体（推荐）

如果Google Fonts无法访问，修改 `app/resume/print/[id]/page.tsx`：

```typescript
// 移除Google Fonts链接，使用系统字体
// 删除：
<link
  href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC..."
  rel="stylesheet"
/>

// 字体样式保持不变，会自动fallback到系统字体
```

### 方案2：增加等待时间

在 `app/api/export/route.ts` 中：

```typescript
// 增加超时时间
await page.waitForFunction(/* ... */, { timeout: 15000 }); // 从8000改为15000

// 增加额外延迟
await new Promise((resolve) => setTimeout(resolve, 5000)); // 从2000改为5000
```

### 方案3：禁用字体等待

如果字体不重要，可以移除字体等待逻辑：

```typescript
// 注释掉字体等待部分
// try {
//   await page.waitForFunction(/* fonts */, { timeout: 8000 });
// } catch (error) {
//   console.log("Font loading timeout");
// }
```

---

## 联系支持

如果以上步骤都无法解决问题，请提供：

1. **诊断脚本输出**
   ```bash
   node scripts/test-puppeteer.js > puppeteer-test.log 2>&1
   node scripts/test-pdf-generation.js 1 > pdf-test.log 2>&1
   ```

2. **服务器日志**（导出PDF时的完整输出）

3. **截图文件**（工作机器和Mac mini的对比）

4. **环境信息**
   - macOS版本
   - Node.js版本
   - 网络环境（是否能访问Google服务）

---

## 总结

最常见的问题通常是：

1. ✅ **NEXTAUTH_URL 配置错误** - 最常见！
2. ✅ **Chromium 未正确安装**
3. ✅ **数据库连接失败**
4. ✅ **Google Fonts 无法访问**

按照上述步骤，大多数问题都能快速定位和解决。