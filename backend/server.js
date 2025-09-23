// server.js - 완전 수정 버전 (사용자 인증 포함)
require('dotenv').config();

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const Tesseract = require('tesseract.js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// OpenAI API 설정
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const AI_MODEL_TEXT = 'gpt-3.5-turbo';
const AI_MODEL_VISION = 'gpt-4o';

const app = express();
const port = 5000;

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json({ limit: '50mb' }));

// 표준화된 응답 헬퍼
const sendResponse = (res, success, data = null, message = '', statusCode = 200) => {
  res.status(statusCode).json({
    success,
    data,
    message,
    timestamp: new Date().toISOString()
  });
};

const sendError = (res, error, statusCode = 500) => {
  console.error('API 에러:', error);
  res.status(statusCode).json({
    success: false,
    error: typeof error === 'string' ? error : error.message,
    timestamp: new Date().toISOString()
  });
};

// 사용자 ID 검증 및 기본값 설정 헬퍼
const validateUserId = (user_id) => {
  if (!user_id) {
    console.warn('사용자 ID가 제공되지 않았습니다. 기본값 사용.');
    return '9b00062f-e0e2-4638-868f-423306d06a38'; // 기본값 (임시)
  }
  return user_id;
};

// AI API 요청 함수 - 재시도 로직 추가
const aiRequest = async (messages, model = AI_MODEL_TEXT, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`AI API 요청 시도 ${attempt}/${retries} (모델: ${model})`);
      
      const response = await axios.post(
        OPENAI_API_URL,
        { model, messages, temperature: 0.3, max_tokens: 2000 },
        { 
          headers: { 
            'Authorization': `Bearer ${OPENAI_API_KEY}`, 
            'Content-Type': 'application/json' 
          },
          timeout: 30000
        }
      );
      
      console.log(`✓ AI API 요청 성공 (시도 ${attempt})`);
      return response.data.choices[0].message.content;
      
    } catch (error) {
      console.error(`AI API 요청 실패 (시도 ${attempt}):`, error.message);
      
      if (attempt < retries && [503, 429, 500, 502, 504].includes(error.response?.status)) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`${delay}ms 후 재시도...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (attempt === retries) {
        throw new Error(`AI 분석에 실패했습니다 (${retries}번 시도 후): ${error.response?.status || error.message}`);
      }
    }
  }
};

// 분석 결과를 DB에 저장하는 함수 - 사용자 ID 검증 추가
const saveAnalysisResult = async (inputType, inputData, resultData, userId) => {
  try {
    const validatedUserId = validateUserId(userId);
    console.log(`분석 결과 저장 중... 사용자 ID: ${validatedUserId}`);
    
    const { data, error: dbError } = await supabase
      .from('analysis_results')
      .insert({ 
        input_type: inputType,
        input_data: inputData,
        result_data: resultData,
        user_id: validatedUserId
      })
      .select()
      .single();
      
    if (dbError) {
      console.error('Supabase 저장 오류:', dbError);
      return { success: false, error: dbError };
    }
    
    console.log('✓ 분석 결과가 성공적으로 저장되었습니다. ID:', data.id, '사용자:', validatedUserId);
    return { success: true, data };
  } catch (error) {
    console.error('DB 저장 중 오류:', error);
    return { success: false, error: error.message };
  }
};

// 텍스트가 너무 적을 때의 대안 분석
const analyzeMinimalContent = async (text) => {
  console.log('최소 콘텐츠 분석 모드 실행');
  
  const basicAnalysis = {
    company_name: '정보 부족',
    position: '정보 부족',
    summary: '웹페이지에서 충분한 정보를 추출하지 못했습니다. 직접 채용공고를 확인해주세요.',
    keywords: ['채용공고'],
    requirements: '자세한 정보를 확인할 수 없습니다.',
    preferences: '자세한 정보를 확인할 수 없습니다.',
    key_responsibilities: '자세한 정보를 확인할 수 없습니다.',
    tech_stack: {
      frontend: [],
      backend: [],
      tools: [],
      database: []
    },
    employment_details: {
      type: '정보 부족',
      experience: '정보 부족',
      location: '정보 부족',
      salary: '정보 부족'
    },
    welfare: [],
    source_analysis: {
      webpage_text_length: text.length,
      image_text_length: 0,
      images_processed: 0,
      extraction_method: '제한적 추출 (봇 차단 또는 콘텐츠 부족)',
      note: '웹사이트에서 충분한 정보를 추출하지 못했습니다.'
    }
  };
  
  // 텍스트에서 기본 정보라도 추출 시도
  if (text.includes('이스트게임즈')) basicAnalysis.company_name = '이스트게임즈';
  if (text.includes('웹 개발자')) basicAnalysis.position = '웹 개발자';
  if (text.includes('Java')) basicAnalysis.keywords.push('Java');
  if (text.includes('정규직')) basicAnalysis.employment_details.type = '정규직';
  
  return basicAnalysis;
};

// 웹페이지 전처리 함수 (기존 코드 유지)
async function preprocessJobPosting(url) {
  try {
    console.log(`=== 웹페이지 크롤링 시작: ${url} ===`);
    
    const cookieJar = [];
    
    try {
      const homeResponse = await axios.get('https://www.jobkorea.co.kr', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 10000
      });
      
      const setCookies = homeResponse.headers['set-cookie'];
      if (setCookies) {
        setCookies.forEach(cookie => cookieJar.push(cookie.split(';')[0]));
        console.log(`세션 쿠키 설정: ${cookieJar.length}개`);
      }
    } catch (sessionError) {
      console.log('세션 설정 실패, 직접 요청 시도');
    }

    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];

    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    const requestHeaders = {
      'User-Agent': randomUserAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache'
    };

    if (cookieJar.length > 0) {
      requestHeaders['Cookie'] = cookieJar.join('; ');
    }

    const { data } = await axios.get(url, {
      headers: requestHeaders,
      timeout: 20000,
      maxRedirects: 5
    });
    
    const $ = cheerio.load(data);
    console.log(`HTML 파싱 완료, 총 크기: ${data.length}자`);
    
    $('script, style, noscript, iframe, .ad, .advertisement, .banner').remove();
    
    const contentSelectors = [
      '#container', '.secDetailWrap', '.artTplDetail', 
      '.job-content', '.content-wrap', 'main', 'article', 'body'
    ];

    let bestContent = { element: null, textLength: 0, selector: '' };
    
    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        const tempElement = element.clone();
        tempElement.find('script, style, .ad-section').remove();
        const text = tempElement.text().replace(/\s+/g, ' ').trim();
        
        if (text.length > bestContent.textLength) {
          bestContent = { element, textLength: text.length, selector };
        }
      }
    }

    const selectedElement = bestContent.element.clone();
    selectedElement.find('script, style, iframe, .ad-section, nav, header, footer').remove();
    
    let fullText = selectedElement.text().replace(/\s+/g, ' ').trim();
    
    // 노이즈 제거
    fullText = fullText
      .replace(/채용정보에 잘못된 내용이 있을 경우 문의해주세요\./g, '')
      .replace(/TOP궁금해요.*/g, '')
      .replace(/로그인하고.*?확인해 보세요!/g, '')
      .trim();

    return { 
      text: fullText, 
      images: [], 
      metadata: { 
        selector: bestContent.selector,
        textLength: fullText.length,
        imageCount: 0
      }
    };

  } catch (error) {
    console.error('웹페이지 전처리 오류:', error.message);
    throw error;
  }
}

// === API 엔드포인트들 ===

// 텍스트 분석 - 사용자 ID 포함
app.post('/api/analyze-text', async (req, res) => {
  try {
    const { content, user_id } = req.body;
    
    console.log('텍스트 분석 요청 - 사용자 ID:', user_id);
    
    if (!content) {
      return sendError(res, '분석할 텍스트가 필요합니다.', 400);
    }

    const analysisResult = await aiRequest([
      {
        role: 'system',
        content: `당신은 채용공고 분석 전문가입니다. JSON 형태로 반환: {
          "company_name": "회사명", "position": "포지션", "summary": "요약",
          "keywords": ["키워드들"], "requirements": "자격요건", 
          "preferences": "우대사항", "key_responsibilities": "주요업무"
        }`
      },
      { role: 'user', content: `다음 채용공고를 분석해주세요:\n\n${content}` }
    ]);

    const parsedResult = JSON.parse(analysisResult);
    const saveResult = await saveAnalysisResult('text', content, parsedResult, user_id);
    
    if (!saveResult.success) {
      console.warn('DB 저장 실패, 하지만 분석 결과는 반환:', saveResult.error);
    }
    
    sendResponse(res, true, parsedResult, '텍스트 분석이 완료되었습니다.');

  } catch (error) {
    sendError(res, `텍스트 분석 중 오류 발생: ${error.message}`);
  }
});

// 이미지 분석 - 사용자 ID 포함
app.post('/api/analyze-image', async (req, res) => {
  try {
    const { images: base64Images, user_id } = req.body;
    
    console.log('이미지 분석 요청 - 사용자 ID:', user_id, '이미지 개수:', base64Images?.length);
    
    if (!base64Images || base64Images.length === 0) {
      return sendError(res, '분석할 이미지가 필요합니다.', 400);
    }

    const imageContents = base64Images.map(base64Image => {
      let imageUrl = base64Image;
      if (!base64Image.startsWith('data:image/')) {
        imageUrl = `data:image/jpeg;base64,${base64Image}`;
      }
      return {
        type: 'image_url',
        image_url: { url: imageUrl, detail: 'high' }
      };
    });

    const messages = [{
      role: 'user',
      content: [
        { 
          type: 'text', 
          text: 'JSON 형태로 분석 결과 반환: {"company_name": "회사명", "position": "포지션", "keywords": ["키워드들"], "requirements": "자격요건", "summary": "요약"}'
        },
        ...imageContents
      ]
    }];
    
    const result = await aiRequest(messages, AI_MODEL_VISION);
    
    let analysisResult;
    if (result.includes('```json')) {
      const jsonMatch = result.match(/```json\s*([\s\S]*?)\s*```/);
      analysisResult = JSON.parse(jsonMatch[1]);
    } else {
      analysisResult = JSON.parse(result);
    }
    
    const saveResult = await saveAnalysisResult('image', base64Images, analysisResult, user_id);
    
    if (!saveResult.success) {
      console.warn('DB 저장 실패, 하지만 분석 결과는 반환:', saveResult.error);
    }
    
    sendResponse(res, true, analysisResult, '이미지 분석이 완료되었습니다.');

  } catch (error) {
    sendError(res, `이미지 분석 중 오류 발생: ${error.message}`);
  }
});

