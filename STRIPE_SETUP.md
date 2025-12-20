# Stripe 订阅系统配置指南

本文档说明如何配置 Stripe 支付系统以启用订阅和积分充值功能。

## 1. 注册 Stripe 账号

1. 访问 [Stripe](https://stripe.com) 并注册账号
2. 完成账号验证（测试模式可以跳过）
3. 进入开发者面板获取 API 密钥

## 2. 获取 API 密钥

在 Stripe Dashboard 中:
1. 点击右上角的"开发者" (Developers)
2. 选择"API 密钥" (API keys)
3. 复制以下密钥:
   - **可发布密钥** (Publishable key) - 用于前端
   - **密钥** (Secret key) - 用于后端

## 3. 创建产品和价格

### 3.1 创建积分充值产品

在 Stripe Dashboard 中:
1. 进入"产品目录" (Product catalog)
2. 点击"添加产品" (Add product)
3. 创建以下产品:

#### 积分充值包 - 100积分
- 名称: `100 Credits Pack`
- 描述: `Get 100 credits for AI resume optimization`
- 价格: `$9.99`
- 计费模式: `一次性` (One-time)
- 复制生成的 **Price ID** (类似 `price_xxxxxxxxxxxxx`)

#### 积分充值包 - 500积分 (可选)
- 名称: `500 Credits Pack`
- 描述: `Get 500 credits with better value`
- 价格: `$39.99`
- 计费模式: `一次性` (One-time)
- 复制生成的 **Price ID**

### 3.2 创建订阅产品

#### 专业版 - 月付
- 名称: `Pro Plan - Monthly`
- 描述: `Unlimited AI optimization and premium features`
- 价格: `$19.99`
- 计费模式: `按月循环` (Recurring - Monthly)
- 复制生成的 **Price ID**

#### 专业版 - 年付 (可选)
- 名称: `Pro Plan - Yearly`
- 描述: `Unlimited features with 20% discount`
- 价格: `$199.99`
- 计费模式: `按年循环` (Recurring - Yearly)
- 复制生成的 **Price ID**

## 4. 配置 Webhook

Webhook 用于接收 Stripe 的支付和订阅事件通知。

### 4.1 创建 Webhook Endpoint

1. 在 Stripe Dashboard 中进入"开发者" > "Webhooks"
2. 点击"添加端点" (Add endpoint)
3. 填写以下信息:
   - **端点 URL**: `https://your-domain.com/api/subscription/webhook`
   - 对于本地开发: 使用 Stripe CLI (见下文)
4. 选择要监听的事件:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. 点击"添加端点"
6. 复制生成的 **Webhook 签名密钥** (Signing secret)

### 4.2 本地开发使用 Stripe CLI

对于本地开发，使用 Stripe CLI 转发 webhook:

```bash
# 安装 Stripe CLI
# macOS
brew install stripe/stripe-cli/stripe

# 其他系统见: https://stripe.com/docs/stripe-cli

# 登录
stripe login

# 转发 webhook 到本地
stripe listen --forward-to localhost:3100/api/subscription/webhook

# CLI 会显示 webhook 签名密钥，添加到 .env.local
```

## 5. 配置环境变量

在项目根目录的 `.env` 或 `.env.local` 文件中添加以下变量:

```bash
# Stripe API 密钥
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Stripe Webhook 签名密钥
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Stripe Price IDs (从上面创建的产品中获取)
STRIPE_PRICE_CREDITS_100=price_xxxxxxxxxxxxx
STRIPE_PRICE_CREDITS_500=price_xxxxxxxxxxxxx
STRIPE_PRICE_PRO_MONTHLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_PRO_YEARLY=price_xxxxxxxxxxxxx
```

## 6. 测试配置

### 6.1 测试卡号

在测试模式下，使用以下测试卡号:

- **成功支付**: `4242 4242 4242 4242`
- **需要验证**: `4000 0025 0000 3155`
- **失败支付**: `4000 0000 0000 9995`

所有测试卡:
- 有效期: 任何未来日期
- CVC: 任意3位数字
- 邮编: 任意邮编

### 6.2 测试流程

1. 启动应用: `pnpm dev`
2. 登录账号
3. 访问订阅页面: `http://localhost:3100/subscription`
4. 选择一个套餐
5. 使用测试卡号完成支付
6. 检查:
   - 积分是否正确添加
   - 订阅状态是否更新
   - Webhook 事件是否正确处理

## 7. 生产环境部署

### 7.1 切换到生产模式

1. 在 Stripe Dashboard 右上角关闭"测试模式"
2. 重新获取生产环境的 API 密钥和 Price IDs
3. 更新环境变量为生产密钥
4. 配置生产环境的 Webhook URL

### 7.2 重要提醒

- ⚠️ **永远不要**将密钥提交到代码仓库
- ⚠️ **使用** `.env.local` 存储本地密钥
- ⚠️ **在生产环境**使用环境变量管理密钥
- ⚠️ **定期检查** Stripe Dashboard 的安全建议

## 8. 常见问题

### Q: Webhook 没有收到事件？
A: 检查:
1. Webhook URL 是否正确
2. Webhook 签名密钥是否正确
3. 本地开发时是否运行了 `stripe listen`
4. 防火墙是否阻止了请求

### Q: 支付成功但积分没有添加？
A: 检查:
1. Webhook 事件是否正确处理
2. 数据库中的 `payments` 和 `credit_transactions` 表
3. 后端日志中的错误信息

### Q: 如何查看 Webhook 日志？
A:
1. 在 Stripe Dashboard 中进入"开发者" > "Webhooks"
2. 点击具体的 endpoint
3. 查看"事件历史"标签

### Q: 测试时如何模拟订阅续费？
A:
1. 在 Stripe Dashboard 中找到测试订阅
2. 点击"操作" > "更新订阅"
3. 可以手动触发续费事件

## 9. 数据库表说明

订阅系统使用以下数据库表:

- `subscription_plans`: 套餐配置
- `subscriptions`: 用户订阅记录
- `user_credits`: 用户积分余额
- `credit_transactions`: 积分交易记录
- `payments`: 支付记录

所有表在数据库迁移中已自动创建。

## 10. API 端点说明

- `GET /api/subscription/status` - 获取用户订阅状态和积分
- `POST /api/subscription/create-checkout` - 创建 Stripe Checkout 会话
- `POST /api/subscription/webhook` - 接收 Stripe Webhook 事件
- `POST /api/subscription/cancel` - 取消订阅
- `POST /api/subscription/reactivate` - 恢复订阅
- `GET /api/subscription/credit-transactions` - 获取积分交易记录
- `GET /api/subscription/payments` - 获取支付记录

## 11. 支持和文档

- [Stripe 文档](https://stripe.com/docs)
- [Stripe API 参考](https://stripe.com/docs/api)
- [Stripe Webhook 指南](https://stripe.com/docs/webhooks)
- [Stripe 测试卡号](https://stripe.com/docs/testing)

---

配置完成后，您的订阅系统就可以正常工作了！如有问题，请参考 Stripe 文档或联系技术支持。
