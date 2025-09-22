// src/services/api.js
import { supabase } from './supabase'

// 사용자 경험 관련 API
export const experiencesAPI = {
  // 모든 경험 가져오기
  getAll: async (userId) => {
    const { data, error } = await supabase
      .from('user_experiences')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false })
    
    return { data, error }
  },

  // 경험 추가
  create: async (experience) => {
    const { data, error } = await supabase
      .from('user_experiences')
      .insert([experience])
      .select()
    
    return { data, error }
  },

  // 경험 수정
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('user_experiences')
      .update(updates)
      .eq('id', id)
      .select()
    
    return { data, error }
  },

  // 경험 삭제
  delete: async (id) => {
    const { data, error } = await supabase
      .from('user_experiences')
      .delete()
      .eq('id', id)
    
    return { data, error }
  }
}

// JD 관련 API
export const jdAPI = {
  // 모든 JD 가져오기
  getAll: async (userId) => {
    const { data, error } = await supabase
      .from('jds')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    return { data, error }
  },

  // JD 추가
  create: async (jd) => {
    const { data, error } = await supabase
      .from('jds')
      .insert([jd])
      .select()
    
    return { data, error }
  },

  // JD 삭제
  delete: async (id) => {
    const { data, error } = await supabase
      .from('jds')
      .delete()
      .eq('id', id)
    
    return { data, error }
  }
}

// 생성된 이력서 관련 API
export const resumeAPI = {
  // 모든 이력서 가져오기
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

  // 이력서 저장
  create: async (resume) => {
    const { data, error } = await supabase
      .from('generated_resumes')
      .insert([resume])
      .select()
    
    return { data, error }
  },

  // 이력서 삭제
  delete: async (id) => {
    const { data, error } = await supabase
      .from('generated_resumes')
      .delete()
      .eq('id', id)
    
    return { data, error }
  }
}