import crypto from "crypto";

/**
 * 加密配置
 * 使用环境变量中的密钥进行加密
 */
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32字节的密钥（64个十六进制字符）
const ALGORITHM = "aes-256-gcm";

/**
 * 加密API Key
 * @param apiKey 原始API Key
 * @returns 加密后的字符串 (格式: iv:authTag:encryptedData)
 */
export function encryptApiKey(apiKey: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }

  if (ENCRYPTION_KEY.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be 64 hexadecimal characters (32 bytes)",
    );
  }

  // 生成随机IV (初始化向量)
  const iv = crypto.randomBytes(16);

  // 创建加密器
  const key = Buffer.from(ENCRYPTION_KEY, "hex");
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    key as unknown as crypto.CipherKey,
    iv as unknown as crypto.BinaryLike,
  );

  // 加密数据
  let encrypted = cipher.update(apiKey, "utf8", "hex");

  encrypted += cipher.final("hex");

  // 获取认证标签
  const authTag = cipher.getAuthTag();

  // 返回格式: iv:authTag:encryptedData
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * 解密API Key
 * @param encryptedData 加密的字符串
 * @returns 原始API Key
 */
export function decryptApiKey(encryptedData: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }

  if (ENCRYPTION_KEY.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be 64 hexadecimal characters (32 bytes)",
    );
  }

  try {
    // 解析加密数据
    const parts = encryptedData.split(":");

    if (parts.length !== 3) {
      throw new Error("Invalid encrypted data format");
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    // 创建解密器
    const key = Buffer.from(ENCRYPTION_KEY, "hex");
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key as unknown as crypto.CipherKey,
      iv as unknown as crypto.BinaryLike,
    );

    // 设置认证标签
    decipher.setAuthTag(authTag as unknown as NodeJS.ArrayBufferView);

    // 解密数据
    let decrypted = decipher.update(encrypted, "hex", "utf8");

    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt API key");
  }
}

/**
 * 遮盖API Key用于前端显示
 * @param apiKey 原始API Key
 * @returns 部分遮盖的API Key (如: sk-...xyz123)
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) {
    return "***";
  }

  const prefix = apiKey.substring(0, 3);
  const suffix = apiKey.substring(apiKey.length - 6);

  return `${prefix}...${suffix}`;
}
