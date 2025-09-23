// src/services/ai.js - 리팩토링 버전
// 이제 api.js와 중복되지 않도록 헬퍼 함수들만 유지

// File 객체를 base64로 변환하는 헬퍼 함수
export const convertFileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

// 이미지 전처리 헬퍼 함수
export const preprocessImages = async (images) => {
  console.log('이미지 전처리 시작, 이미지 개수:', images.length);
  
  if (!images || images.length === 0) {
    throw new Error('분석할 이미지가 없습니다.');
  }

  try {
    // 모든 이미지를 base64로 변환
    const processedImages = await Promise.all(
      images.map(async (image, index) => {
        console.log(`이미지 ${index} 형태:`, typeof image);
        
        if (typeof image === 'string') {
          // 이미 base64 문자열인 경우
          return image;
        } else if (image instanceof File) {
          // File 객체인 경우 base64로 변환
          console.log(`File 객체를 base64로 변환 중: ${image.name}`);
          const base64 = await convertFileToBase64(image);
          return base64;
        } else if (image && typeof image === 'object') {
          // 다른 객체 형태 처리
          if (image.base64) {
            return image.base64;
          } else if (image.src) {
            return image.src;
          } else if (image.data) {
            return image.data;
          } else if (image.content) {
            return image.content;
          } else {
            console.warn('알 수 없는 객체 형태:', Object.keys(image));
            return null;
          }
        } else {
          console.warn('처리할 수 없는 이미지 형태:', typeof image);
          return null;
        }
      })
    );

    // null 값 제거
    const validImages = processedImages.filter(image => image !== null);
    console.log('처리된 이미지 개수:', validImages.length);

    if (validImages.length === 0) {
      throw new Error('처리 가능한 이미지가 없습니다. 이미지 형태를 확인해주세요.');
    }

    return validImages;

  } catch (error) {
    console.error('이미지 전처리 오류:', error.message);
    throw error;
  }
};

// 분석 결과 검증 함수
export const validateAnalysisResult = (analysis) => {
  const requiredFields = ['company_name', 'position', 'summary', 'keywords'];
  const missingFields = requiredFields.filter(field => !analysis[field]);
  
  if (missingFields.length > 0) {
    console.warn('분석 결과에서 누락된 필드:', missingFields);
  }

  // 기본값 설정
  return {
    company_name: analysis.company_name || '정보 부족',
    position: analysis.position || '정보 부족',
    summary: analysis.summary || '분석 결과가 불완전합니다.',
    keywords: analysis.keywords || [],
    requirements: analysis.requirements || '정보 부족',
    preferences: analysis.preferences || '정보 부족',
    key_responsibilities: analysis.key_responsibilities || '정보 부족',
    tech_stack: analysis.tech_stack || {
      frontend: [],
      backend: [],
      tools: [],
      database: []
    },
    employment_details: analysis.employment_details || {
      type: '정보 부족',
      experience: '정보 부족',
      location: '정보 부족',
      salary: '정보 부족'
    },
    welfare: analysis.welfare || [],
    source_analysis: analysis.source_analysis || {
      extraction_method: '기본 분석'
    },
    ...analysis // 나머지 필드들도 포함
  };
};

// 에러 메시지 정규화 함수
export const normalizeErrorMessage = (error) => {
  if (error.response?.data?.error) {
    return error.response.data.error;
  } else if (error.message) {
    return error.message;
  } else {
    return '알 수 없는 오류가 발생했습니다.';
  }
};

// 분석 결과 요약 생성 함수
export const generateAnalysisSummary = (analysis) => {
  const summary = {
    title: `${analysis.company_name || '회사'} - ${analysis.position || '포지션'}`,
    subtitle: analysis.employment_details?.location || '위치 정보 없음',
    tags: [
      ...(analysis.keywords || []).slice(0, 3),
      analysis.employment_details?.type || '고용형태 불명'
    ].filter(Boolean),
    techStack: [
      ...(analysis.tech_stack?.frontend || []),
      ...(analysis.tech_stack?.backend || []),
      ...(analysis.tech_stack?.tools || [])
    ].slice(0, 5),
    hasDetailedInfo: !!(
      analysis.requirements && 
      analysis.preferences && 
      analysis.key_responsibilities &&
      analysis.requirements !== '정보 부족'
    )
  };

  return summary;
};

