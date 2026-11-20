# 수정 기록 (CHANGELOG)

퀴즈메이트를 고칠 때마다 무엇을, 왜 바꿨는지 날짜별로 적습니다. 가장 최근 기록이 위에 있습니다.

## 2026-11-20

### AI 기능을 Supabase Edge Function + Claude API로 연결
- **바뀐 것**
  - 서버 함수 `supabase/functions/ai/index.ts` 추가: 문제 생성, 단답형·서술형 채점, 비슷한 문제 만들기, 사진 글자 읽기(OCR)
  - 함수가 Anthropic의 Claude API(Messages API)를 부름. 기본 모델은 `claude-sonnet-5-5`이고 시크릿 `ANTHROPIC_MODEL`로 바꿀 수 있음
  - 브라우저는 `aiCall()`로 이 함수만 부르고, Claude API 키는 Supabase 시크릿(`ANTHROPIC_API_KEY`)에만 둠
  - 로그인한 사용자만 AI를 쓸 수 있게 함수 안에서 로그인 토큰을 확인
  - AI에게 주는 지시문(프롬프트)을 서버로 옮겨서, 함수를 다른 용도로 쓸 수 없게 함
  - 사진은 긴 변 1600px로 줄여서 보냄 (전송 용량 감소)
- **이유:** Claude 페이지 밖(GitHub Pages)에서도 Claude AI가 동작하게 하고, API 키가 코드에 드러나지 않게 하기 위해. 처음 명세(docs/prompt.md)의 Gemini 계획은 쓰지 않고 Claude로만 개발
- **확인:** 함수 배포 완료. 체험 모드에서는 "로그인하면 AI를 쓸 수 있어요" 안내가 나오고 예시 세트 풀이는 그대로 동작

### 이메일 로그인 + Supabase에 기록 저장
- **바뀐 것**
  - 로그인·회원가입 화면 추가 (Supabase Auth, 이메일과 비밀번호). 로그인하지 않으면 이 화면이 먼저 나옴
  - 문제 세트·풀이 기록·오답노트를 Supabase 테이블에 저장하고 불러오도록 `js/store.js`를 새로 씀 (`js/config.js`에 연결 주소)
  - 가입 없이 써 볼 수 있는 **체험 모드** (기록은 이 브라우저에만 저장)
  - 위쪽에 저장 상태, 로그인한 이름, 로그아웃 버튼 표시
  - '내 데이터' 화면을 Supabase 구조(테이블 5개, RLS 설명)로 바꿈
  - 백업 파일을 진짜 파일로 내려받기 (전에는 클립보드 복사)
- **이유:** 사용자마다 자기 계정으로 로그인하고, 어느 기기에서든 같은 기록을 보게 하기 위해
- **확인:** 로그인 화면, 회원가입 탭, 체험 모드로 예시 세트 풀이와 채점, '내 데이터' 화면 동작

### Supabase 데이터베이스 만들기
- **바뀐 것:** Supabase 프로젝트에 테이블 5개를 만듦 (`supabase/migrations/20261120000001_init_schema.sql`)
  - `profiles` 회원 정보, `quiz_sets` 문제 세트, `questions` 문제, `attempts` 풀이 기록, `wrong_notes` 오답노트
  - 모든 테이블에 RLS(행 수준 보안)를 켜서 로그인한 본인의 데이터만 읽고 쓸 수 있게 함
  - 회원가입하면 `profiles`에 한 줄이 자동으로 생기는 트리거
- **이유:** 처음 기능 명세의 "Supabase 로그인과 데이터베이스"를 직접 구축하기 위해. 이전에는 Claude 페이지의 저장 공간을 빌려 썼음
- **확인:** Supabase 보안 점검(advisors)에서 경고 0개

### 파일 구조 정리 (HTML·CSS·JS 분리)
- **바뀐 것:** `index.html` 한 파일(1,472줄)에 섞여 있던 디자인과 동작 코드를 역할별 파일로 나눔
  - `css/style.css`: 디자인
  - `js/data.js`: 상수, 예시 문제 세트, 도우미 함수, 앱 상태
  - `js/store.js`: 데이터 저장
  - `js/ai.js`: AI 연결과 프롬프트
  - `js/views.js`: 화면 그리기
  - `js/app.js`: 화면 전환, 문제 풀이 흐름, 이벤트 처리
- **이유:** 수업 1장 "HTML은 구조, CSS는 디자인, JavaScript는 동작" 원칙에 맞추고, 기능을 추가할 때 고칠 곳을 쉽게 찾기 위해
- **확인:** 대시보드와 예시 문제 풀이가 나누기 전과 똑같이 동작함
