// src/components/auth/LoginForm.js
import React, { useState, useEffect } from 'react'
import { supabase } from '../../services/supabase'
import Loading from '../common/Loading'
import ErrorMessage from '../common/ErrorMessage'
import './LoginForm.css'

const LoginForm = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showEmailVerification, setShowEmailVerification] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  // 재전송 쿨다운 타이머
  useEffect(() => {
    let timer
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [resendCooldown])

  // 이메일 인증 상태 체크
  useEffect(() => {
    if (showEmailVerification) {
      const checkEmailConfirmation = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user && user.email_confirmed_at) {
          setShowEmailVerification(false)
          onLogin()
        }
      }

      // 5초마다 인증 상태 체크
      const interval = setInterval(checkEmailConfirmation, 5000)
      return () => clearInterval(interval)
    }
  }, [showEmailVerification, onLogin])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        // 로그인
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (error) {
          if (error.message.includes('Email not confirmed')) {
            setError('이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요.')
          } else if (error.message.includes('Invalid login credentials')) {
            setError('이메일 또는 비밀번호가 올바르지 않습니다.')
          } else {
            setError(error.message)
          }
          return
        }

        if (data.user) {
          onLogin()
        }
      } else {
        // 회원가입
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        })

        if (error) {
          if (error.message.includes('User already registered')) {
            setError('이미 등록된 이메일입니다. 로그인을 시도해주세요.')
          } else {
            setError(error.message)
          }
          return
        }

        if (data.user) {
          setRegisteredEmail(email)
          setShowEmailVerification(true)
        }
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return

    setLoading(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: registeredEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        setError('인증 메일 재전송에 실패했습니다.')
      } else {
        setResendCooldown(60) // 60초 쿨다운
        setError('') // 에러 메시지 클리어
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToLogin = () => {
    setShowEmailVerification(false)
    setIsLogin(true)
    setEmail('')
    setPassword('')
    setName('')
    setError('')
  }

  // 이메일 인증 대기 화면
  if (showEmailVerification) {
    return (
      <div className="auth-container">
        <div className="auth-card email-verification-card">
          <div className="verification-icon">
            <div className="email-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2" fill="none"/>
                <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
          </div>

          <h2 className="verification-title">이메일 인증을 확인해주세요</h2>
          
          <p className="verification-description">
            <strong>{registeredEmail}</strong>로 인증 메일을 발송했습니다.<br/>
            이메일을 확인하고 인증 링크를 클릭해주세요.
          </p>

          <div className="verification-steps">
            <div className="step">
              <span className="step-number">1</span>
              <span className="step-text">이메일 앱을 열어주세요</span>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <span className="step-text">My Resume Universe에서 온 메일을 찾아주세요</span>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <span className="step-text">"이메일 인증하기" 버튼을 클릭해주세요</span>
            </div>
          </div>

          <div className="verification-actions">
            <button 
              type="button"
              onClick={handleResendEmail}
              disabled={loading || resendCooldown > 0}
              className="btn btn-secondary"
            >
              {loading ? '전송 중...' : 
               resendCooldown > 0 ? `재전송 (${resendCooldown}초)` : 
               '인증 메일 재전송'}
            </button>

            <button 
              type="button"
              onClick={handleBackToLogin}
              className="btn btn-ghost"
            >
              다른 이메일로 가입하기
            </button>
          </div>

          <div className="verification-help">
            <details className="help-details">
              <summary>메일이 오지 않나요?</summary>
              <div className="help-content">
                <ul>
                  <li><strong>스팸함을 확인해주세요</strong> - 간혹 스팸함에 들어갈 수 있습니다</li>
                  <li><strong>이메일 주소를 확인해주세요</strong> - 오타가 있을 수 있습니다</li>
                  <li><strong>몇 분 기다려주세요</strong> - 메일 전송에 시간이 걸릴 수 있습니다</li>
                  <li><strong>재전송 버튼을 눌러주세요</strong> - 메일을 다시 보낼 수 있습니다</li>
                </ul>
              </div>
            </details>
          </div>

          <div className="auto-check-notice">
            <div className="pulse-dot"></div>
            <span>인증 완료를 자동으로 확인하고 있습니다...</span>
          </div>
        </div>
      </div>
    )
  }

  // 일반 로그인/회원가입 폼
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">
            🌟 My Resume Universe
          </h1>
          <p className="auth-subtitle">
            {isLogin ? '다시 만나서 반가워요!' : 'AI와 함께 완벽한 이력서를 만들어보세요'}
          </p>
        </div>

        <div className="auth-tabs">
          <button 
            type="button"
            className={`tab ${isLogin ? 'active' : ''}`}
            onClick={() => {
              setIsLogin(true)
              setError('')
            }}
          >
            로그인
          </button>
          <button 
            type="button"
            className={`tab ${!isLogin ? 'active' : ''}`}
            onClick={() => {
              setIsLogin(false)
              setError('')
            }}
          >
            회원가입
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">이름</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                required
                className="form-input"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isLogin ? "비밀번호를 입력하세요" : "8자 이상 입력하세요"}
              required
              minLength={isLogin ? undefined : 8}
              className="form-input"
            />
            {!isLogin && (
              <p className="form-help">
                비밀번호는 8자 이상이어야 합니다
              </p>
            )}
          </div>

          {error && <ErrorMessage message={error} />}

          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary auth-submit"
          >
            {loading ? <Loading size="small" /> : (isLogin ? '로그인' : '회원가입')}
          </button>
        </form>

        {!isLogin && (
          <div className="signup-notice">
            <p>
              회원가입 시 이메일 인증이 필요합니다.<br/>
              가입 후 이메일을 확인해주세요.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default LoginForm