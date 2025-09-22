// src/components/experiences/ExperienceList.js
import React from 'react'
import ExperienceCard from './ExperienceCard'
import './ExperienceList.css'

const ExperienceList = ({ experiences, onEdit, onDelete }) => {
  if (experiences.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📝</div>
        <h3 className="empty-title">아직 등록된 경험이 없습니다</h3>
        <p className="empty-description">
          첫 번째 경험을 추가해서 AI 이력서 생성을 시작해보세요!
        </p>
      </div>
    )
  }

  return (
    <div className="experience-list">
      {experiences.map(experience => (
        <ExperienceCard
          key={experience.id}
          experience={experience}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

export default ExperienceList