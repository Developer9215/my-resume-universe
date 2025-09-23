// src/components/auth/LoginForm.js
import React, { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import './LoginForm.css'

const LoginForm = () => {
  const [isSignUp, setIsSignUp] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isSignUp) {
        const { error } = await signUp(formData.email, formData.password, formData.name)
        if (error) throw error
        alert('회원가입이 완료되었습니다! 이메일을 확인해주세요.')
      } else {
        const { error } = await signIn(formData.email, formData.password)
        if (error) throw error
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="login-container">
      <div className="login-form-wrapper">
        <div className="login-header">
          <h1>My Resume Universe</h1>
          <p>{isSignUp ? '새 계정 만들기' : '계정에 로그인'}</p>
        </div>
        
        <form className="login-form" onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="form-group">
              <label htmlFor="name" className="form-label">이름</label>
              <input
                id="name"
                name="name"
                type="text"
                required={isSignUp}
                value={formData.name}
                onChange={handleInputChange}
                className="form-input"
                placeholder="이름을 입력하세요"
              />
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="email" className="form-label">이메일</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              className="form-input"
              placeholder="이메일을 입력하세요"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password" className="form-label">비밀번호</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleInputChange}
              className="form-input"
              placeholder="비밀번호를 입력하세요"
              minLength="6"
            />
          </div>

          {error && (
            <div className="alert alert-error">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? (
              <>
                <span className="spinner spinner-sm"></span>
                처리 중...
              </>
            ) : (
              isSignUp ? '회원가입' : '로그인'
            )}
          </button>

          <div className="login-switch">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="btn btn-ghost"
            >
              {isSignUp ? '이미 계정이 있나요? 로그인' : '계정이 없나요? 회원가입'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LoginForm
