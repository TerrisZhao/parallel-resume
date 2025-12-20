/**
 * 简历选择器组件
 */

import React from "react";
import { ResumeBasic } from "../../shared/types";

interface ResumeSelectorProps {
  resumes: ResumeBasic[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

const ResumeSelector: React.FC<ResumeSelectorProps> = ({
  resumes,
  selectedId,
  onSelect,
}) => {
  if (resumes.length === 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
        <p>暂无简历</p>
        <p style={{ fontSize: "14px", marginTop: "8px" }}>
          请先在网页版创建简历
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ marginBottom: "12px", fontSize: "14px", color: "#666" }}>
        选择简历
      </h3>
      <div className="resume-list">
        {resumes.map((resume) => (
          <div
            key={resume.id}
            className={`resume-item ${selectedId === resume.id ? "selected" : ""}`}
            onClick={() => onSelect(resume.id)}
          >
            <div className="resume-title">{resume.title}</div>
            <div className="resume-date">
              更新于 {new Date(resume.updatedAt).toLocaleDateString("zh-CN")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResumeSelector;
