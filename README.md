# 퀴즈메이트 (QuizMate)

> 수업 자료만 넣으면 AI가 시험지를 만들고, 채점과 오답노트까지 챙겨 주는 학습 웹사이트

기초웹 프로그래밍 프로젝트 · 2500077 박지윤

- 사이트: https://2500077parkjiyun.github.io/quizmate/
- 시연 영상(1차): [YouTube](https://youtu.be/Y4KwSbRvf_0) · [docs/demo.mp4](docs/demo.mp4)
- 수정 기록: [CHANGELOG.md](CHANGELOG.md)

## 주요 기능

| 페이지 | 기능 |
|---|---|
| 로그인·회원가입 | 이메일과 비밀번호로 가입·로그인 (Supabase Auth), 비밀번호 재설정 메일, 가입 없이 쓰는 체험 모드 |
| 대시보드 | 푼 문제 수, 정답률, 남은 오답, 최근 점수 그래프, **오늘 복습할 문제**, **약점 분석**(유형별·과목별 정답률, 자주 틀리는 문제) |
| 새 문제 만들기 | 글 붙여넣기, PDF·TXT·사진 업로드 → 문제 수·난이도·유형(객관식, O/X, 단답형, 서술형) 선택 → AI 문제 생성 → **AI가 한 번 더 검토**(정답 오류·겹치는 문제 고치거나 빼기) |
| 문제 풀이 | 한 문제씩 풀이, 진행률 표시, 키보드로 선택 |
| 채점 결과 | 즉시 채점, 해설과 자료 근거 문장(**PDF는 근거 쪽 번호**), 단답형은 AI가 뜻 비교, 서술형은 AI 점수와 피드백 |
| 오답노트 | 틀린 문제 자동 저장, 메모, 다시 풀기, 비슷한 문제 만들기, 두 번 연속 맞히면 완료, **1·3·7일 복습 일정** |
| 문제 세트 | 만든 시험지 목록, 다시 풀기, **문제 수정·삭제**, **시험지 인쇄**(정답지 포함), 삭제 |
| 내 데이터 | 이름 바꾸기, 데이터베이스 구조 안내, 백업 파일 내려받기·불러오기, 전체 삭제 |
| 공통 | **다크 모드**(CSS 변수로 테마 전환), 휴대폰 화면(하단 탭) |

## 구조

```
브라우저 (GitHub Pages: HTML·CSS·JavaScript)
   │  로그인, 기록 읽기·쓰기            │  문제 생성·채점 요청
   ▼                                    ▼
Supabase Auth + PostgreSQL         Supabase Edge Function "ai"
(테이블 5개, RLS로 본인 데이터만)        │  서버에 숨긴 API 키로 호출
                                        ▼
                                   Claude API (Anthropic)
```

- **AI 키는 브라우저 코드에 없습니다.** Claude API 키는 Supabase 시크릿에만 있고, 로그인한 사용자만 AI 함수를 부를 수 있습니다.
- `js/config.js`의 Supabase 주소와 publishable 키는 공개용 값입니다. 데이터 보호는 데이터베이스의 RLS 규칙이 맡습니다.

### 데이터베이스 (Supabase PostgreSQL)

| 테이블 | 내용 | 관계 |
|---|---|---|
| `profiles` | 회원 이름, 가입 시각 | 회원가입하면 자동 생성 |
| `quiz_sets` | 문제 세트: 제목, 과목, 난이도, 원본 자료, 최근·최고 점수 | 회원 1명 : 세트 여러 개 |
| `questions` | 문제: 유형, 보기, 정답, 해설, 근거 문장 | 세트 1개 : 문제 여러 개 (세트를 지우면 같이 삭제) |
| `attempts` | 풀이 기록: 점수, 문제별 내 답, AI 피드백 | 세트를 지워도 기록은 남음 |
| `wrong_notes` | 오답노트: 틀린 문제, 틀린 횟수, 연속 정답 수, 메모 | 세트를 지워도 오답은 남음 |

모든 테이블에 RLS(행 수준 보안)를 켜서 "로그인한 사람의 ID = 행의 `user_id`"인 행만 읽고 쓸 수 있습니다. 스키마: [supabase/migrations](supabase/migrations)

## 실행 방법

### 1. 웹사이트로 쓰기
https://2500077parkjiyun.github.io/quizmate/ 에 들어가서 회원가입 후 로그인합니다.

### 2. 내 컴퓨터에서 열기 (수정·확인용)
1. VS Code에서 이 폴더를 엽니다.
2. `index.html`을 **Live Server**로 실행합니다.
3. 로그인하면 같은 Supabase 데이터베이스와 AI를 그대로 씁니다. 로그인 없이 **체험 모드**를 고르면 예시 문제 세트(광합성)로 풀이·채점·오답노트를 써 볼 수 있습니다.

## 수업에서 배운 개념 적용 (기초웹 프로그래밍 1~6주차)

| 주차 | 배운 내용 | 퀴즈메이트에 적용한 곳 |
|---|---|---|
| 1주차 | 웹의 원리, HTML·CSS·JS 역할, 요청과 응답, URL, 개발 환경 | HTML(`index.html`)·CSS(`css/`)·JavaScript(`js/`)를 파일로 분리. 브라우저가 Supabase에 요청하고 응답(JSON)을 받아 화면을 그림. URL의 `#home`, `#new`, `#notes`로 화면 전환. VS Code + Live Server로 개발, GitHub로 관리 |
| 2주차 | 문서 뼈대, `meta`, `lang`, 제목 계층, 의미 있는 영역, 엔티티 | `<!DOCTYPE html>`, `<html lang="ko">`, `meta charset`·`viewport`·`description`, `<title>`. `header`·`nav`·`main`·`footer`로 영역 구분. 화면마다 `h1` 하나와 `h2` 소제목. 사용자 입력은 `&lt;` 같은 문자 참조로 바꿔 표시 |
| 3주차 | 목록, 링크, 표, 그림 묶기 | 순서가 중요한 문제별 채점은 `<ol>`, 최근 기록·세트 목록은 `<ul>`, 내 답과 정답은 `<dl>`/`<dt>`/`<dd>`. 메뉴는 `<a href="#notes">`. '내 데이터'의 테이블 설명은 `<table>`에 `<caption>`, `<thead>`, `<th scope="col">`. 점수 그래프는 `<figure>`와 `<figcaption>` |
| 4주차 | 폼, 입력 종류, 라디오·체크박스, `fieldset`, `label`, 검사 속성, 접근성 | 로그인 폼: `type="email"`, `type="password"`, `required`, `minlength`, `autocomplete`. 모든 입력 칸에 `label`(`for`와 `id` 연결 또는 감싸기). 출제 옵션: 문제 수·난이도는 라디오, 유형은 체크박스, 각각 `fieldset` + `legend`. `maxlength`로 글자 수 제한. 접근성 점검표 5개 항목 확인(아래) |
| 5주차 | 외부 스타일시트, 선택자, 우선순위, 색 표기, 단위, 웹폰트 | `<link rel="stylesheet" href="css/style.css">`. 태그·클래스·아이디 선택자. 색은 16진수·`rgba()`·`hsl()`, 단위는 `px`·`rem`·`%`·`vw`. Google Fonts(IBM Plex Sans KR, Jua)와 대체 글꼴 목록 |
| 6주차 | 박스 모델, `box-sizing`, `display`, 시각 효과, CSS 변수, 대표 선택자 | `* { box-sizing: border-box }`. 카드에 `padding`·`border-radius`·`box-shadow`. 배경에 `radial-gradient`, 상단 메뉴에 `backdrop-filter`. `:root`의 색 변수(`--primary` 등)를 `var()`로 사용하고, **다크 모드는 `:root[data-theme="dark"]`에서 변수만 바꿔서 전체 테마를 전환**. 인쇄용 `@media print`. `[data-v="ox"]` 속성 선택자, `:checked`·`:focus-visible` 가상 클래스, `input:checked + span` 결합자 |

### 접근성 점검 (4주차 점검표)

| 점검 항목 | 결과 |
|---|---|
| 모든 이미지에 대체 텍스트가 있는가 | 사진 `<img>`는 쓰지 않음. 장식용 그림(SVG)은 `aria-hidden`, 의미 있는 그래프는 `role="img"`와 `aria-label` |
| 모든 입력 칸에 이름표가 연결되어 있는가 | 로그인, 자료 입력, 출제 옵션, 답안, 메모, 필터 모두 `label` 또는 `legend` 연결 |
| Tab만으로 끝까지 갈 수 있는가 | 버튼·라디오·체크박스가 모두 진짜 입력 요소라 Tab과 방향키로 조작 가능, 포커스 테두리 표시 |
| 글자와 배경의 밝기 차이가 충분한가 | 본문 `#1A1D2E`, 보조 글자 `#575C72` on 흰 배경 |
| 색만으로 정보를 구분하지 않았는가 | 채점 표시는 색과 함께 ○·／·△ 모양, 정답·오답에 "정답"·"내 답" 글자 표시 |

## 개발 과정

1. **Bolt AI + Gemini + Supabase**로 시작했지만, 무료 플랜 토큰 한도로 채점·오답노트를 만들기 전에 개발이 멈춤 ([docs/prompt.md](docs/prompt.md)는 이때의 기능 명세)
2. 개발 도구를 **Claude**로 바꿔 Claude 페이지(아티팩트)로 핵심 기능 8개 완성
3. 디자인 수정, 데이터 저장 방식 점검('내 데이터' 화면), 수업 PDF로 실제 시험
4. **11월 20일~:** Claude 페이지 밖에서도 동작하도록 직접 구축. 파일 분리 → Supabase DB·로그인 → Supabase Edge Function으로 Claude API 연결 → 수업 1~6주차 개념 적용 ([CHANGELOG.md](CHANGELOG.md))

## 일정 (최종 발표 12월 2일)

| 기간 | 할 일 | 상태 |
|---|---|---|
| ~10/31 | 핵심 기능 8개 (자료 입력, AI 문제 생성, 풀이, 채점, 해설, 오답노트, 대시보드, 내 데이터) | 완료 |
| 11/20 | 파일 구조 정리, Supabase DB·이메일 로그인, AI를 Edge Function + Claude API로 연결, 수업 개념 적용 | 완료 |
| 11/20 | 복습 일정(1·3·7일), 약점 분석, 문제 수정·삭제, 시험지 인쇄, 다크 모드, PDF 근거 쪽 번호, 문제 자동 검증, 비밀번호 재설정 | 완료 |
| 11/21~11/28 | 기능 다듬기, 실제 수업 자료로 시험 | 진행 중 |
| 11/29~12/1 | 시연 영상, 발표 PPT, 최종 점검 | 예정 |
| 12/2 | 최종 발표 | 예정 |

## 폴더 구성

```
quizmate/
├── index.html              # 문서 뼈대 (구조)
├── css/
│   └── style.css           # 디자인
├── js/
│   ├── config.js           # Supabase 연결 주소 (공개용 값)
│   ├── data.js             # 상수, 예시 문제 세트, 도우미 함수, 앱 상태
│   ├── store.js            # 로그인과 데이터 저장 (Supabase)
│   ├── ai.js               # AI 서버 함수 호출, AI 응답 검사
│   ├── views.js            # 화면 그리기
│   └── app.js              # 화면 전환, 풀이 흐름, 이벤트 처리
├── supabase/
│   ├── migrations/         # 데이터베이스 테이블과 RLS (SQL)
│   └── functions/ai/       # AI 서버 함수 (Claude API 호출)
├── docs/
│   ├── prompt.md           # 처음 작성한 기능 명세 (Bolt AI 시절)
│   └── demo.mp4            # 1차 시연 영상
├── CHANGELOG.md            # 수정 기록
└── README.md               # 이 문서
```
