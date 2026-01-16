import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and, asc } from "drizzle-orm";

import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db/drizzle";
import { interviewPreparationMaterials } from "@/lib/db/schema";
import {
  translateChineseToEnglish,
  translateEnglishToChinese,
} from "@/lib/translator/deepl";
import { generateTTS } from "@/lib/tts/generator";

/**
 * 检测文本是否包含中文字符
 */
function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text);
}

/**
 * 翻译内容(中文翻译成英文,英文翻译成中文)
 */
async function translateContent(content: string): Promise<string | null> {
  try {
    if (containsChinese(content)) {
      // 包含中文,翻译成英文
      return await translateChineseToEnglish(content);
    } else {
      // 不包含中文,翻译成中文
      return await translateEnglishToChinese(content);
    }
  } catch (error) {
    console.error("Translation error:", error);
    // 翻译失败时返回 null,不影响主流程
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    // Build query conditions
    const conditions = [
      eq(interviewPreparationMaterials.userId, (session.user as any).id),
    ];

    if (category) {
      conditions.push(eq(interviewPreparationMaterials.category, category));
    }

    const materials = await db
      .select()
      .from(interviewPreparationMaterials)
      .where(and(...conditions))
      .orderBy(asc(interviewPreparationMaterials.order));

    return NextResponse.json({ materials });
  } catch (error) {
    console.error("Error fetching interview preparations:", error);

    return NextResponse.json(
      { error: "Failed to fetch preparations" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      category,
      content,
      order = 0,
      tags,
    } = body as {
      title?: string;
      category?: string;
      content?: string;
      order?: number;
      tags?: unknown;
    };

    if (!title || !category || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const safeTags = Array.isArray(tags)
      ? (tags.filter((tag) => typeof tag === "string") as string[])
      : [];

    // 翻译内容
    const translation = await translateContent(content);

    // 如果内容是英文（不包含中文），生成TTS
    let audioUrl: string | null = null;
    if (!containsChinese(content)) {
      try {
        const ttsResult = await generateTTS(content);
        if (ttsResult.success && ttsResult.url) {
          audioUrl = ttsResult.url;
        }
      } catch (error) {
        console.error("TTS generation error:", error);
        // TTS生成失败不影响主流程
      }
    }

    const [material] = await db
      .insert(interviewPreparationMaterials)
      .values({
        userId: (session.user as any).id,
        title,
        category,
        content,
        translation,
        audioUrl,
        tags: safeTags,
        order,
      })
      .returning();

    return NextResponse.json({ material }, { status: 201 });
  } catch (error) {
    console.error("Error creating interview preparation:", error);

    return NextResponse.json(
      { error: "Failed to create preparation" },
      { status: 500 },
    );
  }
}
