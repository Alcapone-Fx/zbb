-- feedback_submissions: tracks each successful feedback post for rate limiting.
-- No content stored here — all data lives in GitHub Issues.

create table feedback_submissions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table feedback_submissions enable row level security;

create policy "users can insert own"
  on feedback_submissions for insert
  with check (user_id = auth.uid());

create policy "users can select own"
  on feedback_submissions for select
  using (user_id = auth.uid());

-- Used by the daily-count query in /api/feedback
create index feedback_submissions_user_day
  on feedback_submissions (user_id, created_at);
