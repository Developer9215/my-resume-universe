import axios from 'axios';
import { useState, useCallback } from 'react';

// AI API 설정
const AI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
const AI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL_NAME = 'gpt-4o'; // 이미지 분석을 위해 gpt-4o 사용

// AI API 호출 함수 (텍스트 및 이미지 지원)
const callAI = async (messages, temperature = 0.7) => {
  try {
    const response = await axios.post(
      AI_API_URL,
      {
        model: MODEL_NAME,
        messages,
        temperature,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_API_KEY}`,
        },
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('AI API 호출 오류:', error);
    throw new Error('AI 분석 중 오류가 발생했습니다.');
  }
};

// JD 분석 함수 (텍스트/이미지 통합)
export const analyzeJD = async (jdText) => {
  const messages = [
    { 
      role: 'system', 
      content: `당신은 JD 분석 전문가입니다. 채용공고를 분석하여 다음 형식의 JSON을 반환해주세요:
      {
        "keywords": ["키워드1", "키워드2", ...],
        "summary": "채용공고 요약 (2-3줄)",
        "required_skills": ["필수 스킬1", "필수 스킬2", ...],
        "preferred_skills": ["우대 스킬1", "우대 스킬2", ...],
        "key_responsibilities": ["주요 업무1", "주요 업무2", ...]
      }` 
    },
    { role: 'user', content: jdText }
  ];
  
  const result = await callAI(messages);
  try {
    return JSON.parse(result);
  } catch (e) {
    console.error('JSON 파싱 오류:', e);
    return {
      keywords: [],
      summary: '분석 중 오류가 발생했습니다.',
      required_skills: [],
      preferred_skills: [],
      key_responsibilities: []
    };
  }
};

// 이미지에서 JD 텍스트 추출 함수
export const analyzeImagesWithAI = async (base64Images) => {
  try {
    const messages = [
      {
        role: 'system',
        content: '당신은 채용공고 이미지에서 텍스트를 추출하는 전문가입니다. 이미지에 있는 모든 텍스트를 정확히 읽어서 그대로 반환해주세요.'
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: '이 채용공고 이미지에서 모든 텍스트를 추출해주세요:' },
          ...base64Images.map(base64 => ({
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${base64}` }
          }))
        ]
      }
    ];

    return await callAI(messages);
  } catch (error) {
    console.error('이미지 분석 오류:', error);
    throw new Error('이미지 분석 중 오류가 발생했습니다.');
  }
};

// 잡코리아 URL에서 JD 추출 함수 (개선된 버전)
export const fetchJDFromJobKorea = async (url) => {
  try {
    console.log(`JD 크롤링 시작: ${url}`);
    
    // CORS 문제를 해결하기 위한 프록시 서버 사용
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    
    const response = await axios.get(proxyUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.data) {
      throw new Error('웹페이지 내용을 가져올 수 없습니다.');
    }
    
    // HTML에서 채용공고 텍스트 추출
    const htmlContent = response.data;
    const extractedText = extractJobDescriptionFromHTML(htmlContent);
    
    if (!extractedText || extractedText.trim().length < 100) {
      throw new Error('충분한 채용공고 정보를 추출할 수 없습니다.');
    }
    
    console.log('JD 추출 완료:', extractedText.substring(0, 200) + '...');
    return extractedText;
    
  } catch (error) {
    console.error('JD 크롤링 오류:', error);
    
    // 대안 방법: 사용자에게 스크린샷 제안
    throw new Error(`
      URL에서 자동으로 채용공고를 가져올 수 없습니다.
      
      다음 중 하나의 방법을 시도해보세요:
      1. 채용공고 텍스트를 직접 복사해서 붙여넣기
      2. 채용공고 페이지의 스크린샷을 이미지로 업로드
      3. 다른 채용 사이트의 URL 사용
      
      오류 상세: ${error.message}
    `);
  }
};

// HTML에서 채용공고 텍스트 추출하는 헬퍼 함수
const extractJobDescriptionFromHTML = (html) => {
  try {
    // DOMParser를 사용해서 HTML 파싱
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // 잡코리아 특정 선택자들 시도
    const selectors = [
      '.recruit-info',
      '.job-detail',
      '.content-wrap',
      '.desc-wrap',
      '[class*="detail"]',
      '[class*="content"]',
      'main',
      '.container'
    ];
    
    let extractedText = '';
    
    for (const selector of selectors) {
      const elements = doc.querySelectorAll(selector);
      if (elements.length > 0) {
        extractedText = Array.from(elements)
          .map(el => el.textContent || el.innerText)
          .join('\n\n')
          .trim();
        
        if (extractedText.length > 200) {
          break;
        }
      }
    }
    
    // 기본 텍스트 추출이 실패한 경우 body 전체에서 추출
    if (!extractedText || extractedText.length < 200) {
      const bodyText = doc.body ? doc.body.textContent : '';
      extractedText = bodyText
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim();
    }
    
    // 불필요한 텍스트 정리
    extractedText = extractedText
      .replace(/(\s*\n\s*){3,}/g, '\n\n') // 연속된 줄바꿈 정리
      .replace(/\s{2,}/g, ' ') // 연속된 공백 정리
      .trim();
    
    return extractedText;
    
  } catch (error) {
    console.error('HTML 파싱 오류:', error);
    return '';
  }
};

