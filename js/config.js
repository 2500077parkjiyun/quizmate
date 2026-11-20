"use strict";
/* Supabase 연결 정보
   - URL과 publishable 키는 브라우저에 공개해도 되는 값이에요.
   - 실제 데이터 보호는 데이터베이스의 RLS(행 수준 보안) 규칙이 맡아요.
   - Gemini API 키 같은 비밀 값은 여기에 절대 넣지 않고 Supabase Edge Function 시크릿에만 둬요. */
const SUPABASE_URL = "https://bxkryvexebsevbgtsqit.supabase.co";
const SUPABASE_KEY = "sb_publishable_hdUCPExUO7-H4KzFn9RCnQ_CsX1FA1t";