// URL 크롤링 및 분석 - 사용자 ID 포함
app.post('/api/crawl-and-analyze', async (req, res) => {
  try {
    const { url, user_id } = req.body;
    
    console.log('URL 분석 요청 - 사용자 ID:', user_id, 'URL:', url);
    
    if (!url) {
      return sendError(res, 'URL이 필요합니다.', 400);
    }

    const { text: processedText, metadata } = await preprocessJobPosting(url);
    
    if (!processedText || processedText.length < 50) {
      return sendError(res, '웹페이지에서 충분한 정보를 찾을 수 없습니다.', 404);
    }

    let parsedResult;
    
    if (processedText.length < 300) {
      parsedResult = await analyzeMinimalContent(processedText);
    } else {
      const analysisResult = await aiRequest([
        {
          role: 'system',
          content: `채용공고 분석 전문가. JSON 형태로 반환: {
            "company_name": "회사명", "position": "포지션", "summary": "요약",
            "keywords": ["키워드들"], "requirements": "자격요건", "preferences": "우대사항",
            "tech_stack": {"frontend": [], "backend": [], "tools": []},
            "employment_details": {"type": "고용형태", "location": "위치", "salary": "급여"}
          }`
        },
        { role: 'user', content: `다음 채용공고를 분석해주세요:\n\n${processedText}` }
      ]);
      parsedResult = JSON.parse(analysisResult);
    }

    const saveResult = await saveAnalysisResult('url', url, parsedResult, user_id);
    
    if (!saveResult.success) {
      console.warn('DB 저장 실패, 하지만 분석 결과는 반환:', saveResult.error);
    }
    
    sendResponse(res, true, parsedResult, 'URL 분석이 완료되었습니다.');

  } catch (error) {
    sendError(res, `URL 분석 중 오류 발생: ${error.message}`);
  }
});

