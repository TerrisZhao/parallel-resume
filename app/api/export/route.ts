import { NextRequest, NextResponse } from "next/server";
import puppeteer, { Browser } from "puppeteer";
import { eq, asc } from "drizzle-orm";

import { db } from "@/lib/db/drizzle";
import {
  resumes,
  resumeWorkExperiences,
  resumeEducation,
  resumeProjects,
} from "@/lib/db/schema";
import { uploadToR2 } from "@/lib/utils/r2-client";

// Helper function to format resume as TXT
async function handleTxtExport(resumeId: string, language: string) {
  try {
    // Fetch resume data from database
    const [resume] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.id, Number(resumeId)));

    if (!resume) {
      return NextResponse.json(
        { error: "Resume not found" },
        { status: 404 },
      );
    }

    // Fetch related data from associated tables
    const workExperience = await db
      .select()
      .from(resumeWorkExperiences)
      .where(eq(resumeWorkExperiences.resumeId, Number(resumeId)))
      .orderBy(asc(resumeWorkExperiences.order));

    const education = await db
      .select()
      .from(resumeEducation)
      .where(eq(resumeEducation.resumeId, Number(resumeId)))
      .orderBy(asc(resumeEducation.order));

    const projects = await db
      .select()
      .from(resumeProjects)
      .where(eq(resumeProjects.resumeId, Number(resumeId)))
      .orderBy(asc(resumeProjects.order));

    // Assemble full resume data
    const fullResumeData = {
      ...resume,
      workExperience,
      education,
      projects,
    };

    // Format resume data as plain text
    const txtContent = formatResumeAsTxt(fullResumeData, language);

    // Get resume name for filename (use resume name, not fullName)
    const resumeName = resume.name || "Resume";
    const fileName = `${resumeName.replace(/\s+/g, "_")}_Resume.txt`;

    // Return TXT file
    return new NextResponse(txtContent, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("TXT generation error:", error);

    return NextResponse.json(
      {
        error: "Failed to generate TXT",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

// Format resume data as plain text
function formatResumeAsTxt(resume: any, language: string): string {
  const isZh = language === "zh";
  const lines: string[] = [];

  // Helper to add section header
  const addSection = (title: string) => {
    lines.push("");
    lines.push("=".repeat(60));
    lines.push(title);
    lines.push("=".repeat(60));
  };

  // Header - Contact Information
  if (resume.fullName) {
    lines.push(resume.fullName.toUpperCase());
    lines.push("");
  }

  const contactInfo: string[] = [];

  if (resume.phone) contactInfo.push(resume.phone);
  if (resume.email) contactInfo.push(resume.email);
  if (resume.location) contactInfo.push(resume.location);

  if (contactInfo.length > 0) {
    lines.push(contactInfo.join(" | "));
  }

  const links: string[] = [];

  if (resume.linkedin) links.push(`LinkedIn: ${resume.linkedin}`);
  if (resume.github) links.push(`GitHub: ${resume.github}`);
  if (resume.website) links.push(`Website: ${resume.website}`);

  if (links.length > 0) {
    lines.push(links.join(" | "));
  }

  // Summary
  if (resume.summary) {
    addSection(isZh ? "个人简介" : "SUMMARY");
    lines.push(resume.summary);
  }

  // Key Skills
  if (resume.keySkills && Array.isArray(resume.keySkills) && resume.keySkills.length > 0) {
    addSection(isZh ? "核心技能" : "KEY SKILLS");
    
    // Check if it's a simple string array or grouped format
    if (typeof resume.keySkills[0] === "string") {
      // Simple format: ["skill1", "skill2", ...]
      lines.push(resume.keySkills.join(", "));
    } else if (resume.keySkillsSingleLine) {
      // Grouped format with single line display: one skill per line
      resume.keySkills.forEach((group: any) => {
        if (group && group.groupName && Array.isArray(group.skills)) {
          lines.push(`${group.groupName}:`);
          group.skills.forEach((skill: string) => {
            lines.push(`  • ${skill}`);
          });
        }
      });
    } else {
      // Grouped format - original display: [{groupName: "...", skills: [...]}, ...]
      resume.keySkills.forEach((group: any) => {
        if (group && group.groupName && Array.isArray(group.skills)) {
          lines.push(`${group.groupName}: ${group.skills.join(", ")}`);
        }
      });
    }
  }

  // Work Experience
  if (resume.workExperience && Array.isArray(resume.workExperience) && resume.workExperience.length > 0) {
    addSection(isZh ? "工作经历" : "WORK EXPERIENCE");
    resume.workExperience.forEach((exp: any) => {
      lines.push("");
      
      if (exp.position && exp.company) {
        lines.push(`${exp.position} - ${exp.company}`);
      } else if (exp.position) {
        lines.push(exp.position);
      } else if (exp.company) {
        lines.push(exp.company);
      }
      
      if (exp.startDate) {
        const endDate = exp.current
          ? isZh
            ? "至今"
            : "Present"
          : exp.endDate || "";

        lines.push(`${exp.startDate} - ${endDate}`);
      }

      if (exp.description) {
        lines.push(exp.description);
      }

      // Handle responsibilities (JSON array)
      if (exp.responsibilities && Array.isArray(exp.responsibilities) && exp.responsibilities.length > 0) {
        exp.responsibilities.forEach((resp: string) => {
          if (resp && typeof resp === "string") {
            lines.push(`  • ${resp}`);
          }
        });
      }
    });
  }

  // Education
  if (resume.education && Array.isArray(resume.education) && resume.education.length > 0) {
    addSection(isZh ? "教育背景" : "EDUCATION");
    resume.education.forEach((edu: any) => {
      lines.push("");
      
      if (edu.school) {
        lines.push(edu.school);
      }
      
      const degreeInfo = [edu.degree, edu.major].filter(Boolean).join(
        isZh ? " " : " in ",
      );

      if (degreeInfo) {
        lines.push(degreeInfo);
      }
      
      if (edu.startDate) {
        const endDate = edu.current
          ? isZh
            ? "至今"
            : "Present"
          : edu.endDate || "";

        lines.push(`${edu.startDate} - ${endDate}`);
      }

      if (edu.gpa) {
        lines.push(`GPA: ${edu.gpa}`);
      }
    });
  }

  // Projects
  if (resume.projects && Array.isArray(resume.projects) && resume.projects.length > 0) {
    addSection(isZh ? "项目经历" : "PROJECTS");
    resume.projects.forEach((proj: any) => {
      lines.push("");
      
      if (proj.name) {
        lines.push(`${proj.name}${proj.role ? ` - ${proj.role}` : ""}`);
      }
      
      if (proj.startDate) {
        const endDate = proj.current
          ? isZh
            ? "至今"
            : "Present"
          : proj.endDate || "";

        lines.push(`${proj.startDate} - ${endDate}`);
      }

      if (proj.description) {
        lines.push(proj.description);
      }

      // Handle technologies (JSON array)
      if (proj.technologies && Array.isArray(proj.technologies) && proj.technologies.length > 0) {
        const techList = proj.technologies.filter((tech: any) => tech && typeof tech === "string");
        
        if (techList.length > 0) {
          lines.push(
            `${isZh ? "技术栈" : "Technologies"}: ${techList.join(", ")}`,
          );
        }
      }
    });
  }

  // Additional Information
  if (resume.additionalInfo) {
    addSection(isZh ? "附加信息" : "ADDITIONAL INFORMATION");
    lines.push(resume.additionalInfo);
  }

  lines.push("");
  lines.push("");

  return lines.join("\n");
}

// Puppeteer configuration for different environments
function getBrowserConfig() {
  const isDev = process.env.NODE_ENV === "development";
  const isVercel = !!process.env.VERCEL;

  // Base configuration
  const config: any = {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
      "--disable-software-rasterizer",
    ],
  };

  // Vercel/Production: Use chromium from puppeteer
  if (isVercel) {
    // Vercel Edge Functions don't support Puppeteer well
    // For Vercel, you might need to use @sparticuz/chromium or similar
    console.log("Running on Vercel - using default Chromium");
  }

  // Local development on macOS
  if (isDev && process.platform === "darwin") {
    console.log("Running on macOS - using bundled Chromium");
  }

  // Linux (Docker, Railway, Render, etc.)
  if (process.platform === "linux") {
    console.log(
      "Running on Linux - using bundled Chromium with additional flags",
    );
    config.args.push("--single-process"); // Helpful in containerized environments
  }

  return config;
}

// Cache browser instance for better performance
let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  const config = getBrowserConfig();

  browserInstance = await puppeteer.launch(config);

  return browserInstance;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const resumeId = searchParams.get("id");
  const themeColor = searchParams.get("themeColor");
  const language = searchParams.get("language") || "en";
  const format = searchParams.get("format") || "pdf";

  if (!resumeId) {
    return NextResponse.json(
      { error: "Resume ID is required" },
      { status: 400 },
    );
  }

  // Handle TXT format export
  if (format === "txt") {
    return handleTxtExport(resumeId, language);
  }

  // Fetch resume once and reuse for cache + filename
  const [resume] = await db
    .select()
    .from(resumes)
    .where(eq(resumes.id, Number(resumeId)));

  if (!resume) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  }

  const resumeNameForFile = resume.name || "Resume";
  const pdfFileName = `${resumeNameForFile.replace(/\s+/g, "_")}_Resume.pdf`;

  try {
    // Check if PDF is cached and up-to-date
    // PDF is valid if:
    // 1. pdfUrl exists
    // 2. pdfGeneratedAt exists
    // 3. pdfGeneratedAt >= updatedAt (PDF was generated after last resume update)
    const isPdfCached =
      resume.pdfUrl &&
      resume.pdfGeneratedAt &&
      resume.pdfGeneratedAt >= resume.updatedAt;

    if (isPdfCached && resume.pdfUrl) {
      console.log(`Using cached PDF for resume ${resumeId}: ${resume.pdfUrl}`);
      console.log(
        `Cached PDF filename: ${pdfFileName} (resume name: ${resume.name})`,
      );

      // Return PDF URL as external link with filename
      return NextResponse.json(
        {
          url: resume.pdfUrl,
          filename: pdfFileName,
          cached: true,
        },
        { status: 200 },
      );
    }

    console.log(
      `Generating new PDF for resume ${resumeId} (last update: ${resume.updatedAt}, last PDF: ${resume.pdfGeneratedAt})`,
    );
  } catch (error) {
    console.error("Error checking PDF cache:", error);
    // Continue to generate PDF even if cache check fails
  }

  let browser: Browser | null = null;

  try {
    // Get or create browser instance
    browser = await getBrowser();

    // Create a new page
    const page = await browser.newPage();

    // Disable JavaScript to avoid React hydration errors
    // PDF generation only needs rendered HTML/CSS, not client-side JS
    await page.setJavaScriptEnabled(false);

    // Capture console messages and errors from the page (for debugging)
    const pageErrors: string[] = [];
    const pageConsole: string[] = [];

    page.on("console", (msg) => {
      const text = msg.text();

      pageConsole.push(`[${msg.type()}] ${text}`);
      if (msg.type() === "error") {
        pageErrors.push(text);
      }
    });

    page.on("pageerror", (error) => {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      pageErrors.push(`Page error: ${errorMessage}`);
      console.error("Page JavaScript error:", errorMessage);
    });

    // Set viewport to A4 size
    await page.setViewport({
      width: 794, // A4 width in pixels at 96 DPI
      height: 1123, // A4 height in pixels at 96 DPI
      deviceScaleFactor: 2, // Higher quality rendering
    });

    // Build print page URL
    // Use internal URL if available (for better performance), otherwise use NEXTAUTH_URL
    const baseUrl = process.env.INTERNAL_URL || process.env.NEXTAUTH_URL;
    const printUrl = new URL(`/resume/print/${resumeId}`, baseUrl);

    if (themeColor) {
      printUrl.searchParams.set("themeColor", themeColor);
    }
    printUrl.searchParams.set("language", language);
    // Mark this as PDF generation request to bypass browser access check
    printUrl.searchParams.set("_pdf", "true");

    console.log(`Navigating to: ${printUrl.toString()}`);

    // Navigate to the print page
    await page.goto(printUrl.toString(), {
      waitUntil: ["networkidle0", "domcontentloaded"],
      timeout: 30000,
    });

    // Since JavaScript is disabled, we don't need to wait for JS-based signals
    // Just wait for network idle and give fonts time to load
    console.log("Waiting for fonts to load...");

    // Wait a bit for fonts to load (they're loaded via CSS, not JS)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check if the page contains an error message
    const pageTitle = await page.title();
    const bodyText = await page.evaluate(() => document.body.innerText);

    console.log("Page title:", pageTitle);
    console.log("Body text length:", bodyText.length, "characters");
    console.log("Body text preview:", bodyText.substring(0, 200));
    console.log("Page console logs:", pageConsole.slice(0, 10)); // Log first 10 console messages

    // Check page structure
    const pageStructure = await page.evaluate(() => {
      const header = document.querySelector(".header");
      const name = document.querySelector(".name");
      const sections = document.querySelectorAll(".section");

      return {
        hasHeader: !!header,
        hasName: !!name,
        nameText: name ? name.textContent : "",
        sectionCount: sections.length,
        bodyOpacity: window.getComputedStyle(document.body).opacity,
      };
    });

    console.log("Page structure:", pageStructure);

    if (
      pageTitle.includes("Not Found") ||
      bodyText.includes("Resume not found")
    ) {
      console.error("Page shows error:", bodyText.substring(0, 200));
      throw new Error("Resume not found on page");
    }

    if (!pageStructure.hasHeader || !pageStructure.hasName) {
      console.warn(
        "⚠️  Page structure seems incomplete - content may be missing",
      );
    }

    if (pageErrors.length > 0) {
      console.error("Page console errors:", pageErrors);
    }

    console.log("Generating PDF...");

    // Generate PDF
    console.log("📄 Generating PDF...");
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "12mm",
        right: "12mm",
        bottom: "12mm",
        left: "12mm",
      },
      displayHeaderFooter: false,
      preferCSSPageSize: false,
      omitBackground: false, // Ensure background is included
    });

    // Close the page
    await page.close();

    // Get resume name for filename
    const fileName = pdfFileName;
    console.log(`New PDF filename: ${fileName} (resume name: ${resume.name})`);

    // Upload PDF to R2 and update database
    let pdfUrl: string | null = null;
    try {
      const timestamp = Date.now();
      const objectKey = `resumes/${resumeId}/resume_${timestamp}.pdf`;
      const uploadResult = await uploadToR2(
        objectKey,
        Buffer.from(pdf),
        "application/pdf",
        fileName,
      );

      if (uploadResult.success && uploadResult.url) {
        pdfUrl = uploadResult.url;
        console.log(`PDF uploaded successfully: ${pdfUrl}`);
        // Update database with PDF URL and generation timestamp
        await db
          .update(resumes)
          .set({
            pdfUrl: uploadResult.url,
            pdfGeneratedAt: new Date(),
          })
          .where(eq(resumes.id, Number(resumeId)));

        console.log(`Database updated with PDF URL for resume ${resumeId}`);
      } else {
        console.error("Failed to upload PDF to R2:", uploadResult.error);
        throw new Error("Failed to upload PDF to R2");
      }
    } catch (error) {
      console.error("Error uploading PDF to R2:", error);
      // If upload fails, we cannot return external link, so return error
      throw new Error("Failed to upload PDF to storage");
    }

    // Return PDF URL as external link
    if (!pdfUrl) {
      throw new Error("PDF URL is not available");
    }

    return NextResponse.json(
      {
        url: pdfUrl,
        filename: fileName,
        cached: false,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("PDF generation error:", error);

    // Close browser on error
    if (browser) {
      try {
        await browser.close();
        browserInstance = null;
      } catch (closeError) {
        console.error("Error closing browser:", closeError);
      }
    }

    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

// Optional: Add a cleanup endpoint or periodic cleanup
// For serverless environments, the browser will be cleaned up automatically
// For long-running servers, you might want to implement browser instance management
