// src/components/jd/JDAnalysisForm.js (개선된 버전)
import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { jdAPI } from '../../services/api'
import { analyzeJD } from '../../services/ai'
import ErrorMessage from '../common/ErrorMessage'
import './JDAnalysisForm.css'

const JDAnalysisForm = ({ onAnalysisComplete, existingJDs, onSelectJD }) => {
  const [jdText, setJdText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [analysisResult, setAnalysisResult] = useState(null)
  const [autoSaveStatus, setAutoSaveStatus] = useState('')
  const { user } = useAuth()
  const autoSaveTimeoutRef = useRef(null)

  // 로컬 스토리지 키
  const LOCAL_STORAGE_KEY = `jd_draft_${user?.id}`

  // 컴포넌트 마운트 시 저장된 초안 불러오기
  useEffect(() => {
    if (user) {
      const savedDraft = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (savedDraft) {
        setJdText(savedDraft)
        setAutoSaveStatus('저장된 초안을 불러왔습니다')
        setTimeout(() => setAutoSaveStatus(''), 3000)
      }
    }
  }, [user, LOCAL_STORAGE_KEY])

  // 자동 저장 기능
  useEffect(() => {
    if (jdText.trim() && user) {
      // 기존 타이머 제거
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }

      // 2초 후 자동 저장
      autoSaveTimeoutRef.current = setTimeout(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY, jdText)
        setAutoSaveStatus('자동 저장됨')
        setTimeout(() => setAutoSaveStatus(''), 2000)
      }, 2000)
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [jdText, user, LOCAL_STORAGE_KEY])

  // 페이지를 떠날 때 확인 (입력 중인 내용이 있을 때)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (jdText.trim() && !analysisResult) {
        e.preventDefault()
        e.returnValue = '입력 중인 채용공고가 있습니다. 정말 페이지를 떠나시겠습니까?'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [jdText, analysisResult])

  const handleAnalyze = async () => {
    if (!jdText.trim()) return

    setIsAnalyzing(true)
    setError('')
    
    try {
      const analysis = await analyzeJD(jdText)
      
      // DB에 저장
      const { data, error } = await jdAPI.create({
        user_id: user.id,
        title: analysis.summary?.slice(0, 50) || '분석된 채용공고',
        original_text: jdText,
        extracted_keywords: analysis.keywords || [],
        summary: analysis.summary || ''
      })

      if (error) throw error

      const newJD = { ...data[0], analysis }
      setAnalysisResult(newJD)
      onAnalysisComplete(newJD)
      
      // 분석 완료 후 초안 삭제
      localStorage.removeItem(LOCAL_STORAGE_KEY)
      setAutoSaveStatus('')
    } catch (error) {
      setError('분석 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleTextChange = (e) => {
    setJdText(e.target.value)
    setError('') // 입력 시 에러 메시지 제거
  }

  const clearDraft = () => {
    if (window.confirm('작성 중인 내용을 삭제하시겠습니까?')) {
      setJdText('')
      localStorage.removeItem(LOCAL_STORAGE_KEY)
      setAutoSaveStatus('초안이 삭제되었습니다')
      setTimeout(() => setAutoSaveStatus(''), 2000)
    }
  }

  const wordCount = jdText.length
  const isTextEmpty = !jdText.trim()

  return (
    <div className="jd-analysis-section">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📄 채용공고 분석</h3>
          <p className="card-subtitle">
            채용공고를 붙여넣으면 AI가 핵심 키워드와 요구사항을 자동으로 분석해드립니다.
          </p>
        </div>
        <div className="card-body">
          <div className="form-group">
            <div className="textarea-header">
              <label htmlFor="jd-text" className="form-label">
                채용공고 내용
              </label>
              <div className="textarea-info">
                <span className="word-count">
                  {wordCount}자
                </span>
                {autoSaveStatus && (
                  <span className="auto-save-status">
                    💾 {autoSaveStatus}
                  </span>
                )}
              </div>
            </div>
            
            <textarea
              id="jd-text"
              value={jdText}
              onChange={handleTextChange}
              placeholder="채용공고를 붙여넣어 주세요..."
              className="form-textarea jd-textarea"
              rows="12"
              disabled={isAnalyzing}
            />
            
            {jdText.trim() && (
              <div className="textarea-actions">
                <button
                  type="button"
                  onClick={clearDraft}
                  className="btn btn-ghost btn-sm"
                  disabled={isAnalyzing}
                >
                  🗑️ 내용 지우기
                </button>
              </div>
            )}
          </div>

          {error && <ErrorMessage message={error} type="error" />}

          <div className="jd-form-actions">
            <button
              onClick={handleAnalyze}
              disabled={isTextEmpty || isAnalyzing}
              className={`btn btn-lg analyze-button ${isTextEmpty ? 'btn-disabled' : 'btn-primary'}`}
            >
              {isAnalyzing ? (
                <>
                  <span className="spinner spinner-sm"></span>
                  AI 분석 중...
                </>
              ) : (
                <div className="button-content">
                  <div className="button-main">
                    <span className="button-icon">🤖</span>
                    AI 분석 시작
                  </div>
                  <div className="button-subtitle">
                    {isTextEmpty ? '(내용 입력 시 활성화)' : '(분석 준비 완료)'}
                  </div>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 분석 결과 */}
      {analysisResult && (
        <div className="card mt-6">
          <div className="card-header">
            <h3 className="card-title">✅ 분석 결과</h3>
          </div>
          <div className="card-body">
            <div className="analysis-result">
              <div className="analysis-section">
                <h4 className="analysis-subtitle">요약</h4>
                <p className="analysis-text">{analysisResult.analysis.summary}</p>
              </div>
              
              <div className="analysis-section">
                <h4 className="analysis-subtitle">핵심 키워드</h4>
                <div className="badge-list">
                  {analysisResult.analysis.keywords?.map((keyword, idx) => (
                    <span key={idx} className="badge badge-primary">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="analysis-section">
                <h4 className="analysis-subtitle">필수 스킬</h4>
                <div className="badge-list">
                  {analysisResult.analysis.required_skills?.map((skill, idx) => (
                    <span key={idx} className="badge badge-error">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="analysis-section">
                <h4 className="analysis-subtitle">우대 스킬</h4>
                <div className="badge-list">
                  {analysisResult.analysis.preferred_skills?.map((skill, idx) => (
                    <span key={idx} className="badge badge-success">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="analysis-actions">
              <button
                onClick={() => onSelectJD(analysisResult)}
                className="btn btn-success btn-lg"
              >
                🚀 이 JD로 이력서 생성하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 기존 JD 목록 */}
      {existingJDs && existingJDs.length > 0 && (
        <div className="card mt-6">
          <div className="card-header">
            <h3 className="card-title">📋 분석된 JD 목록</h3>
          </div>
          <div className="card-body">
            <div className="jd-list">
              {existingJDs.map(jd => (
                <div key={jd.id} className="jd-item">
                  <div className="jd-item-content">
                    <h4 className="jd-item-title">{jd.title}</h4>
                    <p className="jd-item-summary">{jd.summary}</p>
                    <div className="jd-item-keywords">
                      {jd.extracted_keywords?.slice(0, 3).map((keyword, idx) => (
                        <span key={idx} className="badge badge-gray">
                          {keyword}
                        </span>
                      ))}
                      {jd.extracted_keywords?.length > 3 && (
                        <span className="badge badge-gray">
                          +{jd.extracted_keywords.length - 3}개 더
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="jd-item-actions">
                    <button
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
                      className="btn btn-primary btn-sm"
                    >
                      이력서 생성
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default JDAnalysisForm