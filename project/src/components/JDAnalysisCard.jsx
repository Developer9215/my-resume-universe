// JDAnalysisCard.jsx// JD분석화면
import React from "react";
function JDAnalysisCard({ jd }) {
  return (
    <div className="card">
      <div className="card-header">
        🏆 선택된 JD: {jd.title}
      </div>
      <div className="card-body">
        <div>{jd.summary}</div>
        <div style={{ marginTop: "16px" }}>
          {jd.keywords.map(k => (
            <span className="badge badge-primary" style={{ marginRight: "4px" }}>{k}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
export default JDAnalysisCard;
