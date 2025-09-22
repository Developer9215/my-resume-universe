// src/components/jd/JDAnalysisForm.js
import React, { useState } from 'react'
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
  const { user } = useAuth()

  const handleAnalyze = async () => {
    if (!jdText.trim()) {
      setError('채용공고를 입력해주세요.')
      return
    }

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
      setJdText('')
    } catch (error) {
      setError('분석 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setIsAnalyzing(false)
    }
  }

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
            <label htmlFor="jd-text" className="form-label">
              채용공고 내용
            </label>
            <textarea
              id="jd-text"
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="채용공고를 붙여넣어 주세요..."
              className="form-textarea"
              rows="10"
              disabled={isAnalyzing}
            />
          </div>

          {error && <ErrorMessage message={error} type="error" />}

          <div className="jd-form-actions">
            <button
              onClick={handleAnalyze}
              disabled={!jdText.trim() || isAnalyzing}
              className="btn btn-primary btn-lg"
            >
              {isAnalyzing ? (
                <>
                  <span className="spinner spinner-sm"></span>
                  AI 분석 중...
                </>
              ) : (
                '🤖 AI 분석 시작'
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