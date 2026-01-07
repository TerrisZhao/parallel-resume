import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and, asc } from "drizzle-orm";

import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db/drizzle";
import { interviewPreparationMaterials } from "@/lib/db/schema";

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

    const [material] = await db
      .insert(interviewPreparationMaterials)
      .values({
        userId: (session.user as any).id,
        title,
        category,
        content,
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