export const generateResume = async (jd, experiences) => {
  const messages = [
    { role: 'system', content: '이력서 작성 전문가로서 채용공고와 경험을 매칭하여 맞춤형 이력서를 작성해주세요.' },
    { role: 'user', content: `채용공고:\n${jd}\n\n경험:\n${experiences}` }
  ];
  return await callAI(messages);
};

export const generatePersonalStatement = async (jd, experiences) => {
  const messages = [
    { role: 'system', content: '자기소개서 작성 전문가로서 채용공고와 경험을 매칭하여 맞춤형 자기소개서를 작성해주세요.' },
    { role: 'user', content: `채용공고:\n${jd}\n\n경험:\n${experiences}` }
  ];
  return await callAI(messages);
};

export const generateInterviewQuestions = async (jd) => {
  const messages = [
    { role: 'system', content: '면접관으로서 채용공고를 기반으로 예상 면접 질문을 생성해주세요.' },
    { role: 'user', content: jd }
  ];
  const result = await callAI(messages);
  try {
    const parsed = JSON.parse(result);
    return parsed.questions || [];
  } catch (e) {
    return ['면접 질문 생성에 실패했습니다.'];
  }
};

// JD 분석 훅 (개선된 버전)
export const useJdAnalysis = () => {
  // 상태 관리
  const [inputMode, setInputMode] = useState('text'); // text, url, image
  const [jdText, setJdText] = useState('');
  const [jdUrl, setJdUrl] = useState('');
  const [uploadedImages, setUploadedImages] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // 내용이 있는지 확인
  const hasContent = jdText.trim() !== '' || jdUrl.trim() !== '' || uploadedImages.length > 0;

  // 파일 선택 처리
  const handleFileSelect = useCallback((files) => {
    const newImages = Array.from(files)
      .filter(file => file.type.startsWith('image/'))
      .map(file => ({
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
        size: file.size
      }));
    
    setUploadedImages(prev => [...prev, ...newImages]);
    setInputMode('image');
  }, []);

  // 이미지 제거
  const removeImage = useCallback((index) => {
    setUploadedImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  }, []);

  // 초기화
  const clearDraft = useCallback(() => {
    setJdText('');
    setJdUrl('');
    uploadedImages.forEach(img => URL.revokeObjectURL(img.preview));
    setUploadedImages([]);
    setError(null);
    setAnalysisResult(null);
    setAutoSaveStatus('');
  }, [uploadedImages]);

  // 분석 실행
  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      let finalJdText = '';

      // URL 입력 모드인 경우
      if (inputMode === 'url' && jdUrl.trim()) {
        console.log('URL 모드로 분석 시작');
        finalJdText = await fetchJDFromJobKorea(jdUrl.trim());
      }
      // 이미지 입력 모드인 경우
      else if (inputMode === 'image' && uploadedImages.length > 0) {
        console.log('이미지 모드로 분석 시작');
        const base64Images = await Promise.all(
          uploadedImages.map(async (img) => {
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
              };
              reader.readAsDataURL(img.file);
            });
          })
        );
        finalJdText = await analyzeImagesWithAI(base64Images);
      }
      // 텍스트 입력 모드인 경우
      else if (inputMode === 'text' && jdText.trim()) {
        console.log('텍스트 모드로 분석 시작');
        finalJdText = jdText.trim();
      }
      else {
        throw new Error('분석할 내용이 없습니다.');
      }

      if (!finalJdText || finalJdText.trim().length < 10) {
        throw new Error('추출된 텍스트가 너무 짧습니다. 다른 방법을 시도해보세요.');
      }

      // AI 분석 실행
      console.log('AI 분석 시작');
      const result = await analyzeJD(finalJdText);
      setAnalysisResult({
        ...result,
        originalText: finalJdText,
        extractedBy: inputMode
      });
      
      return result;
    } catch (err) {
      console.error('분석 오류:', err);
      setError(err.message);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [inputMode, jdText, jdUrl, uploadedImages]);

  // 분석 후 초기화
  const handleResetAfterAnalysis = useCallback(() => {
    clearDraft();
  }, [clearDraft]);

  // 파일 크기 포맷팅
  const formatFileSize = useCallback((bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  return {
    inputMode, setInputMode,
    jdText, setJdText,
    jdUrl, setJdUrl,
    uploadedImages,
    isAnalyzing,
    error,
    analysisResult,
    autoSaveStatus,
    isDragging, setIsDragging,
    hasContent,
    handleFileSelect,
    removeImage,
    clearDraft,
    handleAnalyze,
    handleResetAfterAnalysis,
    formatFileSize,
  };
};