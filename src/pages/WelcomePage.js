// src/pages/WelcomePage.js
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './WelcomePage.css'

const WelcomePage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [showContent, setShowContent] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  // 페이지 로드 시 애니메이션 효과
  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 300)
    return () => clearTimeout(timer)
  }, [])

  // 순차적으로 컨텐츠 표시
  useEffect(() => {
    if (showContent) {
      const steps = [0, 1, 2, 3]
      steps.forEach((step, index) => {
        setTimeout(() => setCurrentStep(step), index * 800)
      })
    }
  }, [showContent])

  const handleStartService = () => {
    navigate('/dashboard')
  }

  const features = [
    {
      icon: '📄',
      title: 'AI 채용공고 분석',
      description: '채용공고를 붙여넣으면 핵심 키워드와 요구사항을 자동으로 분석해드려요'
    },
    {
      icon: '🎯',
      title: '맞춤형 이력서 생성',
      description: 'JD에 최적화된 이력서를 AI가 자동으로 생성해드려요'
    },
    {
      icon: '💼',
      title: '경력 관리 시스템',
      description: '프로젝트, 경력, 교육 이력을 체계적으로 관리할 수 있어요'
    },
    {
      icon: '❓',
      title: '면접 질문 예측',
      description: 'JD와 이력서를 분석해서 예상 면접 질문을 미리 준비해드려요'
    }
  ]

  if (!user) {
    navigate('/login')
    return null
  }

  return (
    <div className="welcome-container">
      <div className={`welcome-content ${showContent ? 'show' : ''}`}>
        {/* 환영 헤더 */}
        <div className={`welcome-header ${currentStep >= 0 ? 'animate' : ''}`}>
          <div className="welcome-icon">
            <div className="success-burst">
              <div className="burst-1"></div>
              <div className="burst-2"></div>
              <div className="burst-3"></div>
            </div>
            <span className="welcome-emoji">🎉</span>
          </div>
          
          <h1 className="welcome-title">
            가입이 완료되었습니다!
          </h1>
          
          <div className="welcome-subtitle">
            <strong>{user?.user_metadata?.name || user?.email?.split('@')[0]}님</strong>, 
            <br />My Resume Universe에 오신 것을 환영합니다!
          </div>
        </div>

        {/* 서비스 소개 */}
        <div className={`service-intro ${currentStep >= 1 ? 'animate' : ''}`}>
          <h2 className="intro-title">
            🌟 이제 AI와 함께 완벽한 이력서를 만들어보세요
          </h2>
          
          <p className="intro-description">
            더 이상 어떻게 이력서를 써야 할지 고민하지 마세요.<br/>
            My Resume Universe가 취업 성공까지 함께 도와드릴게요.
          </p>
        </div>

        {/* 기능 소개 */}
        <div className={`features-section ${currentStep >= 2 ? 'animate' : ''}`}>
          <h3 className="features-title">이런 기능들을 사용할 수 있어요</h3>
          
          <div className="features-grid">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="feature-card"
                style={{ 
                  animationDelay: `${index * 0.15}s`,
                  opacity: currentStep >= 2 ? 1 : 0 
                }}
              >
                <div className="feature-icon">{feature.icon}</div>
                <h4 className="feature-title">{feature.title}</h4>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 시작하기 버튼 */}
        <div className={`start-section ${currentStep >= 3 ? 'animate' : ''}`}>
          <div className="start-message">
            <p>준비가 되셨나요? 🚀</p>
          </div>
          
          <button 
            onClick={handleStartService}
            className="start-button"
          >
            <span className="start-button-icon">✨</span>
            <span className="start-button-text">서비스 이용하기</span>
            <span className="start-button-arrow">→</span>
          </button>

          <div className="additional-info">
            <p>
              언제든지 도움이 필요하시면 <strong>고객지원팀</strong>에 문의해주세요.<br/>
              <span className="email-link">support@myresumeuniverse.com</span>
            </p>
          </div>
        </div>

        {/* 장식 요소 */}
        <div className="decoration-elements">
          <div className="floating-element element-1">💫</div>
          <div className="floating-element element-2">🌟</div>
          <div className="floating-element element-3">✨</div>
          <div className="floating-element element-4">🎯</div>
          <div className="floating-element element-5">📄</div>
          <div className="floating-element element-6">💼</div>
        </div>
      </div>
    </div>
  )
}

export default WelcomePage