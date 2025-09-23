// src/services/ai.js
import axios from 'axios'

// OpenAI API 설정
const AI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY
const AI_API_URL = 'https://api.openai.com/v1/chat/completions'

const aiRequest = async (messages, temperature = 0.3) => {
  try {
    const response = await axios.post(
      AI_API_URL,
      {
        model: 'gpt-3.5-turbo',
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

// JD 키워드 및 요약 추출
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
    // JSON 파싱 실패시 기본값 반환
    return {
      keywords: [],
      summary: '분석 중 오류가 발생했습니다.',
      required_skills: [],
      preferred_skills: [],
      key_responsibilities: []
    }
  }
}

// 맞춤 이력서 생성
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

// 예상 면접 질문 생성
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

// 자기소개/PR 문구 생성
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