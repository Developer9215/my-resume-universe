// src/components/common/Loading.js
import React from 'react'
import './Loading.css'

const Loading = ({ message = '로딩 중...', size = 'md' }) => {
  return (
    <div className="loading-container">
      <div className={`spinner spinner-${size}`}></div>
      <p className="loading-message">{message}</p>
    </div>
  )
}

export default Loading