// src/components/MainDashboard.js (이력서 보관함 탭 추가)
import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { experiencesAPI, jdAPI } from '../services/api'
import JDAnalysisForm from './jd/JDAnalysisForm'
import ExperienceForm from './experiences/ExperienceForm'
import ExperienceList from './experiences/ExperienceList'
import ResumeGenerator from './resume/ResumeGenerator'
import ResumeLibrary from './resume/ResumeLibrary'
import AccountSettings from './settings/AccountSettings'
import Loading from './common/Loading'
import './MainDashboard.css'

const MainDashboard = () => {
  const [activeTab, setActiveTab] = useState('jd-analysis')
  const [experiences, setExperiences] = useState([])
  const [jds, setJDs] = useState([])
  const [selectedJD, setSelectedJD] = useState(null)
  const [editingExperience, setEditingExperience] = useState(null)
  const [showExperienceForm, setShowExperienceForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const { user, signOut } = useAuth()

  // useCallback으로 loadData 함수 최적화
  const loadData = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const [experiencesResult, jdsResult] = await Promise.all([
        experiencesAPI.getAll(user.id),
        jdAPI.legacy.getAll(user.id)  // 원래대로 되돌림
      ])

      setExperiences(experiencesResult.data || [])
      setJDs(jdsResult.data || [])  // 원래대로 되돌림
    } catch (error) {
      console.error('데이터 로드 실패:', error)
      setJDs([])
    } finally {
      setLoading(false)
    }
  }, [user])

  // 데이터 로드
  useEffect(() => {
    loadData()
  }, [loadData])

  const handleJDAnalysisComplete = (newJD) => {
    setJDs(prev => [newJD, ...prev])
    setSelectedJD(newJD)
    setActiveTab('resume-generator')
  }

  const handleExperienceSave = () => {
    loadData()
    setShowExperienceForm(false)
    setEditingExperience(null)
  }

  const handleDeleteExperience = async (id) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await experiencesAPI.delete(id)
        loadData()
      } catch (error) {
        alert('삭제 중 오류가 발생했습니다.')
      }
    }
  }

  // 메인으로 돌아가기 함수
  const handleBackToMain = () => {
    setActiveTab('jd-analysis')
  }

  // 이력서 저장 성공 시 보관함 탭으로 이동
  const handleResumeSaved = () => {
    setActiveTab('resume-library')
  }

  const tabs = [
    { id: 'jd-analysis', name: 'JD 분석', icon: '📄' },
    { id: 'experiences', name: '경험 관리', icon: '💼' },
    { id: 'resume-generator', name: '이력서 생성', icon: '🚀' },
    { id: 'resume-library', name: '이력서 보관함', icon: '📋' },
    { id: 'settings', name: '설정', icon: '⚙️' }
  ]

  if (loading) {
    return <Loading message="대시보드를 불러오는 중..." />
  }

  // 설정 탭은 별도 컴포넌트로 처리 (헤더 포함)
  if (activeTab === 'settings') {
    return <AccountSettings onBackToMain={handleBackToMain} />
  }

  return (
    <div className="dashboard">
      {/* 헤더 */}
      <header className="dashboard-header">
        <div className="container">
          <div className="header-content">
            <h1 className="dashboard-title">My Resume Universe</h1>
            <div className="header-actions">
              <span className="user-info">안녕하세요, {user?.email}님!</span>
              <button
                onClick={() => setActiveTab('settings')}
                className="btn btn-ghost btn-sm"
                title="설정"
              >
                ⚙️ 설정
              </button>
              <button onClick={signOut} className="btn btn-ghost btn-sm">
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="dashboard-main">
        <div className="container">
          {/* 탭 네비게이션 */}
          <div className="tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.name}</span>
              </button>
            ))}
          </div>

          {/* 탭 컨텐츠 */}
          <div className="tab-content">
            {activeTab === 'jd-analysis' && (
              <div className="tab-panel">
                <JDAnalysisForm
                  onAnalysisComplete={handleJDAnalysisComplete}
                  existingJDs={jds}
                  onSelectJD={setSelectedJD}
                />
              </div>
            )}

            {activeTab === 'experiences' && (
              <div className="tab-panel">
                <div className="experiences-header">
                  <h2>💼 경험 관리</h2>
                  <button
                    onClick={() => setShowExperienceForm(true)}
                    className="btn btn-primary"
                  >
                    + 새 경험 추가
                  </button>
                </div>

                {(showExperienceForm || editingExperience) && (
                  <div className="mb-6">
                    <ExperienceForm
                      onSave={handleExperienceSave}
                      editingExperience={editingExperience}
                      onCancel={() => {
                        setShowExperienceForm(false)
                        setEditingExperience(null)
                      }}
                    />
                  </div>
                )}

                <ExperienceList
                  experiences={experiences}
                  onEdit={setEditingExperience}
                  onDelete={handleDeleteExperience}
                />
              </div>
            )}

            {activeTab === 'resume-generator' && (
              <div className="tab-panel">
                <ResumeGenerator
                  selectedJD={selectedJD}
                  experiences={experiences}
                  jds={jds}
                  onSelectJD={setSelectedJD}
                  onResumeSaved={handleResumeSaved}
                />
              </div>
            )}

            {activeTab === 'resume-library' && (
              <div className="tab-panel">
                <ResumeLibrary />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default MainDashboard