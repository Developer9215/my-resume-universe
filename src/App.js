// src/App.js (BOM 문제 해결)
import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LoginForm from './components/auth/LoginForm'
import MainDashboard from './components/MainDashboard'
import Loading from './components/common/Loading'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return <Loading message="앱을 불러오는 중..." size="lg" />
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route
            path="/"
            element={user ? <MainDashboard /> : <Navigate to="/login" />}
          />
          <Route
            path="/login"
            element={!user ? <LoginForm /> : <Navigate to="/" />}
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App