-- 기능 추가용 열
-- 1) 복습 일정: 오답마다 몇 단계까지 복습했는지(review_stage)와 다음 복습 날짜(next_review_at)
--    단계 0 = 틀림 → 1일 뒤, 단계 1 = 한 번 맞힘 → 3일 뒤, 단계 2 = 완료 → 7일 뒤 최종 확인, 단계 3 = 최종 확인까지 끝
alter table public.wrong_notes
  add column review_stage int not null default 0 check (review_stage between 0 and 3),
  add column next_review_at timestamptz;
update public.wrong_notes set next_review_at = updated_at + interval '1 day' where status = 'active';
create index wrong_notes_user_due_idx on public.wrong_notes (user_id, next_review_at);

-- 2) PDF 근거 페이지 번호
alter table public.questions add column source_page int check (source_page > 0);

-- 3) 문제 수정·삭제: 문제를 빼면 뒤 문제들의 순서(position)가 당겨진다.
--    한 번에 여러 줄을 고칠 때 순서가 잠깐 겹쳐도 되도록, 같은 순서 금지 검사를 저장이 끝날 때 하게 바꾼다.
alter table public.questions drop constraint questions_set_id_position_key;
alter table public.questions add constraint questions_set_id_position_key unique (set_id, position) deferrable initially deferred;
