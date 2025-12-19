import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db/drizzle";
import { resumes } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

// Function to detect if text contains Chinese characters
function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const resumeId = Number(id);

    // Get the base URL from the request
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const host = request.headers.get("host") || "localhost:3100";
    const baseUrl = `${protocol}://${host}`;

    // Get theme color from query parameters
    const { searchParams } = new URL(request.url);
    const themeColor = searchParams.get("color");

    // Fetch resume data to get language preference
    const [resume] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.id, resumeId));

    // Use saved language preference, or auto-detect as fallback
    let language = "en";
    if (resume) {
      if (resume.preferredLanguage) {
        language = resume.preferredLanguage;
      } else {
        // Fallback: Auto-detect language based on content
        const textToCheck = [
          resume.fullName,
          resume.summary,
          resume.additionalInfo,
        ]
          .filter(Boolean)
          .join(" ");

        if (containsChinese(textToCheck)) {
          language = "zh";
        }
      }
    }

    // URL of the print preview page
    const printUrl = new URL(`${baseUrl}/resume/print/${id}`);
    if (themeColor) {
      printUrl.searchParams.set("themeColor", themeColor);
    }
    printUrl.searchParams.set("language", language);
    // Mark as PDF/thumbnail generation to bypass browser redirect
    printUrl.searchParams.set("_pdf", "true");

    console.log("Generating thumbnail for resume:", id);
    console.log("Detected language:", language);
    console.log("Print URL:", printUrl.toString());

    // Launch puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();

    // Disable JavaScript to avoid React hydration errors
    await page.setJavaScriptEnabled(false);

    // Set viewport to A4 proportions (210mm x 297mm) scaled down
    await page.setViewport({
      width: 794, // A4 width in pixels at 96 DPI (210mm)
      height: 1123, // A4 height in pixels at 96 DPI (297mm)
      deviceScaleFactor: 2, // For better quality
    });

    try {
      // Navigate to the print page
      await page.goto(printUrl.toString(), {
        waitUntil: "networkidle0",
        timeout: 30000,
      });

      // Wait for page to render (no JS signal since JS is disabled)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Take screenshot
      const screenshot = await page.screenshot({
        type: "png",
        fullPage: false,
        optimizeForSpeed: false,
      });

      await browser.close();

      // Return the image
      return new NextResponse(screenshot, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      });
    } catch (error) {
      await browser.close();
      throw error;
    }
  } catch (error) {
    console.error("Error generating thumbnail:", error);

    return NextResponse.json(
      {
        error: "Failed to generate thumbnail",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
