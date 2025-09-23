// src/components/common/ErrorMessage.js
import React from 'react'
import './ErrorMessage.css'

const ErrorMessage = ({ message, onRetry, type = 'error' }) => {
  return (
    <div className={`error-container alert-${type}`}>
      <div className="error-content">
        <div className="error-icon">
          {type === 'error' && '⚠️'}
          {type === 'warning' && '⚠️'}
          {type === 'info' && 'ℹ️'}
        </div>
        <div className="error-details">
          <h3 className="error-title">
            {type === 'error' && '오류가 발생했습니다'}
            {type === 'warning' && '주의사항'}
            {type === 'info' && '알림'}
          </h3>
          <p className="error-message">{message}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="btn btn-sm btn-secondary mt-2"
            >
              다시 시도
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ErrorMessage
