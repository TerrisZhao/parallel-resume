/**
 * AI Prompt Management File
 * Centralized management of all AI-related prompt templates
 */

/**
 * System prompt for STAR principle detection and optimization
 */
export const STAR_CHECK_SYSTEM_PROMPT = `You are a professional resume optimization consultant, skilled in using the STAR principle (Situation, Task, Action, Result) to evaluate and improve resume content.

STAR Principle Requirements:
- S (Situation): Describe the background and context
- T (Task): Explain the task or goal that needed to be accomplished
- A (Action): Describe the specific actions taken
- R (Result): Show the achievements and impact (preferably with quantifiable data)

Important Guidelines:
- Carefully analyze the user-provided content to determine if it meets all four elements of the STAR principle
- When optimizing, you must maintain the original language: if the original content is in English, the optimized version must also be in English; if the original content is in Chinese, the optimized version must also be in Chinese
- Do not change the language of the content, only optimize the expression and structure`;

/**
 * User prompt template for STAR principle detection (single item)
 */
export function getStarCheckPrompt(
  content: string,
  jobDescription?: string,
): string {
  const jobDescriptionSection = jobDescription
    ? `\n\nJob Description (for reference):
"${jobDescription}"

When optimizing, consider the job description above. If the content is relevant to the job requirements, align the optimized content appropriately with the job description. However, if there is no clear relevance, do not force alignment - maintain the authenticity and naturalness of the original content. Only adjust when there is genuine relevance.`
    : "";

  return `Please analyze the following project description. Please evaluate whether it satisfies the STAR principle and optimize it:

Content:
"${content}"${jobDescriptionSection}

Important Notes:
- The content does not need to individually satisfy the complete STAR principle
- The optimized content can emphasize one or several STAR elements (S, T, A, R)
- Different parts of the content can each emphasize different STAR elements
- For example: The beginning can focus on Situation and Task, the middle can focus on Action, and the end can focus on Result

Please return JSON in the following format:
{
  "satisfied": {
    "S": true/false,  // Whether this content contains or primarily emphasizes Situation
    "T": true/false,  // Whether this content contains or primarily emphasizes Task
    "A": true/false,  // Whether this content contains or primarily emphasizes Action
    "R": true/false   // Whether this content contains or primarily emphasizes Result
  },
  "improvedContent": "Optimized content that can emphasize one or several STAR elements, not necessarily all four elements",
  "suggestions": "Improvement suggestions (optional)"
}

Notes:
1. **CRITICAL: Write naturally and fluently** - The optimized content must read like it was written by a human, not an AI. Do NOT explicitly label or separate STAR elements with headers like "Task:", "Action:", "Result:", "Situation:", etc. Instead, weave these elements seamlessly into a cohesive narrative that flows naturally.
2. The optimized content should tell a story naturally, integrating STAR elements organically without obvious structure markers
3. Use natural transitions between ideas rather than bullet points or explicit labels
4. The optimized content can emphasize different STAR elements in different parts, combining to satisfy the STAR principle overall
5. If the content already well represents an element, the optimized content should retain and enhance that element naturally
6. If the content is missing an element, supplement it in the most appropriate part using natural language
7. The Result section should include quantifiable data (percentages, numbers, time, etc.) whenever possible, but integrate it naturally into the narrative
8. The optimized content should be natural and fluent, conforming to resume writing standards, avoiding awkward combinations or AI-like patterns
9. Write in a professional but conversational tone, as if describing your own work experience
10. If the original content is empty or too short, return satisfied as all false, and improvedContent as an empty string
11. **Important: Must maintain the original language** - If the original content is in English, the optimized version must also be in English; if the original content is in Chinese, the optimized version must also be in Chinese. Do not change the language, only optimize expression and structure
12. **Length control** - The optimized content should be concise and refined, avoid excessive expansion. If the original content is already concise, the optimized version should maintain a similar length or be slightly shorter; if the original content is long, it can be appropriately condensed but without losing key information. Prioritize content quality and avoid redundancy and repetition. The optimized content should be kept to a reasonable length suitable for resume format`;
}

