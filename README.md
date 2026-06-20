# 老招牌 32强冠军竞猜赛

Runnable Next.js MVP for the Lao Zhao Pai 32-team football prediction game.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The app runs in demo mode without Supabase keys. Demo mode uses local seed data so the landing page, prediction flow, leaderboard, squad page, rewards, rules, profile screen, and admin screens are immediately clickable.

## Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Do not expose the Supabase service role key in the browser.

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/migrations/001_initial_schema.sql` in the SQL editor.
3. Run later migrations in order, including `002_score_bonus_rules.sql`, `003_referral_flow.sql`, `004_multi_team_squads.sql`, `005_squad_team_names.sql`, and `006_working_leaderboards.sql`.
4. Optionally run `supabase/seed/001_demo_seed.sql`.
5. In Authentication, enable Google provider.
6. In Authentication, enable Apple provider when the Apple developer credentials are ready.
7. Add this redirect URL in Supabase Auth settings:

```text
http://localhost:3000/auth/callback
https://your-vercel-domain.vercel.app/auth/callback
```

## Google / Apple Login

- Homepage login buttons use Supabase OAuth.
- Google provider id: `google`.
- Apple provider id: `apple`.
- First-time users are redirected to `/setup-profile`.
- Returning users with `profile_completed = true` are redirected to the requested `next` path, usually `/game` or `/predict`.
- The homepage CTA uses `/login?next=/predict`, so players do not bypass login before prediction.
- In local demo mode without Supabase env vars, login buttons redirect to demo profile setup instead of external OAuth.

## Make A User Admin

After the user logs in once, update their profile:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@example.com';
```

## Core Backend Behavior

- `handle_new_user()` creates a profile row after Supabase Auth signup.
- `submit_prediction()` lets players create or update their own prediction before deadline, including `predicted_winner_team_id`, `predicted_team_a_score`, and `predicted_team_b_score`.
- `confirm_match_result()` is admin-only. It confirms the result, locks predictions, awards round points, exact-score bonuses, writes score history, and inserts an audit log.
- `rebuild_leaderboards()` rebuilds overall and round leaderboard snapshots after results are confirmed.
- `get_leaderboard()` reads overall, round, squad, and invite popularity leaderboards.
- `accept_referral()` records a stored invite code after profile setup and prevents self-referral or duplicate referral.
- `accept_referral()` also assigns the new member into the inviter's current open squad team.
- `get_my_squad()` returns the current user's visible squad teams, team numbers, team status, and member rows.
- `rename_squad_team()` lets only the team owner rename a squad team.
- RLS prevents players from changing scores, roles, match results, other players' predictions, or admin records.

## Squad / Referral Flow

1. Player A shares `/squad` invite link with `?ref=A_REFERRAL_CODE`.
2. Visitor B opens the link. `ReferralCapture` stores the code in `localStorage` and a cookie before login.
3. B logs in with Google or Apple.
4. B completes `/setup-profile`.
5. The setup form updates B's profile and calls `accept_referral(stored_code)`.
6. Supabase finds A by `profiles.referral_code`.
7. Supabase writes `profiles.referred_by_profile_id = A.profile_id` for B.
8. Supabase inserts one row in `referrals`: `referrer_profile_id = A`, `referred_profile_id = B`, `referral_code = A_REFERRAL_CODE`.
9. Supabase assigns B to A's current open `squad_teams` record through `squad_team_members`.
10. `/squad` calls `get_my_squad()` to show A's Team 1, Team 2, and any team the current player belongs to.

Team member identity is based on profile UUIDs, not display names. Display names can change; `profiles.id`, `referrals.referrer_profile_id`, `referrals.referred_profile_id`, `squad_teams.owner_profile_id`, and `squad_team_members.profile_id` are the durable relationship records.

## Multi-Team Squad Rules

- Every player has one personal referral code.
- Every player can invite friends and own multiple teams.
- Every team has an owner-defined public team name.
- A team has maximum 5 players total, including the owner.
- A team is considered formed when it has at least 2 invited friends, meaning 3 players total including the owner.
- When the owner's current team reaches 5 players, the next referred player automatically starts the owner's next team.
- A team member still keeps their own code and can invite their own friends into their own Team 1, Team 2, and so on.
- Direct referral is still one level for fairness: A sees people A invited; B can separately build B's own teams.

## Scoring Method

- Level 1 correct winner / advancing team: stage base points.
- 32强: 10 points.
- 16强: 15 points.
- 8强: 20 points.
- 4强: 25 points.
- Final champion: 40 points.
- Level 2 one exact team score: +5 bonus points.
- Level 2 both exact team scores: +15 bonus points total.
- Level 1 and Level 2 are independent. A player can pick one team as winner while entering a scoreline where the other team has more goals.

Example: In a 32强 match, a correct winner gives 10 points. If the score guess also matches one team's exact score, add 5 points. If the full score is exact, add 15 points. The score bonus can still be earned even when the winner pick is wrong.

## Deployment

Deploy to Vercel, add the same environment variables, and add the production callback URL to Supabase Auth redirect URLs.

## MVP Coverage

Player:
- Landing page
- Google / Apple OAuth structure
- First-login profile setup
- Prediction page
- Score dashboard
- Leaderboards
- Squad and referral sharing
- Rewards and rules

Admin:
- Dashboard
- Game, team, round, match management views
- Result entry flow
- Player, prediction, leaderboard, referral, reward, and audit views

Future-ready areas are kept separate in `src/lib/scoring.ts`, `src/lib/demo-data.ts`, and Supabase RPC functions for exact score bonuses, badges, share cards, notifications, and reward claim QR codes.
