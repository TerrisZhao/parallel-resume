import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and, asc } from "drizzle-orm";

import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db/drizzle";
import { interviewSpecificPreparations, interviews } from "@/lib/db/schema";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const interviewId = parseInt(id);

    // Verify interview ownership
    const interview = await db
      .select()
      .from(interviews)
      .where(
        and(
          eq(interviews.id, interviewId),
          eq(interviews.userId, (session.user as any).id),
        ),
      )
      .limit(1);

    if (interview.length === 0) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 },
      );
    }

    const preparations = await db
      .select()
      .from(interviewSpecificPreparations)
      .where(eq(interviewSpecificPreparations.interviewId, interviewId))
      .orderBy(asc(interviewSpecificPreparations.order));

    return NextResponse.json({ preparations });
  } catch (error) {
    console.error("Error fetching interview preparations:", error);

    return NextResponse.json(
      { error: "Failed to fetch preparations" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const interviewId = parseInt(id);

    // Verify interview ownership
    const interview = await db
      .select()
      .from(interviews)
      .where(
        and(
          eq(interviews.id, interviewId),
          eq(interviews.userId, (session.user as any).id),
        ),
      )
      .limit(1);

    if (interview.length === 0) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { title, content, order = 0 } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const [preparation] = await db
      .insert(interviewSpecificPreparations)
      .values({
        interviewId,
        title,
        content,
        order,
      })
      .returning();

    return NextResponse.json({ preparation }, { status: 201 });
  } catch (error) {
    console.error("Error creating interview preparation:", error);

    return NextResponse.json(
      { error: "Failed to create preparation" },
      { status: 500 },
    );
  }
}
