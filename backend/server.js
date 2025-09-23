// server.js
require('dotenv').config();

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // service_role 키 사용
console.log('읽어온 Supabase Key:', supabaseKey); // 이 줄을 추가합니다
const supabase = createClient(supabaseUrl, supabaseKey);

// OpenAI API 설정
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const AI_MODEL = 'gpt-3.5-turbo';

const app = express();
const port = 5000;

app.use(cors({
  origin: 'http://localhost:3000'
}));
app.use(express.json());

// OpenAI API 요청 함수
const aiRequest = async (messages) => {
  try {
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: AI_MODEL,
        messages,
        temperature: 0.3,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('AI API 호출 오류:', error);
    throw new Error('AI 분석에 실패했습니다.');
  }
};

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
  ];

  const result = await aiRequest(messages);
  
  try {
    return JSON.parse(result);
  } catch (e) {
    console.error('JSON 파싱 오류:', e);
    return {
      keywords: [],
      requirements: '분석 중 오류가 발생했습니다.',
      preferences: '분석 중 오류가 발생했습니다.',
      key_responsibilities: '분석 중 오류가 발생했습니다.',
      summary: '분석 중 오류가 발생했습니다.'
    };
  }
};


// URL 크롤링, AI 분석, Supabase 저장 엔드포인트
app.post('/api/crawl-and-analyze', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL이 필요합니다.' });
  }

  try {
    // 1단계: 웹 크롤링
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });
    
    // 2단계: cheerio를 사용한 텍스트 추출 로직 (추가)
    const $ = cheerio.load(response.data);
    let extractedText = '';
    const selectors = [
      '.recruit-info', '.job-detail', '.content-wrap', '.job-summary',
      '.job-description', '.info-wrap', '.job-info',
      '.content', '.description', 'main', '.container'
    ];
    for (const selector of selectors) {
      const text = $(selector).text().trim();
      if (text.length > extractedText.length) {
        extractedText = text;
      }
    }
    if (extractedText.length < 200) {
      extractedText = $('body').text().trim();
    }
    extractedText = extractedText.replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim();
    if (!extractedText || extractedText.length < 100) {
      return res.status(404).json({ error: '웹페이지에서 충분한 채용공고 정보를 찾을 수 없습니다.' });
    }

    // 3단계: AI 분석
    const analysisResult = await analyzeJDContent(extractedText);
    
    // 4단계: Supabase에 결과 저장 (service_role 키 사용)
    const { data, error } = await supabase
      .from('analysis_results')
      .insert({
        input_type: 'url',
        input_data: { url },
        result_data: analysisResult
      });
      
    if (error) {
      console.error('Supabase 저장 오류:', error);
      return res.status(500).json({ error: '분석 결과 저장에 실패했습니다.' });
    }
    
    // 클라이언트에 분석 결과 반환
    res.json({ analysis: analysisResult });

  } catch (error) {
    console.error('크롤링 오류:', error.message);
    let errorMessage = `URL 크롤링 중 오류가 발생했습니다: ${error.message}`;
    if (error.response?.status === 403) {
      errorMessage = '웹사이트가 접근을 차단했습니다.';
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = '요청 시간이 초과되었습니다.';
    }
    res.status(500).json({ error: errorMessage });
  }
});

app.listen(port, () => {
  console.log(`백엔드 서버가 http://localhost:${port} 에서 실행 중입니다.`);
});