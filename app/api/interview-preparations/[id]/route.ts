import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and } from "drizzle-orm";

import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db/drizzle";
import { interviewPreparationMaterials } from "@/lib/db/schema";
import {
  translateChineseToEnglish,
  translateEnglishToChinese,
} from "@/lib/translator/deepl";

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const materialId = parseInt(id);
    const body = await request.json();
    const { title, category, content, order, tags } = body as {
      title?: string;
      category?: string;
      content?: string;
      order?: number;
      tags?: unknown;
    };

    // Verify ownership
    const existing = await db
      .select()
      .from(interviewPreparationMaterials)
      .where(
        and(
          eq(interviewPreparationMaterials.id, materialId),
          eq(interviewPreparationMaterials.userId, (session.user as any).id),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title;
    if (category !== undefined) updateData.category = category;
    if (content !== undefined) {
      updateData.content = content;
      // 如果内容更新了,重新翻译
      const translation = await translateContent(content);

      updateData.translation = translation;
    }
    if (order !== undefined) updateData.order = order;

    if (tags !== undefined) {
      updateData.tags = Array.isArray(tags)
        ? (tags.filter((tag) => typeof tag === "string") as string[])
        : [];
    }

    const [updated] = await db
      .update(interviewPreparationMaterials)
      .set(updateData)
      .where(eq(interviewPreparationMaterials.id, materialId))
      .returning();

    return NextResponse.json({ material: updated });
  } catch (error) {
    console.error("Error updating interview preparation:", error);

    return NextResponse.json(
      { error: "Failed to update preparation" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const materialId = parseInt(id);

    // Verify ownership
    const existing = await db
      .select()
      .from(interviewPreparationMaterials)
      .where(
        and(
          eq(interviewPreparationMaterials.id, materialId),
          eq(interviewPreparationMaterials.userId, (session.user as any).id),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db
      .delete(interviewPreparationMaterials)
      .where(eq(interviewPreparationMaterials.id, materialId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting interview preparation:", error);

    return NextResponse.json(
      { error: "Failed to delete preparation" },
      { status: 500 },
    );
  }
}
