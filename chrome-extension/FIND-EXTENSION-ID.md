# 如何修复 redirect_uri_mismatch 错误

## 问题原因

Chrome 扩展的重定向 URI 必须在 Google Cloud Console 中配置才能使用 OAuth 登录。

## 解决步骤

### 步骤 1: 获取扩展 ID

**方法 A - 通过扩展页面:**
1. 打开 Chrome，在地址栏输入: `chrome://extensions/`
2. 确保右上角的"开发者模式"已开启
3. 找到 "Parallel Resume - Smart Auto-fill"
4. 复制显示的 **ID**（32个字符）

**方法 B - 通过控制台:**
1. 点击扩展图标打开 popup
2. 右键点击 popup 页面 → 选择"检查"
3. 在控制台运行: `chrome.runtime.id`
4. 复制返回的 ID

### 步骤 2: 构建重定向 URI

使用你的扩展 ID 构建 URI：

```
https://你的扩展ID.chromiumapp.org/
```

**重要:** 必须以 `/` 结尾！

**示例:**
```
https://abcdefghijklmnopqrstuvwxyz123456.chromiumapp.org/
```

### 步骤 3: 在 Google Cloud Console 添加

1. 访问: https://console.cloud.google.com/apis/credentials
2. 找到 OAuth 客户端: `852912293818-5lnjv4abpq0ls8gjdml5evb2vfag061p`
3. 点击编辑（铅笔图标）
4. 滚动到 **"已获授权的重定向 URI"**
5. 点击 **"+ 添加 URI"**
6. 粘贴构建的 URI（步骤 2）
7. 点击 **"保存"**

### 步骤 4: 测试

1. 等待 5-10 秒让 Google 更新配置
2. 在 Chrome 扩展页面重新加载扩展
3. 点击扩展图标
4. 点击"使用 Google 登录"
5. 应该能成功打开 Google 登录页面

## 常见错误

### ❌ 忘记添加结尾的斜杠
```
https://xxx.chromiumapp.org   ← 错误
https://xxx.chromiumapp.org/  ← 正确
```

### ❌ 扩展 ID 复制错误
- 确保没有空格
- 确保是完整的 32 个字符
- 区分大小写

### ❌ 配置未生效
- 等待几分钟
- 清除浏览器缓存
- 重新加载扩展

## 验证配置

在 Google Cloud Console，你的 OAuth 客户端应该有以下重定向 URI：

```
✅ https://你的扩展ID.chromiumapp.org/
✅ http://localhost:3100
✅ http://localhost:3100/api/auth/callback/google
✅ 其他现有的 URI...
```
