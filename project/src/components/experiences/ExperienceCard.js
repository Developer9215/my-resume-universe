// src/components/experiences/ExperienceCard.js
import React from 'react'
import { EXPERIENCE_TYPES } from '../../utils/constants'
import { formatDateRange, calculateDuration } from '../../utils/helpers'
import './ExperienceCard.css'

const ExperienceCard = ({ experience, onEdit, onDelete }) => {
  const typeConfig = EXPERIENCE_TYPES[experience.type] || EXPERIENCE_TYPES.work_experience
  const dateRange = formatDateRange(experience.start_date, experience.end_date)
  const duration = calculateDuration(experience.start_date, experience.end_date)

  return (
    <div className="experience-card">
      <div className="experience-card-header">
        <div className="experience-type">
          <span className={`badge badge-${typeConfig.color}`}>
            {typeConfig.icon} {typeConfig.label}
          </span>
        </div>
        <div className="experience-actions">
          <button
            onClick={() => onEdit(experience)}
            className="btn btn-ghost btn-sm"
            title="수정"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(experience.id)}
            className="btn btn-ghost btn-sm text-error"
            title="삭제"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="experience-card-body">
        <div className="experience-main">
          <h3 className="experience-title">{experience.title}</h3>
          <p className="experience-organization">{experience.organization}</p>
          <div className="experience-period">
            <span className="period-range">{dateRange}</span>
            <span className="period-duration">({duration})</span>
          </div>
        </div>

        <div className="experience-description">
          <p>{experience.description}</p>
        </div>

        {experience.skills && experience.skills.length > 0 && (
          <div className="experience-skills">
            <h4 className="skills-title">사용 기술</h4>
            <div className="skills-list">
              {experience.skills.map((skill, idx) => (
                <span key={idx} className="badge badge-gray">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ExperienceCard