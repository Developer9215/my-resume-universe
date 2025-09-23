import axios from 'axios';

// AI API 설정
const AI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
const AI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL_NAME = 'gpt-4o';

// CORS 프록시 서비스
const CORS_PROXY = 'https://api.allorigins.win/get?url=';

// 디버그 로깅
console.log('AI Service 초기화');
console.log('API Key 존재:', !!AI_API_KEY);
console.log('API Key 시작:', AI_API_KEY?.substring(0, 10) + '...');

/**
 * OpenAI API에 요청을 보내는 범용 함수
 */
const aiRequest = async (messages, temperature = 0.3, max_tokens = 2000) => {
  try {
    if (!AI_API_KEY) {
      throw new Error('AI API KEY가 설정되지 않았습니다. .env.local 파일을 확인해주세요.');
    }

    if (!AI_API_KEY.startsWith('sk-')) {
      throw new Error('올바르지 않은 API 키 형식입니다. sk-로 시작해야 합니다.');
    }

    console.log('OpenAI API 요청 시작');
    console.log('모델:', MODEL_NAME);
    console.log('메시지 수:', messages.length);

    const requestBody = {
      model: MODEL_NAME,
      messages,
      temperature,
      max_tokens,
    };

    const headers = {
      'Authorization': `Bearer ${AI_API_KEY}`,
      'Content-Type': 'application/json'
    };

    console.log('요청 헤더:', { 'Content-Type': headers['Content-Type'], 'Authorization': 'Bearer ' + AI_API_KEY.substring(0, 10) + '...' });

    const response = await axios.post(AI_API_URL, requestBody, { headers });
    
    console.log('OpenAI API 응답 성공');
    return response.data.choices[0].message.content;
    
  } catch (error) {
    console.error('AI API 호출 상세 오류:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Response Data:', error.response?.data);
    console.error('Request Config:', error.config);
    
    if (error.response?.status === 401) {
      throw new Error('API 인증 실패. OpenAI API 키를 확인해주세요.');
    } else if (error.response?.status === 429) {
      throw new Error('API 사용량 한도 초과. 잠시 후 다시 시도해주세요.');
    } else if (error.response?.status === 400) {
      throw new Error('잘못된 요청입니다: ' + (error.response?.data?.error?.message || ''));
    }
    
    throw new Error(`AI 분석에 실패했습니다: ${error.message}`);
  }
};

/**
 * JD 텍스트를 분석하여 키워드, 요약 등을 추출합니다.
 */
export const analyzeJD = async (jdText) => {
  console.log('JD 분석 시작, 텍스트 길이:', jdText.length);
  
  const messages = [
    { 
      role: 'system', 
      content: `당신은 채용공고 분석 전문가입니다. 주어진 채용공고를 분석하여 다음 정보를 JSON 형태로 반환해주세요:
{
  "keywords": ["키워드1", "키워드2"],
  "summary": "채용공고 요약 (3-4줄)",
  "required_skills": ["필수 스킬1", "필수 스킬2"],
  "preferred_skills": ["우대 스킬1", "우대 스킬2"],
  "key_responsibilities": ["주요 업무1", "주요 업무2"]
}`
    },
    { 
      role: 'user', 
      content: `다음 채용공고를 분석해주세요:\n\n${jdText.substring(0, 4000)}` // 토큰 제한을 고려해 4000자로 제한
    }
  ];

  const result = await aiRequest(messages);
  
  try {
    const parsed = JSON.parse(result);
    console.log('JD 분석 완료:', parsed);
    return parsed;
  } catch (e) {
    console.error('JSON 파싱 오류:', e);
    console.error('원본 응답:', result);
    return {
      keywords: [],
      summary: '분석 중 오류가 발생했습니다.',
      required_skills: [],
      preferred_skills: [],
      key_responsibilities: []
    };
  }
};

/**
 * GPT-4o Vision API를 사용하여 이미지에서 텍스트를 추출하고 분석합니다.
 */
