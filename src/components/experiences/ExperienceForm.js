// src/components/experiences/ExperienceForm.js (개선된 버전)
import React, { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { experiencesAPI } from '../../services/api'
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

  // 경험 유형별 설정
  const experienceConfigs = {
    work_experience: {
      label: '💼 경력',
      icon: '💼',
      titleLabel: '직책/포지션',
      titlePlaceholder: '예: 프론트엔드 개발자, 마케팅 매니저',
      organizationLabel: '회사명',
      organizationPlaceholder: '예: (주)테크컴퍼니, 스타트업ABC',
      startDateLabel: '입사일',
      endDateLabel: '퇴사일',
      endDateHelper: '현재 재직중이면 비워두세요',
      descriptionPlaceholder: '주요 업무, 담당 프로젝트, 성과 등을 구체적으로 작성해주세요. 가능하면 정량적 수치를 포함해주세요.',
      showEndDate: true
    },
    project: {
      label: '🚀 프로젝트',
      icon: '🚀',
      titleLabel: '프로젝트명',
      titlePlaceholder: '예: 전자상거래 웹사이트 개발, 모바일 앱 리뉴얼',
      organizationLabel: '소속/클라이언트',
      organizationPlaceholder: '예: 개인 프로젝트, (주)클라이언트회사, 팀 프로젝트',
      startDateLabel: '프로젝트 시작일',
      endDateLabel: '프로젝트 종료일',
      endDateHelper: '진행중이면 비워두세요',
      descriptionPlaceholder: '프로젝트 목표, 본인의 역할, 사용 기술, 해결한 문제, 결과/성과 등을 작성해주세요.',
      showEndDate: true
    },
    education: {
      label: '🎓 교육',
      icon: '🎓',
      titleLabel: '학위/과정명',
      titlePlaceholder: '예: 컴퓨터공학과 학사, 웹개발 부트캠프',
      organizationLabel: '교육기관',
      organizationPlaceholder: '예: 서울대학교, 코드스테이츠, 패스트캠퍼스',
      startDateLabel: '입학일/시작일',
      endDateLabel: '졸업일/수료일',
      endDateHelper: '재학중/수강중이면 비워두세요',
      descriptionPlaceholder: '전공/과정 내용, 주요 학습 내용, 프로젝트, GPA나 성과가 있다면 포함해주세요.',
      showEndDate: true
    },
    certificate: {
      label: '📜 자격증',
      icon: '📜',
      titleLabel: '자격증명',
      titlePlaceholder: '예: 정보처리기사, AWS Solutions Architect, TOEIC',
      organizationLabel: '발급기관',
      organizationPlaceholder: '예: 한국산업인력공단, Amazon, ETS',
      startDateLabel: '취득일',
      endDateLabel: '만료일',
      endDateHelper: '만료일이 없으면 비워두세요',
      descriptionPlaceholder: '자격증 취득 배경, 준비 과정, 점수가 있다면 점수 등을 작성해주세요.',
      showEndDate: false // 자격증은 종료일 대신 만료일 (선택사항)
    }
  }

  const currentConfig = experienceConfigs[formData.type]

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
    const value = e.target.value
    // 실시간으로 스킬 배열 업데이트
    const skillsArray = parseSkills(value)
    setFormData(prev => ({ ...prev, skills: skillsArray }))
  }

  const handleSkillKeyDown = (e) => {
    // Enter 키를 눌렀을 때 스킬 추가
    if (e.key === 'Enter') {
      e.preventDefault()
      const currentValue = e.target.value.trim()
      if (currentValue && !formData.skills.includes(currentValue)) {
        const newSkills = [...formData.skills, currentValue]
        setFormData(prev => ({ ...prev, skills: newSkills }))
        e.target.value = ''
      }
    }
  }

  const removeSkill = (skillToRemove) => {
    const newSkills = formData.skills.filter(skill => skill !== skillToRemove)
    setFormData(prev => ({ ...prev, skills: newSkills }))
  }

  const addSkill = (skillText) => {
    if (skillText.trim() && !formData.skills.includes(skillText.trim())) {
      const newSkills = [...formData.skills, skillText.trim()]
      setFormData(prev => ({ ...prev, skills: newSkills }))
    }
  }

  return (
    <div className="experience-form-container">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            {currentConfig.icon} {editingExperience ? `${currentConfig.label} 수정` : `새 ${currentConfig.label} 추가`}
          </h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} className="experience-form">
            {/* 유형 선택 */}
            <div className="form-group">
              <label htmlFor="type" className="form-label">유형</label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="form-select"
                required
              >
                {Object.entries(experienceConfigs).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 제목과 기관 */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="title" className="form-label">{currentConfig.titleLabel}</label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder={currentConfig.titlePlaceholder}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="organization" className="form-label">{currentConfig.organizationLabel}</label>
                <input
                  id="organization"
                  name="organization"
                  type="text"
                  value={formData.organization}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder={currentConfig.organizationPlaceholder}
                  required
                />
              </div>
            </div>

            {/* 날짜 입력 */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="start_date" className="form-label">{currentConfig.startDateLabel}</label>
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
                  {currentConfig.endDateLabel} 
                  <span className="text-muted ml-1">({currentConfig.endDateHelper})</span>
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

            {/* 설명 */}
            <div className="form-group">
              <label htmlFor="description" className="form-label">설명</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="form-textarea"
                placeholder={currentConfig.descriptionPlaceholder}
                rows="5"
                required
              />
            </div>

            {/* 스킬 입력 (개선된 버전) */}
            <div className="form-group">
              <label className="form-label">
                관련 스킬 
                <span className="text-muted ml-1">(쉼표로 구분하거나 Enter로 추가)</span>
              </label>
              
              {/* 이미 추가된 스킬들 */}
              {formData.skills.length > 0 && (
                <div className="skills-display mb-2">
                  {formData.skills.map((skill, idx) => (
                    <span key={idx} className="skill-tag">
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="skill-remove-btn"
                        title="제거"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              
              {/* 스킬 입력 필드 */}
              <input
                type="text"
                className="form-input"
                placeholder="예: React, JavaScript, Python (쉼표로 구분하거나 Enter로 추가)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addSkill(e.target.value)
                    e.target.value = ''
                  } else if (e.key === ',') {
                    e.preventDefault()
                    addSkill(e.target.value)
                    e.target.value = ''
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value.trim()) {
                    addSkill(e.target.value)
                    e.target.value = ''
                  }
                }}
              />
              
              <div className="skill-suggestions">
                <span className="text-xs text-muted">
                  💡 팁: 스킬을 입력하고 Enter를 누르거나 쉼표(,)를 입력하면 자동으로 추가됩니다.
                </span>
              </div>
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