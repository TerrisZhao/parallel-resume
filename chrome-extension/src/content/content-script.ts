/**
 * Content Script
 * 注入到网页中，负责检测表单字段和自动填充
 */

console.log("Parallel Resume Extension loaded");

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message);

  if (message.type === "FILL_FORM") {
    fillForm()
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });

    return true; // 异步响应
  }

  if (message.type === "DETECT_FIELDS") {
    const fields = detectFormFields();

    sendResponse({ success: true, data: fields });

    return true;
  }
});

/**
 * 检测表单字段
 */
function detectFormFields() {
  const inputs = document.querySelectorAll<
    HTMLInputElement | HTMLTextAreaElement
  >(
    'input[type="text"], input[type="email"], input[type="tel"], input[type="url"], textarea',
  );

  const fields = Array.from(inputs).map((input) => {
    return {
      name: input.name,
      id: input.id,
      type: input.type,
      placeholder: input.placeholder,
      value: input.value,
    };
  });

  console.log("Detected fields:", fields);

  return fields;
}

/**
 * 构建字段映射表
 */
function buildFieldMappings(resumeData: any): Record<string, string> {
  const mappings: Record<string, string> = {};

  // 个人信息
  if (resumeData.fullName) {
    mappings["name"] = resumeData.fullName;
    mappings["fullname"] = resumeData.fullName;
    mappings["full-name"] = resumeData.fullName;
    mappings["full_name"] = resumeData.fullName;
    mappings["applicant-name"] = resumeData.fullName;
    mappings["applicantname"] = resumeData.fullName;
  }

  if (resumeData.firstName) {
    mappings["firstname"] = resumeData.firstName;
    mappings["first-name"] = resumeData.firstName;
    mappings["first_name"] = resumeData.firstName;
    mappings["fname"] = resumeData.firstName;
    mappings["givenname"] = resumeData.firstName;
    mappings["given-name"] = resumeData.firstName;
  }

  if (resumeData.lastName) {
    mappings["lastname"] = resumeData.lastName;
    mappings["last-name"] = resumeData.lastName;
    mappings["last_name"] = resumeData.lastName;
    mappings["lname"] = resumeData.lastName;
    mappings["surname"] = resumeData.lastName;
    mappings["familyname"] = resumeData.lastName;
    mappings["family-name"] = resumeData.lastName;
  }

  // 联系方式
  if (resumeData.email) {
    mappings["email"] = resumeData.email;
    mappings["mail"] = resumeData.email;
    mappings["e-mail"] = resumeData.email;
    mappings["emailaddress"] = resumeData.email;
    mappings["email-address"] = resumeData.email;
    mappings["contact-email"] = resumeData.email;
  }

  if (resumeData.phone) {
    mappings["phone"] = resumeData.phone;
    mappings["tel"] = resumeData.phone;
    mappings["telephone"] = resumeData.phone;
    mappings["mobile"] = resumeData.phone;
    mappings["cell"] = resumeData.phone;
    mappings["cellphone"] = resumeData.phone;
    mappings["phonenumber"] = resumeData.phone;
    mappings["phone-number"] = resumeData.phone;
    mappings["phone_number"] = resumeData.phone;
    mappings["contact-phone"] = resumeData.phone;
    mappings["contactnumber"] = resumeData.phone;
    mappings["contact-number"] = resumeData.phone;
  }

  // 地址信息
  if (resumeData.location) {
    mappings["location"] = resumeData.location;
    mappings["city"] = resumeData.location;
    mappings["residence"] = resumeData.location;
  }

  if (resumeData.address) {
    mappings["address"] = resumeData.address;
    mappings["street"] = resumeData.address;
    mappings["streetaddress"] = resumeData.address;
    mappings["street-address"] = resumeData.address;
    mappings["home-address"] = resumeData.address;
  }

  // 社交链接
  if (resumeData.linkedin) {
    mappings["linkedin"] = resumeData.linkedin;
    mappings["linkedin-url"] = resumeData.linkedin;
    mappings["linkedinurl"] = resumeData.linkedin;
    mappings["linkedin-profile"] = resumeData.linkedin;
    mappings["linkedinprofile"] = resumeData.linkedin;
  }

  if (resumeData.github) {
    mappings["github"] = resumeData.github;
    mappings["github-url"] = resumeData.github;
    mappings["githuburl"] = resumeData.github;
    mappings["github-profile"] = resumeData.github;
    mappings["githubprofile"] = resumeData.github;
  }

  if (resumeData.website) {
    mappings["website"] = resumeData.website;
    mappings["url"] = resumeData.website;
    mappings["homepage"] = resumeData.website;
    mappings["personal-website"] = resumeData.website;
    mappings["portfolio"] = resumeData.website;
    mappings["portfolio-url"] = resumeData.website;
  }

  // 个人简介
  if (resumeData.summary) {
    mappings["summary"] = resumeData.summary;
    mappings["bio"] = resumeData.summary;
    mappings["biography"] = resumeData.summary;
    mappings["about"] = resumeData.summary;
    mappings["aboutme"] = resumeData.summary;
    mappings["about-me"] = resumeData.summary;
    mappings["profile"] = resumeData.summary;
    mappings["personal-statement"] = resumeData.summary;
    mappings["objective"] = resumeData.summary;
    mappings["career-objective"] = resumeData.summary;
    mappings["description"] = resumeData.summary;
  }

  // 技能（转换为逗号分隔的字符串）
  if (resumeData.keySkills && resumeData.keySkills.length > 0) {
    const skillsStr = resumeData.keySkills.join(", ");

    mappings["skills"] = skillsStr;
    mappings["keyskills"] = skillsStr;
    mappings["key-skills"] = skillsStr;
    mappings["core-skills"] = skillsStr;
    mappings["technical-skills"] = skillsStr;
    mappings["technologies"] = skillsStr;
  }

  return mappings;
}

