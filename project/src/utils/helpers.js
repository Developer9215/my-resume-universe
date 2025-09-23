// src/utils/helpers.js
export const formatDate = (dateString, format = 'YYYY.MM') => {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    
    switch (format) {
      case 'YYYY.MM':
        return `${year}.${month}`
      case 'YYYY.MM.DD':
        return `${year}.${month}.${day}`
      case 'YYYY년 MM월':
        return `${year}년 ${month}월`
      default:
        return `${year}.${month}`
    }
  } catch (error) {
    return dateString
  }
}

export const formatDateRange = (startDate, endDate) => {
  const start = formatDate(startDate)
  const end = endDate ? formatDate(endDate) : '현재'
  return `${start} ~ ${end}`
}

export const calculateDuration = (startDate, endDate) => {
  if (!startDate) return ''
  
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date()
  
  const diffTime = Math.abs(end - start)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffMonths / 12)
  
  if (diffYears >= 1) {
    const remainingMonths = diffMonths % 12
    return remainingMonths > 0 
      ? `${diffYears}년 ${remainingMonths}개월`
      : `${diffYears}년`
  } else if (diffMonths >= 1) {
    return `${diffMonths}개월`
  } else {
    return '1개월 미만'
  }
}

export const truncateText = (text, maxLength = 100) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export const parseSkills = (skillsInput) => {
  if (Array.isArray(skillsInput)) return skillsInput
  if (typeof skillsInput === 'string') {
    return skillsInput
      .split(',')
      .map(skill => skill.trim())
      .filter(skill => skill.length > 0)
  }
  return []
}