import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and } from "drizzle-orm";

import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db/drizzle";
import { interviews, resumes } from "@/lib/db/schema";

// GET /api/interviews/[id] - Get a specific interview
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const interview = await db
      .select({
        id: interviews.id,
        company: interviews.company,
        type: interviews.type,
        location: interviews.location,
        videoLink: interviews.videoLink,
        resumeId: interviews.resumeId,
        resumeName: resumes.name,
        interviewTime: interviews.interviewTime,
        duration: interviews.duration,
        stage: interviews.stage,
        notes: interviews.notes,
        jobDescription: interviews.jobDescription,
        coverLetter: interviews.coverLetter,
        createdAt: interviews.createdAt,
        updatedAt: interviews.updatedAt,
      })
      .from(interviews)
      .leftJoin(resumes, eq(interviews.resumeId, resumes.id))
      .where(
        and(
          eq(interviews.id, parseInt(id)),
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

    return NextResponse.json({ interview: interview[0] });
  } catch (error) {
    console.error("Error fetching interview:", error);

    return NextResponse.json(
      { error: "Failed to fetch interview" },
      { status: 500 },
    );
  }
}

// PUT /api/interviews/[id] - Update an interview
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if interview exists and belongs to user
    const existing = await db
      .select()
      .from(interviews)
      .where(
        and(
          eq(interviews.id, parseInt(id)),
          eq(interviews.userId, (session.user as any).id),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const {
      company,
      type,
      location,
      videoLink,
      resumeId,
      interviewTime,
      duration,
      stage,
      notes,
      jobDescription,
      coverLetter,
    } = body;

    // Verify resume belongs to user if resumeId is provided
    if (resumeId) {
      const resume = await db
        .select()
        .from(resumes)
        .where(
          and(
            eq(resumes.id, resumeId),
            eq(resumes.userId, (session.user as any).id),
          ),
        )
        .limit(1);

      if (resume.length === 0) {
        return NextResponse.json(
          { error: "Resume not found or unauthorized" },
          { status: 404 },
        );
      }
    }

    const [updatedInterview] = await db
      .update(interviews)
      .set({
        company: company || existing[0].company,
        type: type || existing[0].type,
        location: location !== undefined ? location : existing[0].location,
        videoLink: videoLink !== undefined ? videoLink : existing[0].videoLink,
        resumeId: resumeId !== undefined ? resumeId : existing[0].resumeId,
        interviewTime:
          interviewTime !== undefined
            ? interviewTime
              ? new Date(interviewTime)
              : null
            : existing[0].interviewTime,
        duration: duration !== undefined ? duration : existing[0].duration,
        stage: stage || existing[0].stage,
        notes: notes !== undefined ? notes : existing[0].notes,
        jobDescription:
          jobDescription !== undefined
            ? jobDescription
            : existing[0].jobDescription,
        coverLetter:
          coverLetter !== undefined ? coverLetter : existing[0].coverLetter,
        updatedAt: new Date(),
      })
      .where(eq(interviews.id, parseInt(id)))
      .returning();

    return NextResponse.json({ interview: updatedInterview });
  } catch (error) {
    console.error("Error updating interview:", error);

    return NextResponse.json(
      { error: "Failed to update interview" },
      { status: 500 },
    );
  }
}

// DELETE /api/interviews/[id] - Delete an interview
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if interview exists and belongs to user
    const existing = await db
      .select()
      .from(interviews)
      .where(
        and(
          eq(interviews.id, parseInt(id)),
          eq(interviews.userId, (session.user as any).id),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Interview not found" },
        { status: 404 },
      );
    }

    await db.delete(interviews).where(eq(interviews.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting interview:", error);

    return NextResponse.json(
      { error: "Failed to delete interview" },
      { status: 500 },
    );
  }
}
