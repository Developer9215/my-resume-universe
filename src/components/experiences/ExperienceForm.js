// src/components/experiences/ExperienceForm.js
import React, { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { experiencesAPI } from '../../services/api'
import { EXPERIENCE_TYPES } from '../../utils/constants'
import { parseSkills } from '../../utils/helpers'
import ErrorMessage from '../common/ErrorMessage'
import './ExperienceForm.css'

const ExperienceForm = ({ onSave, editingExperience, onCancel }) => {
  const [formData, setFormData] = useState({
    type: 'work_experience',
    title: '',
    organization: '',
    start_date: '',
    end_date: '',
    description: '',
    skills: []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    if (editingExperience) {
      setFormData({
        ...editingExperience,
        skills: editingExperience.skills || []
      })
    }
  }, [editingExperience])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    const experienceData = {
      ...formData,
      user_id: user.id,
      skills: Array.isArray(formData.skills) ? formData.skills : parseSkills(formData.skills)
    }

    try {
      if (editingExperience) {
        const { error } = await experiencesAPI.update(editingExperience.id, experienceData)
        if (error) throw error
      } else {
        const { error } = await experiencesAPI.create(experienceData)
        if (error) throw error
      }
      
      onSave()
    } catch (error) {
      setError('저장 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSkillsChange = (e) => {
    const skillsArray = parseSkills(e.target.value)
    setFormData(prev => ({ ...prev, skills: skillsArray }))
  }

  const skillsString = Array.isArray(formData.skills) 
    ? formData.skills.join(', ') 
    : formData.skills

  return (
    <div className="experience-form-container">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            {editingExperience ? '경험 수정' : '새 경험 추가'}
          </h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} className="experience-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="title" className="form-label">제목/직책</label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="예: 프론트엔드 개발자, React 프로젝트"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="organization" className="form-label">회사/기관</label>
                <input
                  id="organization"
                  name="organization"
                  type="text"
                  value={formData.organization}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="예: (주)테크컴퍼니, 고려대학교"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="start_date" className="form-label">시작일</label>
                <input
                  id="start_date"
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="end_date" className="form-label">
                  종료일 <span className="text-muted">(진행중이면 비워두세요)</span>
                </label>
                <input
                  id="end_date"
                  name="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description" className="form-label">설명</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="form-textarea"
                placeholder="주요 업무, 성과, 배운 점 등을 구체적으로 적어주세요. 정량적 수치가 있다면 더욱 좋습니다."
                rows="5"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="skills" className="form-label">
                관련 스킬 <span className="text-muted">(쉼표로 구분)</span>
              </label>
              <input
                id="skills"
                name="skills"
                type="text"
                value={skillsString}
                onChange={handleSkillsChange}
                className="form-input"
                placeholder="예: React, Node.js, Python, AWS, Git"
              />
              {formData.skills.length > 0 && (
                <div className="skills-preview">
                  {formData.skills.map((skill, idx) => (
                    <span key={idx} className="badge badge-primary">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {error && <ErrorMessage message={error} type="error" />}

            <div className="form-actions">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? (
                  <>
                    <span className="spinner spinner-sm"></span>
                    저장 중...
                  </>
                ) : (
                  editingExperience ? '수정 완료' : '저장'
                )}
              </button>
              
              <button
                type="button"
                onClick={onCancel}
                className="btn btn-secondary"
                disabled={loading}
              >
                취소
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ExperienceForm