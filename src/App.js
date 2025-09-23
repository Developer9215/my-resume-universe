// src/App.js
import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LoginForm from './components/auth/LoginForm'
import MainDashboard from './components/MainDashboard'
import AuthCallback from './pages/AuthCallback'
import WelcomePage from './pages/WelcomePage'
import Loading from './components/common/Loading'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, var(--primary-50) 0%, var(--primary-100) 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Loading size="large" />
          <p style={{ 
            marginTop: '1rem', 
            color: 'var(--gray-600)',
            fontSize: '1.1rem'
          }}>
            My Resume Universe 로딩 중...
          </p>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* 인증 콜백 라우트 (인증 상태 무관하게 접근 가능) */}
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          {/* 환영 페이지 라우트 (로그인된 사용자만) */}
          <Route 
            path="/welcome" 
            element={
              user ? <WelcomePage /> : <Navigate to="/login" replace />
            } 
          />
          
          {/* 로그인 페이지 */}
          <Route
            path="/login"
            element={
              user ? <Navigate to="/dashboard" replace /> : 
              <LoginForm onLogin={() => window.location.reload()} />
            }
          />
          
          {/* 대시보드 (메인 서비스) */}
          <Route 
            path="/dashboard" 
            element={
              user ? <MainDashboard /> : <Navigate to="/login" replace />
            } 
          />
          
          {/* 루트 경로 리다이렉트 */}
          <Route
            path="/"
            element={
              user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
            }
          />
          
          {/* 404 페이지 */}
          <Route 
            path="*" 
            element={
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: 'linear-gradient(135deg, var(--primary-50) 0%, var(--primary-100) 100%)',
                textAlign: 'center',
                padding: '2rem'
              }}>
                <h1 style={{ 
                  fontSize: '4rem', 
                  color: '#9ca3af', 
                  margin: '0 0 1rem 0' 
                }}>
                  404
                </h1>
                <h2 style={{ 
                  fontSize: '1.5rem', 
                  color: '#6b7280', 
                  margin: '0 0 2rem 0' 
                }}>
                  페이지를 찾을 수 없습니다
                </h2>
                <button 
                  onClick={() => window.location.href = user ? '/dashboard' : '/login'}
                  style={{
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {user ? '대시보드로 돌아가기' : '로그인 페이지로 이동'}
                </button>
              </div>
            } 
          />
        </Routes>
      </div>
    </Router>
  )
}

export default App