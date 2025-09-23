// File: src/services/api.js
import { supabase } from './supabase';

/**
 * Supabase의 기본 CRUD(Create, Read, Update, Delete) API를 생성하는 팩토리 함수입니다.
 * @param {string} tableName - Supabase 테이블의 이름입니다.
 * @param {string} [selectQuery='*'] - select 메서드에 사용할 쿼리 문자열입니다.
 * @returns {object} - 기본 CRUD 함수를 포함하는 객체입니다.
 */
const createSupabaseApi = (tableName, selectQuery = '*') => ({
  /**
   * 모든 데이터를 가져옵니다.
   * @param {string} userId - 사용자 ID
   * @param {string} orderBy - 정렬할 컬럼 이름
   * @param {boolean} ascending - 오름차순 여부 (기본값: true)
   * @returns {Promise<object>}
   */
  getAll: async (userId, orderBy, ascending = false) => {
    const query = supabase
      .from(tableName)
      .select(selectQuery)
      .eq('user_id', userId);
      
    if (orderBy) {
      query.order(orderBy, { ascending });
    } else {
      query.order('created_at', { ascending: false }); // 기본 정렬
    }
    
    const { data, error } = await query;
    return { data, error };
  },

  /**
   * 새로운 데이터를 추가합니다.
   * @param {object} item - 추가할 데이터 객체
   * @returns {Promise<object>}
   */
  create: async (item) => {
    const { data, error } = await supabase
      .from(tableName)
      .insert([item])
      .select(selectQuery);
    return { data, error };
  },

  /**
   * 데이터를 업데이트합니다.
   * @param {string} id - 업데이트할 데이터의 ID
   * @param {object} updates - 업데이트할 필드 객체
   * @returns {Promise<object>}
   */
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from(tableName)
      .update(updates)
      .eq('id', id)
      .select(selectQuery);
    return { data, error };
  },

  /**
   * 데이터를 삭제합니다.
   * @param {string} id - 삭제할 데이터의 ID
   * @returns {Promise<object>}
   */
  delete: async (id) => {
    const { data, error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);
    return { data, error };
  },
});

// 각 테이블별 API 인스턴스 생성
export const experiencesAPI = createSupabaseApi('user_experiences');
export const jdAPI = createSupabaseApi('jds');

// 이력서 API는 JOIN 쿼리가 필요하므로 별도로 정의합니다.
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
      .order('created_at', { ascending: false });
    return { data, error };
  },
  // 이력서 저장
  create: async (resume) => {
    const { data, error } = await supabase
      .from('generated_resumes')
      .insert([resume])
      .select();
    return { data, error };
  },
  // 이력서 삭제
  delete: async (id) => {
    const { data, error } = await supabase
      .from('generated_resumes')
      .delete()
      .eq('id', id);
    return { data, error };
  },
};
