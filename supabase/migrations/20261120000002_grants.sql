-- 테이블 사용 권한(GRANT)
-- RLS는 "어떤 행"을 볼 수 있는지 정하고, GRANT는 "이 테이블을 쓸 수 있는지"를 정한다. 둘 다 있어야 한다.
-- 새 Supabase 프로젝트는 테이블에 권한을 자동으로 주지 않으므로 직접 준다.
-- - authenticated(로그인한 사용자): 필요한 만큼만 (행 범위는 RLS가 본인 것으로 제한)
-- - anon(로그인하지 않은 사용자): 아무 권한도 주지 않는다

revoke all on public.profiles, public.quiz_sets, public.questions, public.attempts, public.wrong_notes from anon;
revoke all on public.profiles, public.quiz_sets, public.questions, public.attempts, public.wrong_notes from authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.quiz_sets, public.questions, public.attempts, public.wrong_notes to authenticated;
