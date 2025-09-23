// src/components/settings/AccountSettings.js (수정된 버전)
import React, { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../services/supabase'
import ErrorMessage from '../common/ErrorMessage'
import Modal from '../common/Modal'
import './AccountSettings.css'

const AccountSettings = ({ onBackToMain }) => {
  const { user, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // 프로필 수정 상태
  const [profileData, setProfileData] = useState({
    name: user?.user_metadata?.name || '',
    email: user?.email || ''
  })

  // 비밀번호 변경 상태
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // 회원탈퇴 모달 상태
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const tabs = [
    { id: 'profile', name: '프로필', icon: '👤' },
    { id: 'password', name: '비밀번호', icon: '🔒' },
    { id: 'account', name: '계정 관리', icon: '⚙️' }
  ]

  // 프로필 업데이트
  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // 이름 업데이트
      const { error: updateError } = await supabase.auth.updateUser({
        data: { name: profileData.name }
      })
      
      if (updateError) throw updateError

      // users 테이블도 업데이트
      const { error: dbError } = await supabase
        .from('users')
        .update({ name: profileData.name })
        .eq('id', user.id)

      if (dbError) throw dbError

      setSuccess('프로필이 성공적으로 업데이트되었습니다.')
    } catch (error) {
      setError('프로필 업데이트 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // 비밀번호 변경
  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // 비밀번호 확인
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.')
      setLoading(false)
      return
    }

    if (passwordData.newPassword.length < 6) {
      setError('새 비밀번호는 최소 6자 이상이어야 합니다.')
      setLoading(false)
      return
    }

    try {
      // 현재 비밀번호 확인을 위해 재로그인 시도
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordData.currentPassword
      })

      if (signInError) {
        throw new Error('현재 비밀번호가 올바르지 않습니다.')
      }

      // 비밀번호 업데이트
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (updateError) throw updateError

      setSuccess('비밀번호가 성공적으로 변경되었습니다.')
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // 회원탈퇴
  const handleAccountDeletion = async () => {
    if (deleteConfirmText !== '회원탈퇴') {
      setError('정확히 "회원탈퇴"를 입력해주세요.')
      return
    }

    setLoading(true)
    setError('')

    try {
      // 사용자 데이터 삭제 (관련 데이터들이 cascade로 삭제됨)
      const { error: deleteDataError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id)

      if (deleteDataError) throw deleteDataError

      // 사용자 계정 삭제 (Supabase Auth)
      alert('회원탈퇴가 완료되었습니다. 이용해주셔서 감사합니다.')
      await signOut()
    } catch (error) {
      setError('회원탈퇴 처리 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setLoading(false)
      setShowDeleteModal(false)
    }
  }

  // 모든 데이터 다운로드
  const handleDataExport = async () => {
    setLoading(true)
    setError('')

    try {
      // 사용자의 모든 데이터 가져오기
      const [experiencesRes, jdsRes, resumesRes] = await Promise.all([
        supabase.from('user_experiences').select('*').eq('user_id', user.id),
        supabase.from('jds').select('*').eq('user_id', user.id),
        supabase.from('generated_resumes').select('*').eq('user_id', user.id)
      ])

      const exportData = {
        user: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name,
          created_at: user.created_at
        },
        experiences: experiencesRes.data || [],
        jds: jdsRes.data || [],
        resumes: resumesRes.data || [],
        exported_at: new Date().toISOString()
      }

      // JSON 파일로 다운로드
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `resume-universe-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setSuccess('데이터가 성공적으로 다운로드되었습니다.')
    } catch (error) {
      setError('데이터 내보내기 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard">
      {/* 헤더 유지 */}
      <header className="dashboard-header">
        <div className="container">
          <div className="header-content">
            <div className="header-left">
              <button 
                onClick={onBackToMain}
                className="btn btn-ghost btn-sm back-button"
                title="메인으로 돌아가기"
              >
                ← 메인으로
              </button>
              <h1 className="dashboard-title">⚙️ 계정 설정</h1>
            </div>
            <div className="header-actions">
              <span className="user-info">안녕하세요, {user?.email}님!</span>
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
          <div className="settings-content">
            {/* 설정 탭 네비게이션 */}
            <div className="settings-tabs">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <span className="tab-icon">{tab.icon}</span>
                  <span className="tab-label">{tab.name}</span>
                </button>
              ))}
            </div>

            {/* 알림 메시지 */}
            {error && <ErrorMessage message={error} type="error" />}
            {success && (
              <div className="alert alert-success">
                ✅ {success}
              </div>
            )}

            {/* 탭 컨텐츠 */}
            <div className="tab-content">
              {/* 프로필 탭 */}
              {activeTab === 'profile' && (
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">👤 프로필 정보</h3>
                    <p className="card-subtitle">기본 정보를 수정할 수 있습니다.</p>
                  </div>
                  <div className="card-body">
                    <form onSubmit={handleProfileUpdate} className="profile-form">
                      <div className="form-group">
                        <label htmlFor="email" className="form-label">이메일</label>
                        <input
                          id="email"
                          type="email"
                          value={profileData.email}
                          className="form-input"
                          disabled
                        />
                        <small className="form-help">이메일은 변경할 수 없습니다.</small>
                      </div>

                      <div className="form-group">
                        <label htmlFor="name" className="form-label">이름</label>
                        <input
                          id="name"
                          type="text"
                          value={profileData.name}
                          onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                          className="form-input"
                          placeholder="이름을 입력하세요"
                          required
                        />
                      </div>

                      <div className="form-actions">
                        <button
                          type="submit"
                          disabled={loading}
                          className="btn btn-primary"
                        >
                          {loading ? '업데이트 중...' : '프로필 업데이트'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* 비밀번호 탭 */}
              {activeTab === 'password' && (
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">🔒 비밀번호 변경</h3>
                    <p className="card-subtitle">보안을 위해 정기적으로 비밀번호를 변경하세요.</p>
                  </div>
                  <div className="card-body">
                    <form onSubmit={handlePasswordChange} className="password-form">
                      <div className="form-group">
                        <label htmlFor="currentPassword" className="form-label">현재 비밀번호</label>
                        <input
                          id="currentPassword"
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                          className="form-input"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="newPassword" className="form-label">새 비밀번호</label>
                        <input
                          id="newPassword"
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="form-input"
                          minLength="6"
                          required
                        />
                        <small className="form-help">최소 6자 이상 입력하세요.</small>
                      </div>

                      <div className="form-group">
                        <label htmlFor="confirmPassword" className="form-label">새 비밀번호 확인</label>
                        <input
                          id="confirmPassword"
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="form-input"
                          required
                        />
                      </div>

                      <div className="form-actions">
                        <button
                          type="submit"
                          disabled={loading}
                          className="btn btn-primary"
                        >
                          {loading ? '변경 중...' : '비밀번호 변경'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* 계정 관리 탭 */}
              {activeTab === 'account' && (
                <div className="account-management">
                  {/* 데이터 내보내기 */}
                  <div className="card mb-6">
                    <div className="card-header">
                      <h3 className="card-title">📤 데이터 내보내기</h3>
                      <p className="card-subtitle">모든 데이터를 JSON 파일로 다운로드할 수 있습니다.</p>
                    </div>
                    <div className="card-body">
                      <p className="mb-4">
                        경험, JD 분석 결과, 생성된 이력서 등 모든 데이터를 백업용으로 다운로드할 수 있습니다.
                      </p>
                      <button
                        onClick={handleDataExport}
                        disabled={loading}
                        className="btn btn-secondary"
                      >
                        {loading ? '준비 중...' : '📥 데이터 다운로드'}
                      </button>
                    </div>
                  </div>

                  {/* 계정 정보 */}
                  <div className="card mb-6">
                    <div className="card-header">
                      <h3 className="card-title">📊 계정 정보</h3>
                    </div>
                    <div className="card-body">
                      <div className="account-info">
                        <div className="info-item">
                          <span className="info-label">가입일:</span>
                          <span className="info-value">
                            {new Date(user?.created_at).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">사용자 ID:</span>
                          <span className="info-value">{user?.id}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">이메일 인증:</span>
                          <span className={`info-value ${user?.email_confirmed_at ? 'verified' : 'unverified'}`}>
                            {user?.email_confirmed_at ? '✅ 인증됨' : '❌ 미인증'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 위험 구역 */}
                  <div className="card danger-zone">
                    <div className="card-header">
                      <h3 className="card-title">⚠️ 위험 구역</h3>
                      <p className="card-subtitle">신중하게 진행하세요. 이 작업들은 되돌릴 수 없습니다.</p>
                    </div>
                    <div className="card-body">
                      <div className="danger-action">
                        <div className="danger-info">
                          <h4>회원탈퇴</h4>
                          <p>계정과 모든 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.</p>
                        </div>
                        <button
                          onClick={() => setShowDeleteModal(true)}
                          className="btn btn-error"
                        >
                          회원탈퇴
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 회원탈퇴 확인 모달 */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="⚠️ 회원탈퇴 확인"
        maxWidth="md"
      >
        <div className="delete-modal-content">
          <div className="warning-message">
            <p className="mb-4">
              <strong>정말로 회원탈퇴를 진행하시겠습니까?</strong>
            </p>
            <p className="mb-4">
              탈퇴 시 다음 데이터들이 <strong>영구적으로 삭제</strong>됩니다:
            </p>
            <ul className="delete-list">
              <li>• 모든 경험 데이터</li>
              <li>• JD 분석 결과</li>
              <li>• 생성된 이력서</li>
              <li>• 계정 정보</li>
            </ul>
            <p className="mt-4 mb-4">
              이 작업은 <strong>되돌릴 수 없습니다</strong>.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">
              계속하려면 <strong>"회원탈퇴"</strong>를 정확히 입력하세요:
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="form-input"
              placeholder="회원탈퇴"
            />
          </div>

          <div className="modal-actions">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="btn btn-secondary"
              disabled={loading}
            >
              취소
            </button>
            <button
              onClick={handleAccountDeletion}
              disabled={loading || deleteConfirmText !== '회원탈퇴'}
              className="btn btn-error"
            >
              {loading ? '처리 중...' : '영구 삭제'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default AccountSettings