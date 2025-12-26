import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and, desc } from "drizzle-orm";

import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db/drizzle";
import { interviews, resumes } from "@/lib/db/schema";

// GET /api/interviews - Get all interviews for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userInterviews = await db
      .select({
        id: interviews.id,
        company: interviews.company,
        type: interviews.type,
        location: interviews.location,
        videoLink: interviews.videoLink,
        resumeId: interviews.resumeId,
        resumeName: resumes.name,
        interviewTime: interviews.interviewTime,
        stage: interviews.stage,
        notes: interviews.notes,
        createdAt: interviews.createdAt,
        updatedAt: interviews.updatedAt,
      })
      .from(interviews)
      .leftJoin(resumes, eq(interviews.resumeId, resumes.id))
      .where(eq(interviews.userId, (session.user as any).id))
      .orderBy(desc(interviews.interviewTime));

    return NextResponse.json({ interviews: userInterviews });
  } catch (error) {
    console.error("Error fetching interviews:", error);

    return NextResponse.json(
      { error: "Failed to fetch interviews" },
      { status: 500 },
    );
  }
}

// POST /api/interviews - Create a new interview
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      company,
      type,
      location,
      videoLink,
      resumeId,
      interviewTime,
      stage,
      notes,
    } = body;

    if (!company || !type || !interviewTime || !stage) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

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

    const [newInterview] = await db
      .insert(interviews)
      .values({
        userId: (session.user as any).id,
        company,
        type,
        location: location || null,
        videoLink: videoLink || null,
        resumeId: resumeId || null,
        interviewTime: new Date(interviewTime),
        stage,
        notes: notes || null,
      })
      .returning();

    return NextResponse.json({ interview: newInterview }, { status: 201 });
  } catch (error) {
    console.error("Error creating interview:", error);

    return NextResponse.json(
      { error: "Failed to create interview" },
      { status: 500 },
    );
  }
}
