create table if not exists public.email_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  token text unique not null,
  used_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

create index if not exists email_verification_tokens_token_idx
on public.email_verification_tokens(token);

alter table public.email_verification_tokens enable row level security;

drop policy if exists "email verification tokens admin only" on public.email_verification_tokens;
create policy "email verification tokens admin only" on public.email_verification_tokens
for all using (public.is_admin())
with check (public.is_admin());
