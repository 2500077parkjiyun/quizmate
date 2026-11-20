-- 퀴즈메이트 DB 스키마 (1차)
-- 테이블 5개: profiles, quiz_sets, questions, attempts, wrong_notes
-- 모든 테이블에 RLS를 켜고, 로그인한 사용자 본인의 데이터만 읽고 쓸 수 있게 한다.

-- 1) 프로필: 회원가입하면 자동으로 한 줄 생성
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- 2) 문제 세트: 사용자가 올린 자료 한 개 = 세트 한 개
create table public.quiz_sets (
  id text primary key,                                   -- 앱에서 만드는 id (예: set_mabc12)
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  subject text not null default '기타',
  difficulty text not null default 'medium' check (difficulty in ('easy','medium','hard')),
  types text[] not null default '{}',
  material text not null default '' check (char_length(material) <= 20000),
  attempt_count int not null default 0,
  last_score int check (last_score between 0 and 100),
  best_score int check (best_score between 0 and 100),
  created_at timestamptz not null default now()
);

-- 3) 문제: 세트에 속한 문제 (세트를 지우면 같이 지워짐)
create table public.questions (
  id text primary key,                                   -- 예: set_mabc12-q1
  set_id text not null references public.quiz_sets(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  position int not null,
  type text not null check (type in ('multiple_choice','ox','short_answer','essay')),
  question text not null,
  options jsonb not null default '[]',
  answer text not null,
  acceptable_answers jsonb not null default '[]',
  rubric text not null default '',
  explanation text not null default '',
  source_quote text not null default '',
  difficulty text not null default 'medium' check (difficulty in ('easy','medium','hard')),
  unique (set_id, position)
);

-- 4) 풀이 기록: 한 번 풀 때마다 한 줄
create table public.attempts (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  set_id text references public.quiz_sets(id) on delete set null,   -- 세트를 지워도 점수 기록은 남김
  title text not null,
  subject text not null default '',
  mode text not null default 'set',
  score int not null check (score between 0 and 100),
  correct int not null default 0,
  total int not null check (total > 0),
  by_type jsonb not null default '{}',
  fallback boolean not null default false,
  answers jsonb not null default '[]',                    -- 문제별 내 답, 정답 여부, 점수, 피드백
  created_at timestamptz not null default now()
);

-- 5) 오답노트: 틀린 문제를 복사해 저장 (세트를 지워도 남음)
create table public.wrong_notes (
  id text primary key,                                   -- 예: wn_set_mabc12-q1
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  set_id text references public.quiz_sets(id) on delete set null,
  set_title text not null default '',
  subject text not null default '기타',
  question jsonb not null,
  wrong_answer text,
  wrong_count int not null default 0,
  correct_streak int not null default 0,
  memo text not null default '' check (char_length(memo) <= 1000),
  status text not null default 'active' check (status in ('active','mastered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 자주 쓰는 조회용 인덱스
create index quiz_sets_user_created_idx on public.quiz_sets (user_id, created_at desc);
create index questions_set_idx on public.questions (set_id, position);
create index questions_user_idx on public.questions (user_id);
create index attempts_user_created_idx on public.attempts (user_id, created_at desc);
create index attempts_set_idx on public.attempts (set_id);
create index wrong_notes_user_status_idx on public.wrong_notes (user_id, status);
create index wrong_notes_set_idx on public.wrong_notes (set_id);

-- RLS: 본인 데이터만
alter table public.profiles    enable row level security;
alter table public.quiz_sets   enable row level security;
alter table public.questions   enable row level security;
alter table public.attempts    enable row level security;
alter table public.wrong_notes enable row level security;

create policy "본인 프로필 조회" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "본인 프로필 수정" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "본인 세트" on public.quiz_sets for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "본인 문제" on public.questions for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.quiz_sets s where s.id = set_id and s.user_id = (select auth.uid()))
  );

create policy "본인 풀이 기록" on public.attempts for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "본인 오답노트" on public.wrong_notes for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- 회원가입 시 프로필 자동 생성
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
