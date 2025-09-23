// src/pages/AuthCallback.js (환영 페이지 경유 버전)
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'

function AuthCallback() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('인증을 처리하고 있습니다...')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('AuthCallback 시작')
        console.log('현재 URL:', window.location.href)
        
        setMessage('세션을 확인하고 있습니다...')
        
        // Supabase가 자동으로 세션 처리하도록 기다림
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const { data: sessionData, error } = await supabase.auth.getSession()
        console.log('세션 데이터:', sessionData)
        console.log('세션 에러:', error)
        
        if (sessionData.session && sessionData.session.user) {
          setMessage('계정 정보를 설정하고 있습니다...')
          console.log('인증된 사용자:', sessionData.session.user.email)
          
          // 사용자 정보를 users 테이블에 저장
          const user = sessionData.session.user
          const { error: upsertError } = await supabase
            .from('users')
            .upsert({
              id: user.id,
              email: user.email,
              name: user.user_metadata?.name || user.email?.split('@')[0]
            }, {
              onConflict: 'id'
            })
          
          if (upsertError) {
            console.warn('사용자 정보 저장 에러:', upsertError)
          }
          
          // 신규 가입자인지 확인 (URL에서 type=signup 체크)
          const urlParams = new URLSearchParams(window.location.search)
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const authType = urlParams.get('type') || hashParams.get('type')
          const isNewUser = authType === 'signup'
          
          if (isNewUser) {
            setMessage('환영 페이지로 이동합니다...')
            setTimeout(() => {
              navigate('/welcome')
            }, 1500)
          } else {
            setMessage('대시보드로 이동합니다...')
            setTimeout(() => {
              navigate('/dashboard')
            }, 1500)
          }
        } else {
          setMessage('인증에 실패했습니다. 로그인 페이지로 이동합니다...')
          console.log('세션이 없음')
          setTimeout(() => {
            navigate('/login')
          }, 3000)
        }
      } catch (error) {
        console.error('AuthCallback 에러:', error)
        setMessage('오류가 발생했습니다. 로그인 페이지로 이동합니다...')
        setTimeout(() => {
          navigate('/login')
        }, 3000)
      }
    }

    handleAuthCallback()
  }, [navigate])

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        padding: '3rem',
        borderRadius: '1rem',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ 
          fontSize: '3rem', 
          marginBottom: '1rem',
          animation: 'spin 2s linear infinite'
        }}>
          ⏳
        </div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
          🌟 My Resume Universe
        </h1>
        <p style={{ fontSize: '1.1rem', marginBottom: '0' }}>
          {message}
        </p>
      </div>
      
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default AuthCallback