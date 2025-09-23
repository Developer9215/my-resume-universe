// README.md
# My Resume Universe

AI 기반 취업 지원 및 커리어 관리 대시보드

## ✨ 주요 기능

### 🎯 핵심 기능 (1순위)
- **📄 JD 분석**: AI가 채용공고에서 핵심 키워드와 요구사항 자동 추출
- **🚀 맞춤 이력서 생성**: JD와 사용자 경험을 매칭하여 최적화된 이력서 자동 생성
- **💼 경험 관리**: 교육, 프로젝트, 경력 등 커리어 데이터 체계적 관리
- **❓ 예상 면접 질문**: JD와 이력서 분석을 통한 맞춤형 면접 질문 생성
- **✨ 자기소개서 생성**: JD 기반 개인화된 자기소개/PR 문구 생성

### ⭐ 프리미엄 기능 (2순위)
- **🔍 실시간 채용공고 추천**: 사용자 프로필 기반 맞춤 공고 크롤링 및 추천
- **📅 공채 캘린더**: 지원 일정 관리 및 알림 기능

## 🛠 기술 스택

- **Frontend**: React 18, CSS Variables
- **Backend**: Supabase (Database + Auth)
- **AI**: OpenAI GPT API
- **State Management**: React Hooks
- **Routing**: React Router
- **Styling**: CSS Variables + Custom Components

## 🚀 설치 및 실행

### 1. 프로젝트 클론 및 의존성 설치
```bash
git clone <repository-url>
cd my-resume-universe
npm install
```

### 2. 환경 변수 설정
```bash
# .env.local 파일 생성
cp .env.example .env.local
```

`.env.local` 파일을 열어서 다음 값들을 입력하세요:
```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_OPENAI_API_KEY=sk-your-openai-key
```

### 3. Supabase 데이터베이스 설정

Supabase 프로젝트의 SQL Editor에서 다음 쿼리를 실행하세요:

```sql
-- 사용자 테이블
CREATE TABLE public.users (
    id uuid NOT NULL PRIMARY KEY,
    email text,
    name text,
    created_at timestamptz DEFAULT now()
);

-- 사용자 경험 테이블
CREATE TABLE public.user_experiences (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES public.users(id),
    type text,
    title text,
    organization text,
    start_date date,
    end_date date,
    description text,
    skills jsonb
);

-- JD 테이블
CREATE TABLE public.jds (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES public.users(id),
    title text,
    original_text text,
    extracted_keywords text[],
    summary text,
    created_at timestamptz DEFAULT now()
);

-- 생성된 이력서 테이블
CREATE TABLE public.generated_resumes (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES public.users(id),
    jd_id uuid REFERENCES public.jds(id),
    content text,
    created_at timestamptz DEFAULT now()
);

-- 채용공고 테이블 (추후 크롤링용)
CREATE TABLE public.job_postings (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    title text,
    company text,
    url text,
    description text,
    posted_at timestamptz,
    source text
);

-- 지원 현황 테이블
CREATE TABLE public.applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES public.users(id),
    job_posting_id uuid REFERENCES public.job_postings(id),
    company text,
    position text,
    deadline date,
    status text,
    memo text,
    created_at timestamptz DEFAULT now()
);
```

### 4. RLS (Row Level Security) 설정

각 테이블에 대해 RLS를 활성화하고 정책을 설정하세요:

```sql
-- RLS 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- 사용자별 데이터 접근 정책
CREATE POLICY "Users can insert their own data" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view their own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- 경험 테이블 정책
CREATE POLICY "Users can manage their experiences" ON public.user_experiences
    FOR ALL USING (auth.uid() = user_id);

-- JD 테이블 정책
CREATE POLICY "Users can manage their JDs" ON public.jds
    FOR ALL USING (auth.uid() = user_id);

-- 이력서 테이블 정책
CREATE POLICY "Users can manage their resumes" ON public.generated_resumes
    FOR ALL USING (auth.uid() = user_id);

-- 지원 현황 정책
CREATE POLICY "Users can manage their applications" ON public.applications
    FOR ALL USING (auth.uid() = user_id);
```

### 5. 개발 서버 실행
```bash
npm start
```

브라우저에서 `http://localhost:3000`을 열어서 확인하세요.

## 📱 사용법

### 1. 회원가입/로그인
- 새 계정을 만들거나 기존 계정으로 로그인

### 2. 경험 데이터 입력
- "경험 관리" 탭에서 교육, 경력, 프로젝트 등을 입력
- 구체적인 성과와 사용 기술을 포함해서 작성

### 3. JD 분석
- "JD 분석" 탭에서 채용공고를 붙여넣기
- AI가 핵심 키워드와 요구사항을 자동 분석

### 4. 이력서 생성
- "이력서 생성" 탭에서 분석된 JD 선택
- AI가 JD에 맞춰 최적화된 이력서 자동 생성
- 함께 생성되는 자기소개서와 예상 면접 질문 확인

## 🎨 디자인 시스템

이 프로젝트는 **CSS Variables**를 사용한 커스텀 디자인 시스템을 사용합니다:

### 색상 시스템
```css
/* Primary Colors */
--primary-500: #3b82f6;
--primary-600: #2563eb;

/* Gray Scale */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-500: #6b7280;
--gray-900: #111827;

/* Semantic Colors */
--success-500: #10b981;
--warning-500: #f59e0b;
--error-500: #ef4444;
```

### 컴포넌트 클래스
```css
/* 버튼 */
.btn .btn-primary .btn-secondary

/* 폼 */
.form-input .form-textarea .form-select

/* 카드 */
.card .card-header .card-body

/* 뱃지 */
.badge .badge-primary .badge-success
```

### 레이아웃 유틸리티
```css
/* 플렉스 */
.flex .flex-col .items-center .justify-between

/* 그리드 */
.grid .grid-cols-2 .grid-cols-3

/* 간격 */
.p-4 .m-4 .mb-6 .mt-8

/* 텍스트 */
.text-center .text-lg .font-semibold
```

## 🔧 추가 개발 계획

- [ ] **채용공고 크롤링**: 사람인, 잡코리아 등 API 연동
- [ ] **알림 시스템**: 지원 마감일 알림, 면접 일정 관리
- [ ] **이력서 템플릿**: 다양한 디자인 옵션 제공
- [ ] **협업 기능**: 멘토-멘티 매칭, 피드백 시스템
- [ ] **분석 대시보드**: 지원 성과 통계 및 개선 제안
- [ ] **모바일 앱**: React Native 버전 개발
- [ ] **다크 모드**: 테마 전환 기능

## 🐛 문제 해결

### 자주 발생하는 문제들

**1. Supabase 연결 오류**
```bash
Error: Invalid API key
```
→ `.env.local` 파일의 API 키를 확인하세요.

**2. OpenAI API 오류**
```bash
Error: Insufficient quota
```
→ OpenAI 계정의 사용량과 결제 정보를 확인하세요.

**3. CORS 오류**
```bash
Access to fetch blocked by CORS policy
```
→ Supabase 프로젝트 설정에서 도메인을 허용 목록에 추가하세요.

### 개발 모드에서 API 테스트

```javascript
// 브라우저 콘솔에서 테스트
import { supabase } from './src/services/supabase'

// 연결 테스트
supabase.auth.getSession().then(console.log)

// 데이터 테스트 (로그인 후)
supabase.from('user_experiences').select('*').then(console.log)
```

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 지원

문의사항이 있으시면 이슈를 생성해주세요.

---

**Happy Coding! 🚀**