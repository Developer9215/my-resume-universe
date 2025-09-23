// src/components/resume/ResumeGenerator.js
import React, { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { resumeAPI } from '../../services/api'
import { generateResume, generateInterviewQuestions, generatePersonalStatement } from '../../services/ai'
import ErrorMessage from '../common/ErrorMessage'
import './ResumeGenerator.css'

const ResumeGenerator = ({ selectedJD, experiences, jds, onSelectJD }) => {
  const [generatedContent, setGeneratedContent] = useState({
    resume: '',
    questions: [],
    statement: ''
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [activeContent, setActiveContent] = useState('resume')
  
  const { user } = useAuth()

  const generateContent = async () => {
    if (!selectedJD || !experiences.length) return

    setIsGenerating(true)
    setError('')
    
    try {
      // JD 분석 데이터가 없으면 기본값 사용
      const jdAnalysis = selectedJD.analysis || {
        keywords: selectedJD.extracted_keywords || [],
        summary: selectedJD.summary || '',
        required_skills: [],
        preferred_skills: [],
        key_responsibilities: []
      }

      // 병렬로 모든 콘텐츠 생성
      const [resume, questions, statement] = await Promise.all([
        generateResume(jdAnalysis, experiences),
        generateInterviewQuestions(jdAnalysis, '생성된 이력서'),
        generatePersonalStatement(jdAnalysis, experiences)
      ])

      setGeneratedContent({
        resume,
        questions,
        statement
      })
      
      setActiveContent('resume')
    } catch (error) {
      setError('콘텐츠 생성 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const saveResume = async () => {
    if (!generatedContent.resume) return

    try {
      await resumeAPI.create({
        user_id: user.id,
        jd_id: selectedJD.id,
        content: generatedContent.resume
      })
      alert('이력서가 저장되었습니다!')
    } catch (error) {
      alert('저장 중 오류가 발생했습니다.')
    }
  }

  const contentTabs = [
    { id: 'resume', name: '이력서', icon: '📄' },
    { id: 'statement', name: '자기소개', icon: '✨' },
    { id: 'questions', name: '면접질문', icon: '❓' }
  ]

  return (
    <div className="resume-generator">
      {/* JD 선택 섹션 */}
      {!selectedJD && jds.length > 0 && (
        <div className="card mb-6">
          <div className="card-header">
            <h3 className="card-title">🎯 JD 선택</h3>
            <p className="card-subtitle">
              이력서를 생성할 채용공고를 선택해주세요
            </p>
          </div>
          <div className="card-body">
            <div className="jd-selection-grid">
              {jds.map(jd => (
                <div
                  key={jd.id}
                  className="jd-selection-card"
                  onClick={() => onSelectJD({
                    ...jd,
                    analysis: {
                      keywords: jd.extracted_keywords || [],
                      summary: jd.summary || '',
                      required_skills: [],
                      preferred_skills: [],
                      key_responsibilities: []
                    }
                  })}
                >
                  <h4 className="jd-selection-title">{jd.title}</h4>
                  <p className="jd-selection-summary">{jd.summary}</p>
                  <div className="jd-selection-keywords">
                    {jd.extracted_keywords?.slice(0, 3).map((keyword, idx) => (
                      <span key={idx} className="badge badge-primary">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!selectedJD && jds.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h3 className="empty-title">분석된 JD가 없습니다</h3>
          <p className="empty-description">
            먼저 "JD 분석" 탭에서 채용공고를 분석해주세요.
          </p>
        </div>
      )}

      {/* 선택된 JD 정보 */}
      {selectedJD && (
        <div className="card mb-6">
          <div className="card-header">
            <h3 className="card-title">🎯 선택된 JD: {selectedJD.title}</h3>
          </div>
          <div className="card-body">
            <div className="selected-jd-info">
              <p className="selected-jd-summary">{selectedJD.summary}</p>
              {selectedJD.extracted_keywords && selectedJD.extracted_keywords.length > 0 && (
                <div className="selected-jd-keywords">
                  <strong>핵심 키워드:</strong>
                  <div className="keyword-list">
                    {selectedJD.extracted_keywords.map((keyword, idx) => (
                      <span key={idx} className="badge badge-primary">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="generation-controls">
              <button
                onClick={generateContent}
                disabled={isGenerating || !experiences.length}
                className="btn btn-primary btn-lg"
              >
                {isGenerating ? (
                  <>
                    <span className="spinner spinner-sm"></span>
                    AI 생성 중...
                  </>
                ) : (
                  '🚀 AI 콘텐츠 생성'
                )}
              </button>
              
              {!experiences.length && (
                <p className="text-warning text-sm mt-2">
                  ⚠️ 먼저 "경험 관리"에서 경험을 추가해주세요.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {error && <ErrorMessage message={error} type="error" />}

      {/* 생성된 콘텐츠 */}
      {generatedContent.resume && (
        <div className="generated-content">
          {/* 콘텐츠 탭 */}
          <div className="content-tabs">
            {contentTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveContent(tab.id)}
                className={`content-tab ${activeContent === tab.id ? 'active' : ''}`}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.name}</span>
              </button>
            ))}
          </div>

          {/* 이력서 콘텐츠 */}
          {activeContent === 'resume' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">📄 생성된 이력서</h3>
                <button
                  onClick={saveResume}
                  className="btn btn-success btn-sm"
                >
                  💾 저장
                </button>
              </div>
              <div className="card-body">
                <div 
                  className="resume-content"
                  dangerouslySetInnerHTML={{ __html: generatedContent.resume }}
                />
              </div>
            </div>
          )}

          {/* 자기소개 콘텐츠 */}
          {activeContent === 'statement' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">✨ 자기소개/PR 문구</h3>
              </div>
              <div className="card-body">
                <div className="statement-content">
                  <p>{generatedContent.statement}</p>
                </div>
              </div>
            </div>
          )}

          {/* 면접 질문 콘텐츠 */}
          {activeContent === 'questions' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">❓ 예상 면접 질문</h3>
              </div>
              <div className="card-body">
                <div className="questions-content">
                  {generatedContent.questions.map((question, idx) => (
                    <div key={idx} className="question-item">
                      <div className="question-number">Q{idx + 1}</div>
                      <div className="question-text">{question}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ResumeGenerator