export const analyzeImagesWithAI = async (images) => {
  try {
    console.log(`이미지 ${images.length}장을 GPT-4o Vision으로 분석 중...`);
    
    const imageMessages = images.map(img => ({
      type: "image_url",
      image_url: {
        url: `data:${img.mimeType};base64,${img.base64}`
      }
    }));

    const messages = [
      {
        role: 'system',
        content: `당신은 채용공고 이미지 분석 전문가입니다.
업로드된 이미지들에서 채용공고 내용을 추출하고 분석하여 다음을 JSON 형태로 응답해주세요:
{
  "extractedText": "이미지에서 추출된 전체 텍스트",
  "keywords": ["키워드1", "키워드2"],
  "summary": "채용공고 요약 (3-4문장)",
  "required_skills": ["필수스킬1", "필수스킬2"],
  "preferred_skills": ["우대스킬1", "우대스킬2"]
}`
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `다음 ${images.length}장의 채용공고 이미지를 분석해주세요:`
          },
          ...imageMessages
        ]
      }
    ];

    const result = await aiRequest(messages, 0.3, 2000);
    return JSON.parse(result);
    
  } catch (error) {
    console.error('이미지 분석 오류:', error);
    throw new Error('이미지에서 텍스트를 추출할 수 없습니다. 더 선명한 이미지를 업로드해주세요.');
  }
};

/**
 * 잡코리아 URL에서 JD 내용을 크롤링합니다.
 */
export const fetchJDFromJobKorea = async (url) => {
  try {
    console.log(`JD 크롤링 시작: ${url}`);
    
    // URL 검증
    if (!url.includes('jobkorea.co.kr')) {
      throw new Error('잡코리아 URL이 아닙니다. 잡코리아 채용공고 URL을 입력해주세요.');
    }

    // CORS 프록시를 통해 페이지 가져오기
    const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
    console.log('프록시 URL:', proxyUrl);
    
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP 오류: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.contents) {
      throw new Error('페이지 내용을 가져올 수 없습니다.');
    }
    
    console.log('HTML 크기:', data.contents.length);
    
    // HTML에서 채용공고 텍스트 추출
    const jdText = extractJDFromHTML(data.contents);
    
    if (!jdText || jdText.trim().length < 100) {
      throw new Error('채용공고 내용을 찾을 수 없습니다. URL을 다시 확인해주세요.');
    }
    
    console.log('JD 크롤링 완료, 텍스트 길이:', jdText.length);
    return jdText;
    
  } catch (error) {
    console.error('JD 크롤링 오류:', error);
    throw new Error(`JD 크롤링 실패: ${error.message}`);
  }
};

/**
 * HTML에서 채용공고 텍스트를 추출하는 헬퍼 함수
 */
const extractJDFromHTML = (html) => {
  try {
    // DOM 파서를 사용해 HTML 파싱
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // 잡코리아의 일반적인 JD 콘텐츠 선택자들
    const selectors = [
      '.duty-summary',
      '.duty-information', 
      '.read-content',
      '.content-wrap',
      '.job-detail',
      '.recruitment-detail',
      '[class*="content"]',
      '[class*="detail"]',
      '[class*="summary"]',
      '.txt-content'
    ];
    
    let extractedText = '';
    
    // 각 선택자로 콘텐츠 찾기
    for (const selector of selectors) {
      const elements = doc.querySelectorAll(selector);
      if (elements.length > 0) {
        elements.forEach(element => {
          const text = element.textContent || element.innerText || '';
          if (text.trim().length > 50) {
            extractedText += text.trim() + '\n\n';
          }
        });
        
        // 충분한 텍스트를 찾았으면 중단
        if (extractedText.length > 500) break;
      }
    }
    
    // 선택자로 찾지 못한 경우 전체 본문에서 추출
    if (extractedText.length < 100) {
      console.log('선택자로 찾지 못함, 전체 텍스트에서 추출 시도');
      const bodyText = doc.body?.textContent || doc.documentElement?.textContent || '';
      
      // 불필요한 내용 제거하고 정리
      extractedText = bodyText
        .replace(/\s+/g, ' ')
        .replace(/[\r\n]+/g, '\n')
        .trim();
        
      // 너무 길면 처음 2000자만
      if (extractedText.length > 2000) {
        extractedText = extractedText.substring(0, 2000);
      }
    }
    
    console.log('추출된 텍스트 미리보기:', extractedText.substring(0, 200) + '...');
    
    return extractedText;
    
  } catch (error) {
    console.error('HTML 파싱 오류:', error);
    throw new Error('HTML에서 텍스트 추출 실패');
  }
};

