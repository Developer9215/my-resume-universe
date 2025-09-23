// src/services/api.js - 완전 수정 버전
import { supabase } from './supabase'
import axios from 'axios'

const API_BASE_URL = 'http://localhost:5000/api'

// 현재 사용자 정보를 가져오는 헬퍼 함수
const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      console.error('사용자 정보 조회 오류:', error)
      return null
    }
    return user
  } catch (error) {
    console.error('사용자 인증 확인 중 오류:', error)
    return null
  }
}

// API 요청에 사용자 정보를 포함하는 헬퍼 함수
const makeAuthenticatedRequest = async (url, data, method = 'POST') => {
  const user = await getCurrentUser()
  const requestData = {
    ...data,
    user_id: user?.id || null
  }

  console.log(`API 요청 (${method}):`, url, '사용자:', user?.id)

  if (method === 'GET') {
    const response = await axios.get(url, { 
      params: requestData,
      timeout: 30000
    })
    return response.data
  } else {
    const response = await axios({
      method,
      url,
      data: requestData,
      timeout: 30000
    })
    return response.data
  }
}

// 통합된 JD 관리 API
export const jdAPI = {
  // JD 분석 (백엔드 서버 사용) - 사용자 정보 자동 포함
  analyze: {
    text: async (content) => {
      try {
        console.log('텍스트 분석 요청 시작, 길이:', content?.length);
        
        const response = await makeAuthenticatedRequest(`${API_BASE_URL}/analyze-text`, { content });
        
        console.log('백엔드 응답 구조:', {
          success: response.success,
          hasData: !!response.data,
          hasError: !!response.error
        });
        
        if (!response) {
          throw new Error('백엔드로부터 응답을 받지 못했습니다.');
        }
        
        if (response.success === false) {
          throw new Error(response.error || '백엔드에서 분석 실패');
        }
        
        if (!response.data) {
          throw new Error('응답에 분석 데이터가 없습니다.');
        }
        
        return response.data;
        
      } catch (error) {
        console.error('텍스트 분석 API 상세 오류:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        throw new Error(error.response?.data?.error || error.message || '텍스트 분석 실패');
      }
    },
    
    image: async (images) => {
      try {
        console.log('이미지 분석 요청 시작, 이미지 개수:', images?.length);
        
        const response = await makeAuthenticatedRequest(`${API_BASE_URL}/analyze-image`, { images });
        
        if (!response || response.success === false) {
          throw new Error(response?.error || '이미지 분석 실패');
        }
        
        return response.data;
        
      } catch (error) {
        console.error('이미지 분석 API 오류:', error);
        throw new Error(error.response?.data?.error || error.message || '이미지 분석 실패');
      }
    },
    
    url: async (url) => {
      try {
        console.log('URL 분석 요청 시작:', url);
        
        const response = await makeAuthenticatedRequest(`${API_BASE_URL}/crawl-and-analyze`, { url });
        
        if (!response || response.success === false) {
          throw new Error(response?.error || 'URL 분석 실패');
        }
        
        return response.data;
        
      } catch (error) {
        console.error('URL 분석 API 오류:', error);
        throw new Error(error.response?.data?.error || error.message || 'URL 분석 실패');
      }
    }
  },

  // 분석 결과 조회 (백엔드 서버 사용 - analysis_results 테이블)
  getAnalysisHistory: async (options = {}) => {
    try {
      const { page = 1, limit = 20, search = '' } = options
      const user = await getCurrentUser()
      
      if (!user) {
        throw new Error('로그인이 필요합니다.')
      }

      const response = await axios.get(`${API_BASE_URL}/analysis-history`, {
        params: { page, limit, search, user_id: user.id },
        timeout: 30000
      })
      
      if (!response.data.success) {
        throw new Error(response.data.error || '분석 히스토리 조회 실패')
      }
      
      return response.data.data
    } catch (error) {
      console.error('분석 히스토리 조회 API 오류:', error)
      throw error
    }
  },

  // 특정 분석 결과 상세 조회
  getAnalysisDetail: async (id) => {
    try {
      const user = await getCurrentUser()
      
      if (!user) {
        throw new Error('로그인이 필요합니다.')
      }

      const response = await axios.get(`${API_BASE_URL}/analysis/${id}`, {
        params: { user_id: user.id },
        timeout: 30000
      })
      
      if (!response.data.success) {
        throw new Error(response.data.error || '분석 결과 조회 실패')
      }
      
      return response.data.data
    } catch (error) {
      console.error('분석 결과 상세 조회 API 오류:', error)
      throw error
    }
  },

  // 분석 결과 삭제
  deleteAnalysis: async (id) => {
    try {
      const user = await getCurrentUser()
      
      if (!user) {
        throw new Error('로그인이 필요합니다.')
      }

      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/analysis/${id}`, {}, 'DELETE')
      
      if (!response.success) {
        throw new Error(response.error || '분석 결과 삭제 실패')
      }
      
      return response.data
    } catch (error) {
      console.error('분석 결과 삭제 API 오류:', error)
      throw error
    }
  },

  // 기존 JD 관리 (Supabase 직접 - 호환성 유지)
  legacy: {
    getAll: async (userId) => {
      const { data, error } = await supabase
        .from('jds')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      return { data, error }
    },

    create: async (jd) => {
      const { data, error } = await supabase
        .from('jds')
        .insert([jd])
        .select()
      
      return { data, error }
    },

    delete: async (id) => {
      const { data, error } = await supabase
        .from('jds')
        .delete()
        .eq('id', id)
      
      return { data, error }
    }
  }
}

// 사용자 경험 관련 API (기존 유지)
export const experiencesAPI = {
  getAll: async (userId) => {
    const { data, error } = await supabase
      .from('user_experiences')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false })
    
    return { data, error }
  },

  create: async (experience) => {
    const { data, error } = await supabase
      .from('user_experiences')
      .insert([experience])
      .select()
    
    return { data, error }
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('user_experiences')
      .update(updates)
      .eq('id', id)
      .select()
    
    return { data, error }
  },

  delete: async (id) => {
    const { data, error } = await supabase
      .from('user_experiences')
      .delete()
      .eq('id', id)
    
    return { data, error }
  }
}

// 이력서 관련 API (백엔드로 통합)
export const resumeAPI = {
  // 이력서 생성 (백엔드 서버)
  generate: async (jdAnalysis, userExperiences) => {
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/generate-resume`, {
        jdAnalysis,
        userExperiences
      })
      
      if (!response.success) {
        throw new Error(response.error || '이력서 생성 실패')
      }
      
      return response.data.resume
    } catch (error) {
      console.error('이력서 생성 API 오류:', error)
      throw error
    }
  },

  // 면접 질문 생성 (백엔드 서버)
  generateQuestions: async (jdAnalysis, resumeContent) => {
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/generate-questions`, {
        jdAnalysis,
        resumeContent
      })
      
      if (!response.success) {
        throw new Error(response.error || '면접 질문 생성 실패')
      }
      
      return response.data.questions
    } catch (error) {
      console.error('면접 질문 생성 API 오류:', error)
      throw error
    }
  },

  // 자기소개 문구 생성 (백엔드 서버)
  generateStatement: async (jdAnalysis, userExperiences) => {
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/generate-statement`, {
        jdAnalysis,
        userExperiences
      })
      
      if (!response.success) {
        throw new Error(response.error || '자기소개 문구 생성 실패')
      }
      
      return response.data.statement
    } catch (error) {
      console.error('자기소개 문구 생성 API 오류:', error)
      throw error
    }
  },

  // 기존 저장된 이력서 관리 (Supabase 직접)
  legacy: {
    getAll: async (userId) => {
      const { data, error } = await supabase
        .from('generated_resumes')
        .select(`
          *,
          jds (title)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      return { data, error }
    },

    create: async (resume) => {
      const { data, error } = await supabase
        .from('generated_resumes')
        .insert([resume])
        .select()
      
      return { data, error }
    },

    delete: async (id) => {
      const { data, error } = await supabase
        .from('generated_resumes')
        .delete()
        .eq('id', id)
      
      return { data, error }
    }
  }
}

// 통계 및 대시보드 API
export const statsAPI = {
  getAnalysisStats: async () => {
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/analysis-stats`, {}, 'GET')
      
      if (!response.success) {
        throw new Error(response.error || '통계 조회 실패')
      }
      
      return response.data
    } catch (error) {
      console.error('통계 조회 API 오류:', error)
      throw error
    }
  }
}

// 에러 처리 헬퍼
export const handleAPIError = (error) => {
  console.error('API 오류 상세:', error)
  
  if (error.response) {
    // 백엔드 서버 에러
    const errorData = error.response.data
    return errorData.error || errorData.message || '서버 오류가 발생했습니다.'
  } else if (error.error) {
    // Supabase 에러
    return error.error.message || '데이터베이스 오류가 발생했습니다.'
  } else {
    // 기타 에러
    return error.message || '알 수 없는 오류가 발생했습니다.'
  }
}

// 사용자 인증 상태 확인 헬퍼
export const authUtils = {
  // 현재 사용자 정보 조회
  getCurrentUser,
  
  // 로그인 상태 확인
  isAuthenticated: async () => {
    const user = await getCurrentUser()
    return !!user
  },
  
  // 사용자 ID 조회
  getUserId: async () => {
    const user = await getCurrentUser()
    return user?.id || null
  }
}