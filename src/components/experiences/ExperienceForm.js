// src/components/experiences/ExperienceForm.js (UX 개선 버전)
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
    is_current: false, // 현재 진행중 체크박스 상태
    description: '',
    skills: []
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [skillInput, setSkillInput] = useState('')
  const { user } = useAuth()

  // 확장된 경험 유형별 설정
  const experienceConfigs = {
    work_experience: {
      label: '경력',
      icon: '💼',
      titleLabel: '직책/포지션',
      titlePlaceholder: '예: 프론트엔드 개발자, 마케팅 매니저, UX 디자이너',
      organizationLabel: '회사명',
      organizationPlaceholder: '예: (주)테크컴퍼니, 스타트업ABC',
      startDateLabel: '입사일',
      endDateLabel: '퇴사일',
      currentLabel: '현재 재직중',
      currentText: '재직중',
      descriptionPlaceholder: '• 주요 업무와 담당 프로젝트를 구체적으로 작성\n• 달성한 성과와 개선 사항 (가능하면 정량적 수치 포함)\n• 사용한 기술과 도구\n• 팀 내 역할과 협업 경험',
      showEndDate: true,
      dbType: 'work_experience'
    },
    project: {
      label: '프로젝트',
      icon: '🚀',
      titleLabel: '프로젝트명',
      titlePlaceholder: '예: 전자상거래 웹사이트 개발, 모바일 앱 리뉴얼',
      organizationLabel: '소속/클라이언트',
      organizationPlaceholder: '예: 개인 프로젝트, (주)클라이언트회사, 팀 프로젝트',
      startDateLabel: '프로젝트 시작일',
      endDateLabel: '프로젝트 종료일',
      currentLabel: '현재 진행중',
      currentText: '진행중',
      descriptionPlaceholder: '• 프로젝트의 목표와 배경\n• 본인의 역할과 담당 업무\n• 사용한 기술 스택과 아키텍처\n• 해결한 문제와 도전 과제\n• 최종 결과와 성과 (사용자 수, 성능 개선 등)',
      showEndDate: true,
      dbType: 'project'
    },
    education: {
      label: '교육',
      icon: '🎓',
      titleLabel: '학위/과정명',
      titlePlaceholder: '예: 컴퓨터공학과 학사, 웹개발 부트캠프, AI 특화 과정',
      organizationLabel: '교육기관',
      organizationPlaceholder: '예: 서울대학교, 코드스테이츠, 패스트캠퍼스',
      startDateLabel: '입학일/시작일',
      endDateLabel: '졸업일/수료일',
      currentLabel: '현재 재학중/수강중',
      currentText: '재학중',
      descriptionPlaceholder: '• 전공/과정의 주요 학습 내용\n• 인상 깊었던 과목이나 프로젝트\n• 학습 성과 (GPA, 수료 점수, 우수상 등)\n• 동아리, 연구실, 인턴 경험\n• 논문, 발표, 특별 활동',
      showEndDate: true,
      dbType: 'education'
    },
    certificate: {
      label: '자격증',
      icon: '📜',
      titleLabel: '자격증명',
      titlePlaceholder: '예: 정보처리기사, AWS Solutions Architect, TOEIC',
      organizationLabel: '발급기관',
      organizationPlaceholder: '예: 한국산업인력공단, Amazon, ETS',
      startDateLabel: '취득일',
      endDateLabel: '만료일',
      currentLabel: '유효기간 없음',
      currentText: '영구 유효',
      descriptionPlaceholder: '• 자격증 취득 배경과 동기\n• 준비 기간과 학습 방법\n• 점수나 등급 (해당하는 경우)\n• 실무에서의 활용도\n• 관련 경험이나 프로젝트',
      showEndDate: false, // 자격증은 만료일이 선택사항
      dbType: 'certification'
    },
    volunteer: {
      label: '봉사활동',
      icon: '🤝',
      titleLabel: '봉사활동명/역할',
      titlePlaceholder: '예: 코딩 교육 멘토, 환경 보호 캠페인, 재능기부',
      organizationLabel: '봉사기관/단체',
      organizationPlaceholder: '예: 지역아동센터, 환경운동연합, 사회복지관',
      startDateLabel: '활동 시작일',
      endDateLabel: '활동 종료일',
      currentLabel: '현재 활동중',
      currentText: '활동중',
      descriptionPlaceholder: '• 봉사활동의 목적과 내용\n• 본인의 역할과 담당 업무\n• 활동 빈도와 기간 (주 몇 회, 총 몇 시간 등)\n• 활동을 통해 배운 점\n• 사회에 기여한 부분이나 성과',
      showEndDate: true,
      dbType: 'volunteer'
    },
    activity: {
      label: '대외활동',
      icon: '🎭',
      titleLabel: '활동명/역할',
      titlePlaceholder: '예: 대학생 마케팅 서포터즈, 창업 동아리, 컨퍼런스 스태프',
      organizationLabel: '주최기관/단체',
      organizationPlaceholder: '예: (주)대기업, 대학교, 정부기관',
      startDateLabel: '활동 시작일',
      endDateLabel: '활동 종료일',
      currentLabel: '현재 활동중',
      currentText: '활동중',
      descriptionPlaceholder: '• 활동의 목표와 주요 내용\n• 본인의 역할과 기여도\n• 프로젝트나 미션 수행 결과\n• 네트워킹이나 협업 경험\n• 얻은 인사이트나 성장한 부분',
      showEndDate: true,
      dbType: 'activity'
    },
    competition: {
      label: '수상/공모전',
      icon: '🏆',
      titleLabel: '대회명/수상명',
      titlePlaceholder: '예: 해커톤 대상, 아이디어 공모전, 논문 우수상',
      organizationLabel: '주최기관',
      organizationPlaceholder: '예: 한국정보과학회, 정부부처, (주)주최회사',
      startDateLabel: '참가일/수상일',
      endDateLabel: '대회 종료일',
      currentLabel: '대회 진행중',
      currentText: '진행중',
      descriptionPlaceholder: '• 대회/공모전의 주제와 규모\n• 참여 형태 (개인/팀) 및 본인 역할\n• 제출한 작품이나 아이디어 내용\n• 수상 내역이나 결과 (순위, 상금 등)\n• 준비 과정에서 배운 점',
      showEndDate: false, // 대부분 단일 이벤트
      dbType: 'competition'
    },
    other: {
      label: '기타',
      icon: '📝',
      titleLabel: '활동/경험명',
      titlePlaceholder: '예: 개인 스터디, 사이드 프로젝트, 특별한 경험',
      organizationLabel: '관련 기관/그룹',
      organizationPlaceholder: '예: 개인 활동, 스터디 그룹, 커뮤니티',
      startDateLabel: '시작일',
      endDateLabel: '종료일',
      currentLabel: '현재 진행중',
      currentText: '진행중',
      descriptionPlaceholder: '• 활동의 배경과 목적\n• 구체적인 내용과 과정\n• 사용한 도구나 방법\n• 달성한 결과나 성과\n• 이 경험이 본인에게 준 의미',
      showEndDate: true,
      dbType: 'other'
    }
  }

  const currentConfig = experienceConfigs[formData.type]

  useEffect(() => {
    if (editingExperience) {
      setFormData({
        ...editingExperience,
        // 종료일이 없으면 현재 진행중으로 설정
        is_current: !editingExperience.end_date,
        skills: editingExperience.skills || []
      })
    }
  }, [editingExperience])

  const validateForm = () => {
    const { type, title, organization, start_date, description } = formData

    if (!type || !title || !organization || !start_date || !description) {
      setError('필수 항목을 모두 입력해주세요.')
      return false
    }

    if (!start_date || isNaN(new Date(start_date).getTime())) {
      setError('올바른 시작일을 입력해주세요.')
      return false
    }

    // 현재 진행중이 아닌 경우에만 종료일 검증
    if (!formData.is_current && formData.end_date) {
      if (isNaN(new Date(formData.end_date).getTime())) {
        setError('올바른 종료일을 입력해주세요.')
        return false
      }

      if (new Date(start_date) > new Date(formData.end_date)) {
        setError('종료일은 시작일보다 늦어야 합니다.')
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError('')
    
    // DB 저장용 데이터 준비
    const experienceData = {
      user_id: user.id,
      type: currentConfig.dbType,
      title: formData.title.trim(),
      organization: formData.organization.trim(),
      start_date: formData.start_date,
      // 현재 진행중이면 end_date를 null로, 아니면 입력된 값 사용
      end_date: formData.is_current ? null : (formData.end_date && formData.end_date.trim() ? formData.end_date : null),
      description: formData.description.trim(),
      skills: formData.skills && formData.skills.length > 0 ? formData.skills : null
    }

    console.log('💾 DB 저장용 데이터:', experienceData)

    try {
      let result
      if (editingExperience) {
        console.log('🔄 경험 수정:', editingExperience.id)
        result = await experiencesAPI.update(editingExperience.id, experienceData)
      } else {
        console.log('➕ 새 경험 생성')
        result = await experiencesAPI.create(experienceData)
      }

      const { data, error: saveError } = result
      
      if (saveError) {
        console.error('❌ DB 저장 에러:', saveError)
        throw saveError
      }
      
      console.log('✅ DB 저장 성공:', data)
      onSave()
      
    } catch (error) {
      console.error('💥 저장 실패:', error)
      setError(`저장 중 오류가 발생했습니다: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    
    if (name === 'is_current') {
      setFormData(prev => ({ 
        ...prev, 
        is_current: checked,
        // 현재 진행중을 체크하면 종료일 초기화
        end_date: checked ? '' : prev.end_date
      }))
    } else {
      setFormData(prev => ({ 
        ...prev, 
        [name]: type === 'checkbox' ? checked : value 
      }))
    }
    setError('')
  }

  // 스킬 관련 함수들 (이전과 동일)
  const addSkill = (skillText) => {
    const trimmedSkill = skillText.trim()
    if (trimmedSkill && !formData.skills.includes(trimmedSkill)) {
      const newSkills = [...formData.skills, trimmedSkill]
      setFormData(prev => ({ ...prev, skills: newSkills }))
      setSkillInput('')
      return true
    }
    return false
  }

  const removeSkill = (skillToRemove) => {
    const newSkills = formData.skills.filter(skill => skill !== skillToRemove)
    setFormData(prev => ({ ...prev, skills: newSkills }))
  }

  const handleSkillInputChange = (e) => {
    const value = e.target.value
    setSkillInput(value)

    if (value.includes(',')) {
      const skills = value.split(',').map(s => s.trim()).filter(s => s)
      skills.forEach(skill => {
        if (skill && !formData.skills.includes(skill)) {
          setFormData(prev => ({ 
            ...prev, 
            skills: [...prev.skills, skill] 
          }))
        }
      })
      setSkillInput('')
    }
  }

  const handleSkillKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (addSkill(skillInput)) {
        setSkillInput('')
      }
    } else if (e.key === 'Tab' && skillInput.trim()) {
      e.preventDefault()
      if (addSkill(skillInput)) {
        setSkillInput('')
      }
    } else if (e.key === 'Backspace' && !skillInput && formData.skills.length > 0) {
      const lastSkill = formData.skills[formData.skills.length - 1]
      removeSkill(lastSkill)
    }
  }

  const handleSkillBlur = () => {
    if (skillInput.trim()) {
      addSkill(skillInput)
    }
  }

  // 유형별 인기 스킬 추천
  const getPopularSkills = () => {
    const popularSkills = {
      work_experience: ['JavaScript', 'React', 'Python', 'Node.js', 'TypeScript', 'Vue.js', 'Java', 'SQL'],
      project: ['HTML/CSS', 'JavaScript', 'React', 'Vue.js', 'Node.js', 'MongoDB', 'Firebase', 'Git'],
      education: ['알고리즘', '자료구조', 'OOP', '데이터베이스', '네트워크', '운영체제', '소프트웨어공학'],
      certificate: ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Linux', 'Network', 'Security'],
      volunteer: ['리더십', '소통', '기획', '교육', '멘토링', '프로젝트관리', '팀워크'],
      activity: ['마케팅', '기획', '네트워킹', '프레젠테이션', '협상', '창의성', '분석'],
      competition: ['문제해결', '창의성', '분석', '발표', '팀워크', '시간관리', '집중력'],
      other: ['자기주도학습', '끈기', '호기심', '실험정신', '도전정신', '성장마인드']
    }
    return popularSkills[formData.type] || []
  }

  const addPopularSkill = (skill) => {
    addSkill(skill)
  }

  return (
    <div className="experience-form-container">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            {editingExperience ? `${currentConfig.label} 수정` : `새 ${currentConfig.label} 추가`}
          </h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} className="experience-form">
            {/* 유형 선택 */}
            <div className="form-group">
              <label htmlFor="type" className="form-label">유형 <span className="required">*</span></label>
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
              <p className="form-help">
                💡 본인의 경험에 가장 적합한 유형을 선택해주세요
              </p>
            </div>

            {/* 제목과 기관 */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="title" className="form-label">
                  {currentConfig.titleLabel} <span className="required">*</span>
                </label>
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
                <label htmlFor="organization" className="form-label">
                  {currentConfig.organizationLabel} <span className="required">*</span>
                </label>
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
                <label htmlFor="start_date" className="form-label">
                  {currentConfig.startDateLabel} <span className="required">*</span>
                </label>
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
                </label>
                <input
                  id="end_date"
                  name="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  className="form-input"
                  disabled={formData.is_current}
                />
              </div>
            </div>

            {/* 현재 진행중 체크박스 */}
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="is_current"
                  checked={formData.is_current}
                  onChange={handleInputChange}
                  className="checkbox-input"
                />
                <span className="checkbox-text">
                  ✅ {currentConfig.currentLabel}
                </span>
              </label>
              
              {/* 현재 상태 표시 */}
              {formData.is_current && (
                <div className="current-status-badge">
                  <span className="badge badge-primary">
                    🔥 {currentConfig.currentText}
                  </span>
                </div>
              )}
            </div>

            {/* 설명 */}
            <div className="form-group">
              <label htmlFor="description" className="form-label">
                설명 <span className="required">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="form-textarea"
                placeholder={currentConfig.descriptionPlaceholder}
                rows="6"
                required
              />
            </div>

            {/* 스킬 입력 */}
            <div className="form-group">
              <label className="form-label">
                관련 스킬 / 역량
                <span className="text-muted ml-1">(Enter, Tab, 쉼표로 추가)</span>
              </label>
              
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
              
              <input
                type="text"
                className="form-input"
                placeholder="예: JavaScript, React, 리더십, 소통 (Enter나 쉼표로 추가)"
                value={skillInput}
                onChange={handleSkillInputChange}
                onKeyDown={handleSkillKeyDown}
                onBlur={handleSkillBlur}
              />
              
              {/* 추천 스킬 */}
              <div className="skill-suggestions">
                <p className="text-xs text-muted mb-1">
                  💡 추천 스킬 (클릭하여 추가):
                </p>
                <div className="popular-skills">
                  {getPopularSkills()
                    .filter(skill => !formData.skills.includes(skill))
                    .slice(0, 8)
                    .map((skill, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => addPopularSkill(skill)}
                      className="skill-suggestion-btn"
                    >
                      + {skill}
                    </button>
                  ))}
                </div>
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