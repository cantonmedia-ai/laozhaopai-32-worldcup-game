import { Gift, Medal, ShieldCheck, Trophy, UsersRound } from "lucide-react";
import { PageShell, SectionHeader, StatCard } from "@/components/app-shell";
import { rewards } from "@/lib/demo-data";

const pointRules = [
  ["Correct Last 32 match winner", "+5 points"],
  ["Correct Last 16 match winner", "+8 points"],
  ["Correct Last 8 match winner", "+12 points"],
  ["Correct Last 4 match winner", "+18 points"],
  ["Correct Final winner", "+30 points"],
];

const referralScheme = [
  "Every player has a referral code and referral link.",
  "Early signup bonus gives +10 points in the bonus ledger.",
  "Successful referral signup gives +5 referral points.",
  "Referral rewards are tracked separately from match winner accuracy.",
];

const claimRules = [
  "Knockout Winner Challenge prizes use the final personal ranking.",
  "Tie breaks can compare correct predictions, accuracy, and earlier profile completion.",
  "Admins manage prize settings and claim codes in the reward admin page.",
  "WhatsApp number is used only for prize notification.",
];

export default function RewardsPage() {
  return (
    <PageShell active="/rewards" publicMode>
      <main className="mx-auto max-w-6xl px-4 py-10">
        <SectionHeader
          eyebrow="Rewards"
          title="淘汰赛赢家战奖品与积分"
          body="Knockout Winner Challenge prizes follow the personal winner-prediction ranking. Guess more knockout winners correctly to climb the leaderboard."
        />

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Game" value="淘汰赛赢家战" tone="gold" />
          <StatCard label="Ranking" value="Personal" tone="green" />
          <StatCard label="Top Prize" value="Main Rank" tone="navy" />
          <StatCard label="Claim" value="Claim Code" />
        </div>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {rewards.map((reward) => (
            <div key={reward.id} className="card flex gap-4 p-5">
              <div className="grid size-12 shrink-0 place-items-center rounded bg-[#f4c542] text-[#071525]">
                <Gift />
              </div>
              <div>
                <p className="font-black text-slate-950">{reward.rewardName}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {reward.rankType}
                  {reward.rankPosition ? ` · Rank ${reward.rankPosition}` : ""}
                </p>
                <span className="mt-3 inline-flex rounded bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  {reward.claimStatus}
                </span>
              </div>
            </div>
          ))}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="card p-5">
            <div className="flex items-center gap-2">
              <Trophy className="text-[#d71920]" />
              <h2 className="text-xl font-black text-slate-950">
                Point System
              </h2>
            </div>
            <div className="mt-4 grid gap-3">
              {pointRules.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded bg-slate-100 p-3"
                >
                  <span className="font-black text-slate-700">{label}</span>
                  <span className="font-black text-[#d71920]">{value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <div className="flex items-center gap-2">
              <UsersRound className="text-[#0f8a4b]" />
              <h2 className="text-xl font-black text-slate-950">
                Referral Scheme
              </h2>
            </div>
            <ol className="mt-4 grid gap-3">
              {referralScheme.map((rule, index) => (
                <li key={rule} className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded bg-[#0f8a4b] text-sm font-black text-white">
                    {index + 1}
                  </span>
                  <span className="pt-0.5 text-sm font-semibold text-slate-700">
                    {rule}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="card p-5">
            <div className="flex items-center gap-2">
              <Medal className="text-[#f4c542]" />
              <h2 className="text-xl font-black text-slate-950">
                Prize Setting
              </h2>
            </div>
            <div className="mt-4 rounded bg-slate-100 p-4 font-bold text-slate-700">
              Prize setting belongs to 淘汰赛赢家战 / Knockout Winner Challenge Ranking.
            </div>
          </section>

          <section className="card p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-[#d71920]" />
              <h2 className="text-xl font-black text-slate-950">
                Claim Rules
              </h2>
            </div>
            <ol className="mt-4 grid gap-3">
              {claimRules.map((rule, index) => (
                <li key={rule} className="flex gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded bg-[#d71920] text-sm font-black text-white">
                    {index + 1}
                  </span>
                  <span className="pt-0.5 text-sm font-semibold text-slate-700">
                    {rule}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </main>
    </PageShell>
  );
}
