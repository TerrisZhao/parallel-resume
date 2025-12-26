import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and } from "drizzle-orm";

import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db/drizzle";
import { interviewSpecificPreparations, interviews } from "@/lib/db/schema";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; prepId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, prepId: prepIdStr } = await params;
    const interviewId = parseInt(id);
    const prepId = parseInt(prepIdStr);

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

    // Verify preparation exists and belongs to this interview
    const existing = await db
      .select()
      .from(interviewSpecificPreparations)
      .where(
        and(
          eq(interviewSpecificPreparations.id, prepId),
          eq(interviewSpecificPreparations.interviewId, interviewId),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Preparation not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { title, content, order } = body;

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (order !== undefined) updateData.order = order;

    const [updated] = await db
      .update(interviewSpecificPreparations)
      .set(updateData)
      .where(eq(interviewSpecificPreparations.id, prepId))
      .returning();

    return NextResponse.json({ preparation: updated });
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
  { params }: { params: Promise<{ id: string; prepId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, prepId: prepIdStr } = await params;
    const interviewId = parseInt(id);
    const prepId = parseInt(prepIdStr);

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

    // Verify preparation exists and belongs to this interview
    const existing = await db
      .select()
      .from(interviewSpecificPreparations)
      .where(
        and(
          eq(interviewSpecificPreparations.id, prepId),
          eq(interviewSpecificPreparations.interviewId, interviewId),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Preparation not found" },
        { status: 404 },
      );
    }

    await db
      .delete(interviewSpecificPreparations)
      .where(eq(interviewSpecificPreparations.id, prepId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting interview preparation:", error);

    return NextResponse.json(
      { error: "Failed to delete preparation" },
      { status: 500 },
    );
  }
}
