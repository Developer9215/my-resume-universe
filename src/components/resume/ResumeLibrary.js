// src/components/resume/ResumeLibrary.js (리팩토링 버전)
import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { resumeAPI } from '../../services/api'
import Loading from '../common/Loading'
import ErrorMessage from '../common/ErrorMessage'
import './ResumeLibrary.css'

const ResumeLibrary = () => {
  const [resumes, setResumes] = useState([])
  const [selectedResume, setSelectedResume] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState('list') // 'list' | 'detail'
  
  const { user } = useAuth()

  // useCallback으로 loadResumes 함수 최적화
  const loadResumes = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }
    
    console.log('이력서 로드 시작, user:', user.id)
    setLoading(true)
    setError('')
    
    try {
      const result = await resumeAPI.legacy.getAll(user.id)
      console.log('API 호출 결과:', result)
      
      if (result.error) {
        throw new Error(result.error.message || '데이터 조회 실패')
      }
      
      setResumes(result.data || [])
      console.log('setResumes 완료, 데이터 개수:', result.data?.length)
    } catch (error) {
      console.error('이력서 로드 실패:', error)
      setError('저장된 이력서를 불러오는 중 오류가 발생했습니다.')
    } finally {
      console.log('finally 블록 실행 - setLoading(false)')
      setLoading(false)
    }
  }, [user])

  // 저장된 이력서 목록 로드
  useEffect(() => {
    console.log('useEffect 실행')
    loadResumes()
  }, [loadResumes]) // loadResumes를 의존성으로 추가

  const deleteResume = useCallback(async (resumeId) => {
    if (!window.confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return
    }

    try {
      const result = await resumeAPI.legacy.delete(resumeId)
      
      if (result.error) {
        throw new Error(result.error.message || '삭제 실패')
      }
      
      setResumes(prev => prev.filter(resume => resume.id !== resumeId))
      if (selectedResume?.id === resumeId) {
        setSelectedResume(null)
        setViewMode('list')
      }
      alert('이력서가 삭제되었습니다.')
    } catch (error) {
      console.error('이력서 삭제 실패:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }, [selectedResume])

  const viewResumeDetail = useCallback((resume) => {
    setSelectedResume(resume)
    setViewMode('detail')
  }, [])

  const backToList = useCallback(() => {
    setSelectedResume(null)
    setViewMode('list')
  }, [])

  const printResume = useCallback(() => {
    window.print()
  }, [])

  // 로딩 상태
  if (loading) {
    return <Loading message="저장된 이력서를 불러오는 중..." />
  }

  // 사용자가 없는 경우
  if (!user) {
    return (
      <div className="resume-library">
        <div className="empty-library">
          <div className="empty-icon">🔒</div>
          <h3 className="empty-title">로그인이 필요합니다</h3>
          <p className="empty-description">
            이력서 보관함을 보려면 로그인해주세요.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="resume-library">
      {/* 목록 보기 */}
      {viewMode === 'list' && (
        <div className="library-content">
          <div className="library-header">
            <h2 className="library-title">📋 이력서 보관함</h2>
            <div className="library-stats">
              <span className="stats-item">
                총 {resumes.length}개의 이력서
              </span>
            </div>
          </div>

          {error && <ErrorMessage message={error} type="error" />}

          {resumes.length === 0 ? (
            <div className="empty-library">
              <div className="empty-icon">📄</div>
              <h3 className="empty-title">저장된 이력서가 없습니다</h3>
              <p className="empty-description">
                "이력서 생성" 탭에서 이력서를 생성하고 저장해보세요.
              </p>
            </div>
          ) : (
            <div className="resume-grid">
              {resumes.map(resume => (
                <ResumeCard
                  key={resume.id}
                  resume={resume}
                  onView={viewResumeDetail}
                  onDelete={deleteResume}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 상세 보기 */}
      {viewMode === 'detail' && selectedResume && (
        <ResumeDetail
          resume={selectedResume}
          onBackToList={backToList}
          onPrint={printResume}
          onDelete={deleteResume}
        />
      )}
    </div>
  )
}

// 이력서 카드 컴포넌트 분리
const ResumeCard = React.memo(({ resume, onView, onDelete }) => {
  const handleView = useCallback(() => {
    onView(resume)
  }, [resume, onView])

  const handleDelete = useCallback(() => {
    onDelete(resume.id)
  }, [resume.id, onDelete])

  return (
    <div className="resume-card">
      <div className="resume-card-header">
        <h3 className="resume-title">
          {resume.jd_title || '이력서'}
        </h3>
        <div className="resume-date">
          {new Date(resume.created_at).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>

      <div className="resume-preview">
        <div
          className="resume-content-preview"
          dangerouslySetInnerHTML={{
            __html: (resume.content || '').substring(0, 200) + '...'
          }}
        />
      </div>

      <div className="resume-actions">
        <button
          onClick={handleView}
          className="btn btn-primary btn-sm"
        >
          👁️ 자세히 보기
        </button>
        <button
          onClick={handleDelete}
          className="btn btn-danger btn-sm"
        >
          🗑️ 삭제
        </button>
      </div>
    </div>
  )
})

// 이력서 상세보기 컴포넌트 분리
const ResumeDetail = React.memo(({ resume, onBackToList, onPrint, onDelete }) => {
  const handleDelete = useCallback(() => {
    onDelete(resume.id)
  }, [resume.id, onDelete])

  return (
    <div className="resume-detail">
      <div className="detail-header">
        <button
          onClick={onBackToList}
          className="btn btn-ghost back-to-list"
        >
          ← 목록으로 돌아가기
        </button>

        <div className="detail-actions">
          <button
            onClick={onPrint}
            className="btn btn-secondary btn-sm"
          >
            🖨️ 인쇄
          </button>
          <button
            onClick={handleDelete}
            className="btn btn-danger btn-sm"
          >
            🗑️ 삭제
          </button>
        </div>
      </div>

      <div className="resume-detail-content">
        <div className="detail-info">
          <h2 className="detail-title">{resume.jd_title || '이력서'}</h2>
          <p className="detail-date">
            생성일: {new Date(resume.created_at).toLocaleDateString('ko-KR')}
          </p>
        </div>

        <div className="resume-content-full">
          <div
            className="resume-content"
            dangerouslySetInnerHTML={{ __html: resume.content || '' }}
          />
        </div>
      </div>
    </div>
  )
})

export default ResumeLibrary