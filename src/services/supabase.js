// src/services/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY

console.log('환경변수 확인:', {
  url: !!supabaseUrl,
  key: !!supabaseKey,
  urlValue: supabaseUrl?.substring(0, 20) + '...',
  keyLength: supabaseKey?.length
})

if (!supabaseUrl || !supabaseKey) {
  console.error('환경변수 누락:', { supabaseUrl, supabaseKey })
  throw new Error(
    'Supabase 환경변수가 설정되지 않았습니다. .env.local 파일을 확인해주세요.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})