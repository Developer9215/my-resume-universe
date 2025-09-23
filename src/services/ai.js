// src/services/ai.js (이미지 분석 + URL 크롤링 추가)
import axios from 'axios'

// OpenAI API 설정
const AI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY
const AI_API_URL = 'https://api.openai.com/v1/chat/completions'

const aiRequest = async (messages, temperature = 0.3, model = 'gpt-3.5-turbo') => {
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
    console.error('AI API 호출 오류:', error)
    throw new Error('AI 분석에 실패했습니다.')
  }
}

// 기존 텍스트 JD 분석 함수
export const analyzeJD = async (jdText) => {
  const messages = [
    {
      role: 'system',
      content: `당신은 채용공고 분석 전문가입니다. 주어진 채용공고를 분석하여 다음 정보를 JSON 형태로 반환해주세요:
      {
        "keywords": ["키워드1", "키워드2", ...],
        "summary": "채용공고 요약 (3-4줄)",
        "required_skills": ["필수 스킬1", "필수 스킬2", ...],
        "preferred_skills": ["우대 스킬1", "우대 스킬2", ...],
        "key_responsibilities": ["주요 업무1", "주요 업무2", ...]
      }`
    },
    {
      role: 'user',
      content: `다음 채용공고를 분석해주세요:\n\n${jdText}`
    }
  ]

  const result = await aiRequest(messages)
  
  try {
    return JSON.parse(result)
  } catch (e) {
    return {
      keywords: [],
      summary: '분석 중 오류가 발생했습니다.',
      required_skills: [],
      preferred_skills: [],
      key_responsibilities: []
    }
  }
}

// 이미지에서 JD 추출 및 분석
export const analyzeImageJD = async (base64Images) => {
  console.log('이미지 JD 분석 시작, 이미지 수:', base64Images.length)
  
  if (!base64Images || base64Images.length === 0) {
    throw new Error('분석할 이미지가 없습니다.')
  }

  try {
    // 1단계: 이미지에서 텍스트 추출
    const extractMessages = [
      {
        role: 'system',
        content: '당신은 이미지에서 텍스트를 정확하게 추출하는 전문가입니다. 이미지에 있는 모든 텍스트를 그대로 읽어서 반환해주세요. 여러 이미지가 있다면 모든 내용을 통합하여 반환하세요.'
      },
      {
        role: 'user',
        content: [
          { 
            type: 'text', 
            text: '이 채용공고 이미지에서 모든 텍스트를 추출해주세요:' 
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

    console.log('이미지에서 텍스트 추출 중...')
    const extractedText = await aiRequest(extractMessages, 0.3, 'gpt-4o')
    
    if (!extractedText || extractedText.length < 50) {
      throw new Error('이미지에서 충분한 텍스트를 추출할 수 없습니다. 더 선명한 이미지를 사용해주세요.')
    }

    console.log('추출된 텍스트 길이:', extractedText.length)

    // 2단계: 추출된 텍스트를 JD 분석
    const analysis = await analyzeJD(extractedText)

    return {
      extractedText,
      analysis
    }
  } catch (error) {
    console.error('이미지 분석 오류:', error)
    throw new Error(`이미지 분석 중 오류가 발생했습니다: ${error.message}`)
  }
}

// URL에서 JD 크롤링 및 분석
export const analyzeURLJD = async (url) => {
  console.log('URL JD 분석 시작:', url)
  
  try {
    // URL 유효성 검사
    new URL(url)
    
    // CORS 우회를 위한 프록시 서비스 사용
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    
    console.log('웹페이지 크롤링 중...')
    const response = await axios.get(proxyUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.data) {
      throw new Error('웹페이지 내용을 가져올 수 없습니다.')
    }
    
    // HTML에서 텍스트 추출
    const htmlContent = response.data
    let extractedText = ''
    
    try {
      // DOMParser를 사용해서 HTML 파싱
      const parser = new DOMParser()
      const doc = parser.parseFromString(htmlContent, 'text/html')
      
      // 채용공고 사이트별 선택자
      const selectors = [
        // 잡코리아
        '.recruit-info', '.job-detail', '.content-wrap',
        // 사람인
        '.job-detail', '.recruit-wrap', '.job-summary',
        // 원티드
        '.job-detail', '.job-description',
        // 고용24/워크넷
        '.recruit-info', '.info-wrap', '.job-info',
        // 기본 선택자
        '.content', '.description', 'main', '.container'
      ]
      
      // 선택자들을 시도해서 가장 긴 텍스트를 찾기
      let bestText = ''
      for (const selector of selectors) {
        try {
          const elements = doc.querySelectorAll(selector)
          if (elements.length > 0) {
            const text = Array.from(elements)
              .map(el => el.textContent || el.innerText)
              .join('\n\n')
              .trim()
            
            if (text.length > bestText.length) {
              bestText = text
            }
          }
        } catch (e) {
          continue
        }
      }
      
      // 선택자로 찾지 못한 경우 body 전체에서 추출
      if (!bestText || bestText.length < 200) {
        const bodyText = doc.body ? doc.body.textContent || doc.body.innerText : ''
        bestText = bodyText
      }
      
      extractedText = bestText
        .replace(/\s+/g, ' ')           // 연속된 공백 제거
        .replace(/\n+/g, '\n')          // 연속된 줄바꿈 제거
        .trim()
        
    } catch (parseError) {
      console.warn('HTML 파싱 실패, 정규식으로 시도:', parseError)
      
      // HTML 파싱 실패시 정규식으로 태그 제거
      extractedText = htmlContent
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // 스크립트 제거
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')   // 스타일 제거
        .replace(/<[^>]+>/g, ' ')                         // HTML 태그 제거
        .replace(/\s+/g, ' ')                             // 연속된 공백 제거
        .trim()
    }
    
    if (!extractedText || extractedText.length < 100) {
      throw new Error('웹페이지에서 충분한 채용공고 정보를 찾을 수 없습니다.')
    }
    
    console.log('추출된 텍스트 길이:', extractedText.length)
    
    // 추출된 텍스트를 JD 분석
    const analysis = await analyzeJD(extractedText)
    
    return {
      extractedText,
      analysis
    }
    
  } catch (error) {
    console.error('URL 분석 오류:', error)
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new Error('웹페이지에 접근할 수 없습니다. URL을 확인해주세요.')
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('요청 시간이 초과되었습니다. 다시 시도해주세요.')
    } else {
      throw new Error(`URL 분석 중 오류가 발생했습니다: ${error.message}`)
    }
  }
}

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