// 다른 AI 함수들은 기존대로 유지
export const generateResume = async (jdAnalysis, userExperiences) => {
  const experienceText = userExperiences
    .map(exp => `${exp.type}: ${exp.title} @ ${exp.organization} (${exp.start_date} ~ ${exp.end_date || '현재'})
설명: ${exp.description}
스킬: ${exp.skills ? exp.skills.join(', ') : '없음'}`)
    .join('\n\n');

  const messages = [
    { 
      role: 'system', 
      content: `당신은 이력서 작성 전문가입니다. 채용공고와 사용자 경험을 매칭하여 성과 중심의 이력서를 작성해주세요.
이력서 작성 원칙:
1. 채용공고의 키워드와 요구사항에 맞춰 경험을 재구성
2. 정량적 성과 중심으로 작성
3. 관련성이 높은 경험을 우선 배치
4. HTML 형식으로 작성하되 기본적인 태그만 사용` 
    },
    { 
      role: 'user', 
      content: `채용공고 분석 결과:
키워드: ${jdAnalysis.keywords?.join(', ')}
요구 스킬: ${jdAnalysis.required_skills?.join(', ')}
주요 업무: ${jdAnalysis.key_responsibilities?.join(', ')}

사용자 경험:
${experienceText}

위 정보를 바탕으로 이 채용공고에 최적화된 이력서를 작성해주세요.` 
    }
  ];

  return await aiRequest(messages, 0.5);
};

export const generateInterviewQuestions = async (jdAnalysis, resumeContent) => {
  const messages = [
    { 
      role: 'system', 
      content: `당신은 면접관입니다. 채용공고와 지원자의 이력서를 바탕으로 실제 면접에서 나올 수 있는 질문 3-5개를 생성해주세요.
JSON 형태로 반환: {"questions": ["질문1", "질문2", ...]}` 
    },
    { 
      role: 'user', 
      content: `채용공고 분석:
${JSON.stringify(jdAnalysis, null, 2)}

지원자 이력서:
${resumeContent}

예상 면접 질문을 생성해주세요.` 
    }
  ];

  const result = await aiRequest(messages);
  
  try {
    const parsed = JSON.parse(result);
    return parsed.questions || [];
  } catch (e) {
    console.error('JSON 파싱 오류:', e);
    return ['면접 질문 생성에 실패했습니다.'];
  }
};

export const generatePersonalStatement = async (jdAnalysis, userExperiences) => {
  const experienceText = userExperiences
    .map(exp => `${exp.type}: ${exp.title} - ${exp.description}`)
    .join('\n');

  const messages = [
    { 
      role: 'system', 
      content: `당신은 자기소개서 작성 전문가입니다. 채용공고와 지원자 경험을 바탕으로 매력적인 자기소개/PR 문구를 작성해주세요.
작성 원칙:
1. 채용공고의 핵심 요구사항과 연결
2. 구체적인 경험과 성과 언급
3. 200-300자 내외
4. 자신감 있고 적극적인 어조` 
    },
    { 
      role: 'user', 
      content: `채용공고 요구사항: ${jdAnalysis.required_skills?.join(', ')}

지원자 경험:
${experienceText}

자기소개/PR 문구를 작성해주세요.` 
    }
  ];

  return await aiRequest(messages, 0.6);
};