/**
 * User prompt template for batch STAR principle detection (multiple items)
 */
export function getBatchStarCheckPrompt(
  items: Array<{ id: string; content: string }>,
  jobDescription?: string,
): string {
  const itemsList = items
    .map((item, index) => `Item ${index + 1} (ID: ${item.id}):\n"${item.content}"`)
    .join("\n\n");

  const jobDescriptionSection = jobDescription
    ? `\n\nJob Description (for reference):
"${jobDescription}"

When optimizing, consider the job description above. If the content is relevant to the job requirements, align the optimized content appropriately with the job description. However, if there is no clear relevance, do not force alignment - maintain the authenticity and naturalness of the original content. Only adjust when there is genuine relevance.`
    : "";

  return `Please analyze the following multiple responsibility and achievement descriptions from the same work experience. These items belong to the same work experience. Please evaluate from an overall perspective whether they collectively satisfy the STAR principle and optimize them:

${itemsList}${jobDescriptionSection}

Important Notes:
- Each item does not need to individually satisfy the complete STAR principle
- All items should collectively satisfy the STAR principle as a whole
- Different items can each emphasize different STAR elements (S, T, A, R)
- For example: The first item can focus on Situation and Task, the second item can focus on Action, and the third item can focus on Result

Please return JSON in the following format:
{
  "results": [
    {
      "id": "itemID",
      "satisfied": {
        "S": true/false,  // Whether this item contains or primarily emphasizes Situation
        "T": true/false,  // Whether this item contains or primarily emphasizes Task
        "A": true/false,  // Whether this item contains or primarily emphasizes Action
        "R": true/false   // Whether this item contains or primarily emphasizes Result
      },
      "improvedContent": "Optimized content that can emphasize one or several STAR elements, not every item needs to include all four elements",
      "suggestions": "Improvement suggestions (optional)"
    }
  ],
  "overallSatisfied": {
    "S": true/false,  // Whether all items collectively contain Situation
    "T": true/false,  // Whether all items collectively contain Task
    "A": true/false,  // Whether all items collectively contain Action
    "R": true/false   // Whether all items collectively contain Result
  }
}

Notes:
1. The returned results array must include results for all items, and the id must match the input
2. When optimizing, different items can each emphasize different STAR elements, combining to satisfy the STAR principle overall
3. If an item already well represents an element, the optimized content should retain and enhance that element
4. If the overall content is missing an element, supplement it in the most appropriate item
5. The Result section should include quantifiable data (percentages, numbers, time, etc.) whenever possible
6. The optimized content should be natural and fluent, conforming to resume writing standards, avoiding awkward combinations
7. If an item is empty or too short, return satisfied as all false, and improvedContent as an empty string
8. overallSatisfied indicates whether all items collectively satisfy the STAR principle (whether all items together contain complete S, T, A, R)
9. **Important: Must maintain the original language** - If the original content is in English, the optimized version must also be in English; if the original content is in Chinese, the optimized version must also be in Chinese. Do not change the language, only optimize expression and structure
10. **Length control** - Each optimized item should be concise and refined, avoid excessive expansion. If the original content is already concise, the optimized version should maintain a similar length or be slightly shorter; if the original content is long, it can be appropriately condensed but without losing key information. Prioritize content quality and avoid redundancy and repetition. Each optimized item should be kept to a reasonable length suitable for resume format`;
}

/**
 * Prompt for STAR principle detection only (detection without optimization)
 */
export function getStarCheckOnlyPrompt(content: string): string {
  return `Please analyze whether the following resume content follows the STAR principle:

Content:
"${content}"

Please return JSON in the following format:
{
  "satisfied": {
    "S": true/false,  // Whether it contains Situation (background context)
    "T": true/false,  // Whether it contains Task (task objective)
    "A": true/false,  // Whether it contains Action (specific actions)
    "R": true/false   // Whether it contains Result (achievements and impact)
  }
}

Only return the detection results, no need to optimize the content.`;
}