/**
 * 查找匹配的值
 */
function findMatchingValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  fieldMappings: Record<string, string>,
  resumeData: any,
): string | null {
  // 获取元素的标识符
  const name = (element.name || "").toLowerCase().replace(/[_-]/g, "");
  const id = (element.id || "").toLowerCase().replace(/[_-]/g, "");
  const placeholder = (element.placeholder || "").toLowerCase();

  // 获取关联的 label
  let labelText = "";

  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);

    if (label) {
      labelText = label.textContent?.toLowerCase() || "";
    }
  }

  // 1. 首先尝试精确匹配
  const nameKey = (element.name || element.id || "").toLowerCase();

  if (fieldMappings[nameKey]) {
    return fieldMappings[nameKey];
  }

  // 2. 尝试去掉分隔符后的匹配
  for (const key in fieldMappings) {
    const normalizedKey = key.replace(/[_-]/g, "");

    if (name === normalizedKey || id === normalizedKey) {
      return fieldMappings[key];
    }
  }

  // 3. 匹配工作经历字段
  if (resumeData.workExperiences && resumeData.workExperiences.length > 0) {
    const exp = resumeData.workExperiences[0]; // 使用最近的工作经历

    if (
      /company|employer|organization|organisation/.test(name + id + labelText)
    ) {
      return exp.company || "";
    }
    if (/position|title|jobtitle|job-title|role/.test(name + id + labelText)) {
      return exp.position || "";
    }
    if (
      /start.*date|from.*date|begin.*date/.test(
        name + id + labelText + placeholder,
      )
    ) {
      return exp.startDate || "";
    }
    if (
      /end.*date|to.*date|until.*date/.test(name + id + labelText + placeholder)
    ) {
      return exp.endDate || "";
    }
    if (/responsibilit|dut|description/.test(name + id + labelText)) {
      return exp.responsibilities?.join("\n") || "";
    }
  }

  // 4. 匹配教育背景字段
  if (resumeData.education && resumeData.education.length > 0) {
    const edu = resumeData.education[0]; // 使用最高学历

    if (/school|university|college|institution/.test(name + id + labelText)) {
      return edu.school || "";
    }
    if (/degree|qualification|diploma/.test(name + id + labelText)) {
      return edu.degree || "";
    }
    if (
      /major|field.*study|specialization|programme|program/.test(
        name + id + labelText,
      )
    ) {
      return edu.major || "";
    }
    if (/gpa|grade/.test(name + id + labelText)) {
      return edu.gpa || "";
    }
    if (
      /education.*start|study.*from/.test(name + id + labelText + placeholder)
    ) {
      return edu.startDate || "";
    }
    if (
      /education.*end|graduation.*date|study.*to/.test(
        name + id + labelText + placeholder,
      )
    ) {
      return edu.endDate || "";
    }
  }

  // 5. 匹配项目经验字段
  if (resumeData.projects && resumeData.projects.length > 0) {
    const project = resumeData.projects[0];

    if (/project.*name|project.*title/.test(name + id + labelText)) {
      return project.name || "";
    }
    if (/project.*role/.test(name + id + labelText)) {
      return project.role || "";
    }
    if (/project.*description/.test(name + id + labelText)) {
      return project.description || "";
    }
    if (/project.*tech|project.*stack/.test(name + id + labelText)) {
      return project.technologies?.join(", ") || "";
    }
  }

  return null;
}

/**
 * 填充表单
 */
async function fillForm() {
  console.log("Filling form...");

  // 获取选中的简历数据
  const response = await chrome.runtime.sendMessage({
    type: "GET_RESUME",
    data: { id: await getSelectedResumeId() },
  });

  if (!response.success) {
    throw new Error(response.error || "Failed to get resume data");
  }

  const resumeData = response.data;

  console.log("Resume data:", resumeData);

  // 构建完整的字段映射
  const fieldMappings = buildFieldMappings(resumeData);

  // 填充字段
  const inputs = document.querySelectorAll<
    HTMLInputElement | HTMLTextAreaElement
  >(
    'input[type="text"], input[type="email"], input[type="tel"], input[type="url"], textarea, input[type="date"]',
  );

  let filledCount = 0;

  inputs.forEach((input) => {
    const value = findMatchingValue(input, fieldMappings, resumeData);

    if (value) {
      fillInputField(input, value);
      filledCount++;
    }
  });

  console.log(`Filled ${filledCount} fields`);

  // 显示通知
  showNotification(`已填充 ${filledCount} 个字段`);
}

/**
 * 填充单个输入字段
 */
function fillInputField(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) {
  // 设置值
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set;

  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(element, value);
  } else {
    element.value = value;
  }

  // 触发事件
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  element.dispatchEvent(new Event("blur", { bubbles: true }));

  // 添加视觉反馈
  element.style.backgroundColor = "#e0f2fe";
  setTimeout(() => {
    element.style.backgroundColor = "";
  }, 2000);
}

/**
 * 获取选中的简历 ID
 */
async function getSelectedResumeId(): Promise<number> {
  const result = await chrome.storage.local.get("selectedResumeId");

  if (!result.selectedResumeId) {
    throw new Error("No resume selected");
  }

  return result.selectedResumeId;
}

/**
 * 显示通知
 */
function showNotification(message: string) {
  const notification = document.createElement("div");

  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #3b82f6;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}
