import type { InferSelectModel } from "drizzle-orm";

import { eq } from "drizzle-orm";

import { ResumeData } from "@/types/resume";
import { db } from "@/lib/db/drizzle";
import {
  resumes,
  resumeWorkExperiences,
  resumeEducation,
  resumeProjects,
} from "@/lib/db/schema";
import { Language, getResumeTranslation } from "@/lib/resume-i18n";

type WorkExperience = InferSelectModel<typeof resumeWorkExperiences>;
type Education = InferSelectModel<typeof resumeEducation>;
type Project = InferSelectModel<typeof resumeProjects>;

interface ResumePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ themeColor?: string; language?: string }>;
}

// Simple SVG icon components for print page (to avoid client-side React components)
const Icon = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {children}
  </svg>
);

const MailIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </Icon>
);

const PhoneIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </Icon>
);

const MapPinIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </Icon>
);

const LinkedinIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </Icon>
);

const GithubIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </Icon>
);

const GlobeIcon = ({ className }: { className?: string }) => (
  <Icon className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </Icon>
);

async function getResumeData(
  id: string,
): Promise<(ResumeData & { name?: string }) | null> {
  try {
    const resumeId = Number(id);

    if (isNaN(resumeId)) {
      console.error("Invalid resume ID:", id);

      return null;
    }

    // Query database directly (no authentication needed for print page)
    const [resume] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.id, resumeId));

    if (!resume) {
      console.error("Resume not found:", resumeId);

      return null;
    }

    // Get work experience
    const workExperience = await db
      .select()
      .from(resumeWorkExperiences)
      .where(eq(resumeWorkExperiences.resumeId, resumeId))
      .orderBy(resumeWorkExperiences.order);

    // Get education
    const education = await db
      .select()
      .from(resumeEducation)
      .where(eq(resumeEducation.resumeId, resumeId))
      .orderBy(resumeEducation.order);

    // Get projects
    const projects = await db
      .select()
      .from(resumeProjects)
      .where(eq(resumeProjects.resumeId, resumeId))
      .orderBy(resumeProjects.order);

    // Transform database data to ResumeData format
    return {
      name: resume.name,
      fullName: resume.fullName || "",
      preferredName: resume.preferredName || "",
      phone: resume.phone || "",
      email: resume.email || "",
      location: resume.location || "",
      linkedin: resume.linkedin || "",
      github: resume.github || "",
      website: resume.website || "",
      summary: resume.summary || "",
      keySkills: resume.keySkills || [],
      workExperience: workExperience.map((exp: WorkExperience) => ({
        id: exp.id.toString(),
        company: exp.company,
        position: exp.position,
        startDate: exp.startDate,
        endDate: exp.endDate || undefined,
        current: exp.current,
        responsibilities: exp.responsibilities,
      })),
      education: education.map((edu: Education) => ({
        id: edu.id.toString(),
        school: edu.school,
        degree: edu.degree,
        major: edu.major,
        startDate: edu.startDate,
        endDate: edu.endDate || undefined,
        current: edu.current,
        gpa: edu.gpa || undefined,
      })),
      projects: projects.map((proj: Project) => ({
        id: proj.id.toString(),
        name: proj.name,
        role: proj.role,
        startDate: proj.startDate,
        endDate: proj.endDate || undefined,
        current: proj.current,
        description: proj.description,
        technologies: proj.technologies,
      })),
      additionalInfo: resume.additionalInfo || "",
      themeColor: resume.themeColor || "#000000",
    };
  } catch (error) {
    console.error("Error fetching resume from database:", error);

    return null;
  }
}

// Force dynamic rendering for each request (since we have dynamic params)
export const dynamic = 'force-dynamic';

