// src/components/auth/AuthDebug.js (개발용)
import React, { useState, useEffect } from 'react'
import { supabase } from '../../services/supabase'

const AuthDebug = () => {
  const [debugInfo, setDebugInfo] = useState({})
  const [session, setSession] = useState(null)

  useEffect(() => {
    const checkAuth = async () => {
      // 현재 URL 정보
      const urlInfo = {
        href: window.location.href,
        search: window.location.search,
        hash: window.location.hash,
        pathname: window.location.pathname
      }

      // URL 파라미터 파싱
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const urlParams = new URLSearchParams(window.location.search)
      
      const parsedParams = {
        access_token: hashParams.get('access_token') || urlParams.get('access_token'),
        refresh_token: hashParams.get('refresh_token') || urlParams.get('refresh_token'),
        error: hashParams.get('error') || urlParams.get('error'),
        error_description: hashParams.get('error_description') || urlParams.get('error_description'),
        token_hash: hashParams.get('token_hash') || urlParams.get('token_hash'),
        type: hashParams.get('type') || urlParams.get('type')
      }

      // Supabase 세션 정보
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      const { data: userData, error: userError } = await supabase.auth.getUser()

      setDebugInfo({
        url: urlInfo,
        params: parsedParams,
        sessionData,
        sessionError,
        userData,
        userError,
        timestamp: new Date().toISOString()
      })

      setSession(sessionData?.session)
    }

    checkAuth()

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session)
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleManualLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'test123456'
    })
    console.log('Manual login result:', { data, error })
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    console.log('Logout result:', { error })
  }

  return (
    <div style={{ 
      padding: '2rem', 
      fontFamily: 'monospace', 
      fontSize: '12px',
      background: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <h1>🔍 Auth Debug Information</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2>Current Session</h2>
        {session ? (
          <div style={{ background: '#e8f5e8', padding: '1rem' }}>
            <p><strong>User ID:</strong> {session.user?.id}</p>
            <p><strong>Email:</strong> {session.user?.email}</p>
            <p><strong>Confirmed:</strong> {session.user?.email_confirmed_at ? 'Yes' : 'No'}</p>
            <button onClick={handleLogout}>Logout</button>
          </div>
        ) : (
          <div style={{ background: '#f5e8e8', padding: '1rem' }}>
            <p>No active session</p>
            <button onClick={handleManualLogin}>Test Login</button>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>Debug Information</h2>
        <pre style={{ 
          background: 'white', 
          padding: '1rem', 
          overflow: 'auto',
          border: '1px solid #ccc'
        }}>
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>

      <div>
        <h2>Quick Actions</h2>
        <button onClick={() => window.location.href = '/auth/callback'}>
          Go to Auth Callback
        </button>
        <button onClick={() => window.location.href = '/welcome'}>
          Go to Welcome
        </button>
        <button onClick={() => window.location.href = '/dashboard'}>
          Go to Dashboard
        </button>
      </div>
    </div>
  )
}

export default AuthDebug