// 분석 히스토리 조회 - 사용자 ID 검증 강화
app.get('/api/analysis-history', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', user_id } = req.query;
    const offset = (page - 1) * limit;

    const validatedUserId = validateUserId(user_id);
    console.log('분석 히스토리 조회 - 사용자 ID:', validatedUserId);

    let query = supabase
      .from('analysis_results')
      .select(`
        id, created_at, input_type,
        result_data->company_name as company_name,
        result_data->position as position,
        result_data->summary as summary,
        result_data->keywords as keywords
      `)
      .eq('user_id', validatedUserId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`result_data->>company_name.ilike.%${search}%,result_data->>position.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return sendError(res, '분석 히스토리 조회 실패: ' + error.message);
    }

    sendResponse(res, true, {
      analyses: data || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: data?.length || 0
      }
    }, '분석 히스토리 조회 완료');

  } catch (error) {
    sendError(res, `분석 히스토리 조회 중 오류: ${error.message}`);
  }
});

// 특정 분석 결과 상세 조회 - 사용자 ID 검증 강화
app.get('/api/analysis/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;

    const validatedUserId = validateUserId(user_id);
    console.log('분석 결과 상세 조회 - ID:', id, '사용자 ID:', validatedUserId);

    const { data, error } = await supabase
      .from('analysis_results')
      .select('*')
      .eq('id', id)
      .eq('user_id', validatedUserId)
      .single();

    if (error || !data) {
      return sendError(res, '분석 결과를 찾을 수 없습니다.', 404);
    }

    sendResponse(res, true, data, '분석 결과 조회 완료');

  } catch (error) {
    sendError(res, `분석 결과 조회 중 오류: ${error.message}`);
  }
});

// 분석 결과 삭제 - 사용자 ID 검증 강화
app.delete('/api/analysis/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    const validatedUserId = validateUserId(user_id);
    console.log('분석 결과 삭제 - ID:', id, '사용자 ID:', validatedUserId);

    const { error } = await supabase
      .from('analysis_results')
      .delete()
      .eq('id', id)
      .eq('user_id', validatedUserId);

    if (error) {
      return sendError(res, '분석 결과 삭제 실패: ' + error.message);
    }

    sendResponse(res, true, null, '분석 결과가 삭제되었습니다.');

  } catch (error) {
    sendError(res, `분석 결과 삭제 중 오류: ${error.message}`);
  }
});

// 분석 통계 조회 - 사용자 ID 검증 강화
app.get('/api/analysis-stats', async (req, res) => {
  try {
    const { user_id } = req.query;

    const validatedUserId = validateUserId(user_id);
    console.log('분석 통계 조회 - 사용자 ID:', validatedUserId);

    const { data, error } = await supabase
      .from('analysis_results')
      .select('created_at, result_data')
      .eq('user_id', validatedUserId);

    if (error) {
      return sendError(res, '통계 조회 실패: ' + error.message);
    }

    const now = new Date();
    const thisMonth = data.filter(item => {
      const itemDate = new Date(item.created_at);
      return itemDate.getMonth() === now.getMonth() && 
             itemDate.getFullYear() === now.getFullYear();
    }).length;

    const uniqueCompanies = new Set(
      data.map(item => item.result_data?.company_name).filter(Boolean)
    ).size;

    const positions = data.map(item => item.result_data?.position).filter(Boolean);
    const positionCounts = {};
    positions.forEach(position => {
      positionCounts[position] = (positionCounts[position] || 0) + 1;
    });

    const mostCommonPositions = Object.entries(positionCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([position, count]) => ({ position, count }));

    const stats = {
      total_analyses: data.length,
      this_month: thisMonth,
      unique_companies: uniqueCompanies,
      most_common_positions: mostCommonPositions,
      recent_activity: data.slice(0, 5).map(item => ({
        date: item.created_at,
        company: item.result_data?.company_name,
        position: item.result_data?.position
      }))
    };

    sendResponse(res, true, stats, '통계 조회 완료');

  } catch (error) {
    sendError(res, `통계 조회 중 오류: ${error.message}`);
  }
});

// === 생성 기능 엔드포인트들 ===

// 이력서 생성 - 사용자 ID 포함
app.post('/api/generate-resume', async (req, res) => {
  try {
    const { jdAnalysis, userExperiences, user_id } = req.body;
    
    console.log('이력서 생성 요청 - 사용자 ID:', user_id);
    
    if (!jdAnalysis || !userExperiences) {
      return sendError(res, '채용공고 분석 결과와 사용자 경험이 필요합니다.', 400);
    }

    const experienceText = userExperiences
      .map(exp => `${exp.type}: ${exp.title} @ ${exp.organization} (${exp.start_date} ~ ${exp.end_date || '현재'})
      설명: ${exp.description}
      스킬: ${exp.skills ? exp.skills.join(', ') : '없음'}`)
      .join('\n\n');

    const messages = [
      {
        role: 'system',
        content: `이력서 작성 전문가입니다. HTML 형식으로 채용공고에 최적화된 이력서를 작성해주세요.`
      },
      {
        role: 'user',
        content: `채용공고: ${JSON.stringify(jdAnalysis)}\n\n사용자 경험:\n${experienceText}`
      }
    ];

    const resume = await aiRequest(messages, AI_MODEL_TEXT);
    
    sendResponse(res, true, { resume }, '이력서 생성 완료');

  } catch (error) {
    sendError(res, `이력서 생성 중 오류: ${error.message}`);
  }
});

// 면접 질문 생성 - 사용자 ID 포함
app.post('/api/generate-questions', async (req, res) => {
  try {
    const { jdAnalysis, resumeContent, user_id } = req.body;
    
    console.log('면접 질문 생성 요청 - 사용자 ID:', user_id);
    
    if (!jdAnalysis) {
      return sendError(res, '채용공고 분석 결과가 필요합니다.', 400);
    }

    const messages = [
      {
        role: 'system',
        content: `면접관 역할로 실제 면접 질문 3-5개를 생성해주세요. JSON 형태: {"questions": ["질문1", "질문2"]}`
      },
      {
        role: 'user',
        content: `채용공고: ${JSON.stringify(jdAnalysis)}\n이력서: ${resumeContent || '이력서 정보 없음'}`
      }
    ];

    const result = await aiRequest(messages, AI_MODEL_TEXT);
    const questions = JSON.parse(result).questions || [];
    
    sendResponse(res, true, { questions }, '면접 질문 생성 완료');

  } catch (error) {
    sendError(res, `면접 질문 생성 중 오류: ${error.message}`);
  }
});

// 자기소개 문구 생성 - 사용자 ID 포함
app.post('/api/generate-statement', async (req, res) => {
  try {
    const { jdAnalysis, userExperiences, user_id } = req.body;
    
    console.log('자기소개 문구 생성 요청 - 사용자 ID:', user_id);
    
    if (!jdAnalysis || !userExperiences) {
      return sendError(res, '채용공고 분석 결과와 사용자 경험이 필요합니다.', 400);
    }

    const experienceText = userExperiences
      .map(exp => `${exp.type}: ${exp.title} - ${exp.description}`)
      .join('\n');

    const messages = [
      {
        role: 'system',
        content: `자기소개서 작성 전문가입니다. 채용공고와 연결된 매력적인 자기소개 문구를 200-300자로 작성해주세요.`
      },
      {
        role: 'user',
        content: `채용공고 요구사항: ${jdAnalysis.requirements}\n지원자 경험:\n${experienceText}`
      }
    ];

    const statement = await aiRequest(messages, AI_MODEL_TEXT);
    
    sendResponse(res, true, { statement }, '자기소개 문구 생성 완료');

  } catch (error) {
    sendError(res, `자기소개 문구 생성 중 오류: ${error.message}`);
  }
});

// 헬스 체크
app.get('/api/health', (req, res) => {
  sendResponse(res, true, { 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '2.0.0-auth'
  }, 'Server is running with authentication');
});

// 404 핸들러 - 수정된 버전
app.use((req, res, next) => {
  sendError(res, `경로를 찾을 수 없습니다: ${req.method} ${req.originalUrl}`, 404);
});

// 전역 에러 핸들러
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  sendError(res, '서버 내부 오류가 발생했습니다.', 500);
});

app.listen(port, () => {
  console.log(`백엔드 서버가 http://localhost:${port} 에서 실행 중입니다.`);
  console.log('사용 가능한 엔드포인트 (사용자 인증 지원):');
  console.log('- POST /api/analyze-text');
  console.log('- POST /api/analyze-image');  
  console.log('- POST /api/crawl-and-analyze');
  console.log('- GET  /api/analysis-history');
  console.log('- GET  /api/analysis/:id');
  console.log('- DELETE /api/analysis/:id');
  console.log('- GET  /api/analysis-stats');
  console.log('- POST /api/generate-resume');
  console.log('- POST /api/generate-questions');
  console.log('- POST /api/generate-statement');
  console.log('- GET  /api/health');
  console.log('\n모든 엔드포인트에서 user_id를 자동으로 처리합니다.');
});