export default async function PrintResumePage({
  params,
  searchParams,
}: ResumePageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const resumeData = await getResumeData(resolvedParams.id);

  if (!resumeData) {
    return (
      <html lang="en" suppressHydrationWarning>
        <head>
          <title>Resume Not Found</title>
        </head>
        <body suppressHydrationWarning>
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <h1>Resume not found</h1>
          </div>
        </body>
      </html>
    );
  }

  const themeColor =
    resolvedSearchParams.themeColor || resumeData.themeColor || "#000000";
  const language =
    (resolvedSearchParams.language as Language) || "en";
  const t = getResumeTranslation(language);

  return (
    <html lang={language === "zh" ? "zh-CN" : "en"} suppressHydrationWarning>
      <head>
        <title>{`${resumeData.fullName || "Resume"} - Resume`}</title>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&family=Noto+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          html {
            background: white !important;
          }

          body {
            font-family: ${language === "zh"
              ? "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'SimHei', sans-serif"
              : "-apple-system, BlinkMacSystemFont, 'Noto Sans', 'Inter', 'Segoe UI', 'Roboto', sans-serif"};
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            background: white !important;
            color: #000 !important;
            line-height: 1.5;
          }

          /* Wait for fonts to load */
          body {
            opacity: 0;
            animation: fadeIn 0.1s ease-in 0.3s forwards;
          }

          @keyframes fadeIn {
            to { opacity: 1; }
          }

          .resume-container {
            width: 210mm;
            min-height: 297mm;
            padding: 20mm;
            margin: 0 auto;
            background: white;
            border: none;
            box-shadow: none;
          }

          /* Print styles */
          @media print {
            html {
              background: white !important;
            }

            body {
              margin: 0;
              padding: 0;
              opacity: 1 !important;
              background: white !important;
              color: #000 !important;
            }

            .resume-container {
              width: 100%;
              min-height: auto;
              padding: 0;
              margin: 0;
              border: none;
              box-shadow: none;
            }

            @page {
              size: A4;
              margin: 16mm;
              background: white;
            }
          }

          /* Header */
          .header {
            margin-bottom: 24px;
          }

          .name {
            font-size: 24px;
            font-weight: 700;
            color: ${themeColor};
            margin-bottom: 8px;
            line-height: 1.2;
          }

          .preferred-name {
            font-size: 16px;
            font-weight: 400;
            color: #4b5563;
            margin-left: 8px;
          }

          .contact-info {
            display: flex;
            flex-wrap: wrap;
            gap: 8px 16px;
            font-size: 12px;
            color: #374151;
          }

          .contact-item {
            display: flex;
            align-items: center;
            gap: 2px;
          }

          .contact-icon {
            color: ${themeColor};
            flex-shrink: 0;
          }

          /* Section */
          .section {
            margin-bottom: 20px;
          }

          .section-title {
            font-size: 14px;
            font-weight: 700;
            color: ${themeColor};
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 2px solid ${themeColor};
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .section-content {
            font-size: 11px;
            color: #1f2937;
            line-height: 1.6;
          }

          /* Skills */
          .skills-list {
            display: flex;
            flex-wrap: wrap;
            gap: 4px 8px;
          }

          .skill-item::after {
            content: ' •';
            margin-left: 4px;
            color: #9ca3af;
          }

          .skill-item:last-child::after {
            content: '';
          }

          /* Experience / Education / Projects */
          .entry {
            margin-bottom: 16px;
          }

          .entry:last-child {
            margin-bottom: 0;
          }

          .entry-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 4px;
            gap: 16px;
          }

          .entry-title {
            font-size: 12px;
            font-weight: 700;
            color: ${themeColor};
            line-height: 1.3;
          }

          .entry-subtitle {
            font-size: 11px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 4px;
          }

          .entry-date {
            font-size: 11px;
            color: #6b7280;
            white-space: nowrap;
            flex-shrink: 0;
          }

          .entry-description {
            font-size: 11px;
            color: #4b5563;
            margin-bottom: 4px;
          }

          /* Responsibilities / Bullet points */
          .responsibilities {
            list-style-type: disc;
            list-style-position: outside;
            padding-left: 20px;
            margin-top: 6px;
          }

          .responsibilities li {
            font-size: 11px;
            color: #1f2937;
            margin-bottom: 4px;
            line-height: 1.5;
          }

          /* Technologies */
          .technologies {
            font-size: 11px;
            color: #4b5563;
            margin-top: 6px;
          }

          .technologies strong {
            font-weight: 600;
            color: #1f2937;
          }

          /* Whitespace */
          .whitespace-pre-line {
            white-space: pre-line;
          }
        `,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <div className="resume-container">
          {/* Header */}
          <div className="header">
            <h1 className="name">
              {resumeData.fullName || "Your Name"}
              {resumeData.preferredName && (
                <span className="preferred-name">
                  ({resumeData.preferredName})
                </span>
              )}
            </h1>
            <div className="contact-info">
              {resumeData.email && (
                <div className="contact-item">
                  <MailIcon className="contact-icon" />
                  <span>{resumeData.email}</span>
                </div>
              )}
              {resumeData.phone && (
                <div className="contact-item">
                  <PhoneIcon className="contact-icon" />
                  <span>{resumeData.phone}</span>
                </div>
              )}
              {resumeData.location && (
                <div className="contact-item">
                  <MapPinIcon className="contact-icon" />
                  <span>{resumeData.location}</span>
                </div>
              )}
              {resumeData.linkedin && (
                <div className="contact-item">
                  <LinkedinIcon className="contact-icon" />
                  <span>{resumeData.linkedin}</span>
                </div>
              )}
              {resumeData.github && (
                <div className="contact-item">
                  <GithubIcon className="contact-icon" />
                  <span>{resumeData.github}</span>
                </div>
              )}
              {resumeData.website && (
                <div className="contact-item">
                  <GlobeIcon className="contact-icon" />
                  <span>{resumeData.website}</span>
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          {resumeData.summary && (
            <div className="section">
              <h2 className="section-title">{t.summary}</h2>
              <div className="section-content">{resumeData.summary}</div>
            </div>
          )}

          {/* Key Skills */}
          {resumeData.keySkills.length > 0 && (
            <div className="section">
              <h2 className="section-title">{t.keySkills}</h2>
              <div className="section-content">
                {typeof resumeData.keySkills[0] === "string" ? (
                  // Simple list format
                  <div className="skills-list">
                    {(resumeData.keySkills as string[]).map((skill, index) => (
                      <span key={index} className="skill-item">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  // Grouped format
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {(resumeData.keySkills as any[]).map(
                      (group, groupIndex) => (
                        <div key={groupIndex} style={{ fontSize: "11px" }}>
                          <span style={{ fontWeight: 600, color: themeColor }}>
                            {group.groupName}:
                          </span>{" "}
                          {group.skills.join(" • ")}
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Work Experience */}
          {resumeData.workExperience.length > 0 && (
            <div className="section">
              <h2 className="section-title">{t.workExperience}</h2>
              <div className="section-content">
                {resumeData.workExperience.map((exp) => (
                  <div key={exp.id} className="entry">
                    <div className="entry-header">
                      <div>
                        <div className="entry-title">
                          {exp.position || "Position"}
                        </div>
                        <div className="entry-subtitle">
                          {exp.company || "Company"}
                        </div>
                      </div>
                      <div className="entry-date">
                        {exp.startDate} -{" "}
                        {exp.current ? t.present : exp.endDate || "End Date"}
                      </div>
                    </div>
                    {exp.responsibilities.filter((r) => r.trim()).length >
                      0 && (
                      <ul className="responsibilities">
                        {exp.responsibilities
                          .filter((resp) => resp.trim())
                          .map((resp, index) => (
                            <li key={index}>{resp}</li>
                          ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {resumeData.education.length > 0 && (
            <div className="section">
              <h2 className="section-title">{t.education}</h2>
              <div className="section-content">
                {resumeData.education.map((edu) => (
                  <div key={edu.id} className="entry">
                    <div className="entry-header">
                      <div>
                        <div className="entry-title">
                          {edu.school || "School"}
                        </div>
                        <div className="entry-subtitle">
                          {edu.degree || "Degree"}
                          {edu.major && ` ${t.in} ${edu.major}`}
                          {edu.gpa && ` - ${t.gpa}: ${edu.gpa}`}
                        </div>
                      </div>
                      <div className="entry-date">
                        {edu.startDate} -{" "}
                        {edu.current ? t.present : edu.endDate || "End Date"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {resumeData.projects.length > 0 && (
            <div className="section">
              <h2 className="section-title">{t.projects}</h2>
              <div className="section-content">
                {resumeData.projects.map((proj) => (
                  <div key={proj.id} className="entry">
                    <div className="entry-header">
                      <div>
                        <div className="entry-title">
                          {proj.name || "Project Name"}
                        </div>
                        <div className="entry-subtitle">
                          {proj.role || "Role"}
                        </div>
                      </div>
                      <div className="entry-date">
                        {proj.startDate} -{" "}
                        {proj.current ? t.present : proj.endDate || "End Date"}
                      </div>
                    </div>
                    {proj.description && (
                      <div className="entry-description">
                        {proj.description}
                      </div>
                    )}
                    {proj.technologies.length > 0 && (
                      <div className="technologies">
                        <strong>{t.technologies}:</strong>{" "}
                        {proj.technologies.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Information */}
          {resumeData.additionalInfo && (
            <div className="section">
              <h2 className="section-title">{t.additionalInfo}</h2>
              <div className="section-content whitespace-pre-line">
                {resumeData.additionalInfo}
              </div>
            </div>
          )}
        </div>

        {/* Font loading detection script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
          (function() {
            console.log('Print page script loaded');

            function setReady() {
              console.log('Setting data-ready attribute');
              document.body.setAttribute('data-ready', 'true');
            }

            // Try multiple strategies to ensure data-ready is set

            // Strategy 1: Wait for fonts (preferred)
            if (document.fonts && document.fonts.ready) {
              document.fonts.ready.then(function() {
                console.log('Fonts loaded via fonts.ready');
                setReady();
              }).catch(function(err) {
                console.error('Fonts.ready error:', err);
                setReady(); // Set anyway
              });
            } else {
              console.log('document.fonts not available');
            }

            // Strategy 2: Set on window load (backup)
            window.addEventListener('load', function() {
              console.log('Window load event fired');
              setTimeout(setReady, 300);
            });

            // Strategy 3: Set immediately if fonts already loaded
            if (document.readyState === 'complete') {
              console.log('Document already complete');
              setTimeout(setReady, 500);
            }

            // Strategy 4: Fallback timeout (emergency)
            setTimeout(function() {
              if (document.body.getAttribute('data-ready') !== 'true') {
                console.log('Fallback timeout, forcing ready');
                setReady();
              }
            }, 2000);
          })();
        `,
          }}
        />
      </body>
    </html>
  );
}