// 로컬 스토리지 헬퍼 함수들
export const storageHelpers = {
  // 최근 분석 결과 저장 (캐시용)
  saveRecentAnalysis: (analysis) => {
    try {
      const recent = JSON.parse(localStorage.getItem('recentAnalyses') || '[]');
      recent.unshift({
        ...analysis,
        timestamp: new Date().toISOString()
      });
      
      // 최대 5개까지만 저장
      const trimmed = recent.slice(0, 5);
      localStorage.setItem('recentAnalyses', JSON.stringify(trimmed));
    } catch (error) {
      console.warn('최근 분석 결과 저장 실패:', error);
    }
  },

  // 최근 분석 결과 조회
  getRecentAnalyses: () => {
    try {
      return JSON.parse(localStorage.getItem('recentAnalyses') || '[]');
    } catch (error) {
      console.warn('최근 분석 결과 조회 실패:', error);
      return [];
    }
  },

  // 사용자 설정 저장
  saveUserPreferences: (preferences) => {
    try {
      localStorage.setItem('userPreferences', JSON.stringify(preferences));
    } catch (error) {
      console.warn('사용자 설정 저장 실패:', error);
    }
  },

  // 사용자 설정 조회
  getUserPreferences: () => {
    try {
      return JSON.parse(localStorage.getItem('userPreferences') || '{}');
    } catch (error) {
      console.warn('사용자 설정 조회 실패:', error);
      return {};
    }
  }
};

// 분석 결과 필터링 및 정렬 헬퍼
export const analysisFilters = {
  // 회사명으로 필터링
  byCompany: (analyses, companyName) => {
    return analyses.filter(analysis => 
      analysis.result_data?.company_name?.toLowerCase().includes(companyName.toLowerCase())
    );
  },

  // 포지션으로 필터링
  byPosition: (analyses, position) => {
    return analyses.filter(analysis => 
      analysis.result_data?.position?.toLowerCase().includes(position.toLowerCase())
    );
  },

  // 기술 스택으로 필터링
  byTechStack: (analyses, techStack) => {
    return analyses.filter(analysis => {
      const allTechs = [
        ...(analysis.result_data?.tech_stack?.frontend || []),
        ...(analysis.result_data?.tech_stack?.backend || []),
        ...(analysis.result_data?.tech_stack?.tools || []),
        ...(analysis.result_data?.tech_stack?.database || [])
      ];
      return allTechs.some(tech => 
        tech.toLowerCase().includes(techStack.toLowerCase())
      );
    });
  },

  // 날짜로 정렬
  sortByDate: (analyses, ascending = false) => {
    return [...analyses].sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return ascending ? dateA - dateB : dateB - dateA;
    });
  }
};

// 텍스트 처리 유틸리티
export const textUtils = {
  // 텍스트에서 키워드 추출
  extractKeywords: (text, limit = 10) => {
    const words = text.toLowerCase()
      .replace(/[^\w\s가-힣]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([word]) => word);
  },

  // 텍스트 요약 (간단한 버전)
  summarize: (text, maxLength = 200) => {
    if (text.length <= maxLength) return text;
    
    const sentences = text.split(/[.!?]/).filter(s => s.trim());
    let summary = '';
    
    for (const sentence of sentences) {
      if ((summary + sentence).length > maxLength) break;
      summary += sentence + '. ';
    }
    
    return summary.trim() || text.substring(0, maxLength) + '...';
  }
};

// 디버깅 및 로깅 헬퍼
export const debugHelpers = {
  logAnalysisResult: (analysis, label = '분석 결과') => {
    if (process.env.NODE_ENV === 'development') {
      console.group(`🔍 ${label}`);
      console.log('회사명:', analysis.company_name);
      console.log('포지션:', analysis.position);
      console.log('키워드:', analysis.keywords);
      console.log('기술 스택:', analysis.tech_stack);
      console.groupEnd();
    }
  },

  logPerformance: (label, fn) => {
    return async (...args) => {
      if (process.env.NODE_ENV === 'development') {
        console.time(label);
      }
      
      try {
        const result = await fn(...args);
        return result;
      } finally {
        if (process.env.NODE_ENV === 'development') {
          console.timeEnd(label);
        }
      }
    };
  }
};