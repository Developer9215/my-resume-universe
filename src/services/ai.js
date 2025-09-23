// src/services/ai.js
import axios from 'axios'

// OpenAI API 설정
const AI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY
const AI_API_URL = 'https://api.openai.com/v1/chat/completions'
const AI_MODEL_TEXT = 'gpt-3.5-turbo'
const AI_MODEL_VISION = 'gpt-4o'

const aiRequest = async (messages, temperature = 0.3, model = AI_MODEL_TEXT) => {
  if (!AI_API_KEY) {
    throw new Error('AI API 키가 설정되지 않았습니다. .env.local 파일을 확인해주세요.')
  }

  try {
    const response = await axios.post(
      AI_API_URL,
      {
        model,
        messages,
        temperature,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${AI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    return response.data.choices[0].message.content
  } catch (error) {
    console.error('AI API 호출 오류:', error.message)
    throw new Error('AI 분석에 실패했습니다. API 키나 네트워크 상태를 확인해주세요.')
  }
}

// 텍스트 JD 분석 함수
const analyzeJDContent = async (content) => {
  const messages = [
    {
      role: 'system',
      content: `당신은 채용공고 분석 전문가입니다. 주어진 채용공고를 분석하여 다음 정보를 JSON 형태로 반환해주세요:
      {
        "keywords": ["키워드1", "키워드2", ...],
        "requirements": "자격 요건 요약",
        "preferences": "우대 사항 요약",
        "key_responsibilities": "주요 업무 요약",
        "summary": "채용공고 전체 요약 (3-4줄)"
      }`
    },
    {
      role: 'user',
      content: `다음 채용공고를 분석해주세요:\n\n${content}`
    }
  ]

  const result = await aiRequest(messages)
  
  try {
    return JSON.parse(result)
  } catch (e) {
    console.error('JSON 파싱 오류:', e)
    return {
      keywords: [],
      requirements: '분석 중 오류가 발생했습니다.',
      preferences: '분석 중 오류가 발생했습니다.',
      key_responsibilities: '분석 중 오류가 발생했습니다.',
      summary: '분석 중 오류가 발생했습니다.'
    }
  }
}

export const analyzeJD = async (jdText) => {
  return analyzeJDContent(jdText)
}

// 이미지에서 JD 추출 및 분석
export const analyzeImageJD = async (base64Images) => {
  console.log('이미지 JD 분석 시작, 이미지 수:', base64Images.length)
  
  if (!base64Images || base64Images.length === 0) {
    throw new Error('분석할 이미지가 없습니다.')
  }

  try {
    const messages = [
      {
        role: 'user',
        content: [
          { 
            type: 'text', 
            text: '이 채용공고 이미지에서 모든 텍스트를 추출하고, 그 내용을 바탕으로 채용공고를 분석하여 JSON 형태로 반환해주세요. 여러 이미지가 있다면 모든 내용을 통합하여 분석하세요.' 
          },
          ...base64Images.map(base64 => ({
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64}`,
              detail: 'high'
            }
          }))
        ]
      }
    ]

    console.log('이미지 분석 중...')
    const result = await aiRequest(messages, 0.3, AI_MODEL_VISION)
    
    try {
      return JSON.parse(result)
    } catch (e) {
      console.error('JSON 파싱 오류:', e)
      throw new Error('이미지 분석 결과를 파싱할 수 없습니다. AI 응답을 확인해주세요.')
    }
  } catch (error) {
    console.error('이미지 분석 오류:', error)
    throw new Error(`이미지 분석 중 오류가 발생했습니다: ${error.message}`)
  }
}

// URL에서 JD 크롤링 및 분석
export const analyzeURLJD = async (url) => {
  console.log('백엔드 서버를 통한 URL JD 분석 시작:', url);
  
  try {
    const response = await axios.post('http://localhost:5000/api/crawl-and-analyze', { url });
    
    // 백엔드가 반환한 'analysis' 데이터를 직접 사용합니다.
    const analysisResult = response.data.analysis; 
    
    if (!analysisResult) {
      throw new Error('백엔드로부터 분석 결과를 가져오지 못했습니다.');
    }
    
    console.log('URL 분석이 성공적으로 완료되었습니다.');
    
    // 이제 analysisResult를 바로 반환하여 다음 단계로 진행합니다.
    return analysisResult;
  } catch (error) {
    console.error('URL 분석 오류:', error.response?.data?.error || error.message);
    throw new Error(error.response?.data?.error || `URL 분석 중 오류가 발생했습니다: ${error.message}`);
  }
};

// 기존 함수들 유지
export const generateResume = async (jdAnalysis, userExperiences) => {
  const experienceText = userExperiences
    .map(exp => `${exp.type}: ${exp.title} @ ${exp.organization} (${exp.start_date} ~ ${exp.end_date || '현재'})
    설명: ${exp.description}
    스킬: ${exp.skills ? exp.skills.join(', ') : '없음'}`)
    .join('\n\n')

  const messages = [
    {
      role: 'system',
      content: `당신은 이력서 작성 전문가입니다. 채용공고와 사용자 경험을 매칭하여 성과 중심의 이력서를 작성해주세요.
      
      이력서 작성 원칙:
      1. 채용공고의 키워드와 요구사항에 맞춰 경험을 재구성
      2. 정량적 성과 중심으로 작성
      3. 관련성이 높은 경험을 우선 배치
      4. HTML 형식으로 작성하되 기본적인 태그만 사용
      
      구조:
      <h1>이름</h1>
      <h2>연락처</h2>
      <h2>핵심 역량</h2>
      <h2>경력/프로젝트 경험</h2>
      <h2>교육</h2>
      <h2>기술 스택</h2>`
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
  ]

  return await aiRequest(messages, 0.5)
}

export const generateInterviewQuestions = async (jdAnalysis, resumeContent) => {
  const messages = [
    {
      role: 'system',
      content: `당신은 면접관입니다. 채용공고와 지원자의 이력서를 바탕으로 실제 면접에서 나올 수 있는 질문 3-5개를 생성해주세요.
      
      질문 유형:
      1. 기술적 경험 관련
      2. 프로젝트/업무 성과 관련
      3. 문제해결 능력
      4. 협업 및 커뮤니케이션
      5. 지원 동기
      
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
  ]

  const result = await aiRequest(messages)
  
  try {
    return JSON.parse(result).questions || []
  } catch (e) {
    return ['면접 질문 생성에 실패했습니다.']
  }
}

export const generatePersonalStatement = async (jdAnalysis, userExperiences) => {
  const experienceText = userExperiences
    .map(exp => `${exp.type}: ${exp.title} - ${exp.description}`)
    .join('\n')

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
  ]

  return await aiRequest(messages, 0.6)
}