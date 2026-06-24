import { AdminLayout } from "@/components/admin-layout";
import { SectionHeader } from "@/components/app-shell";
import {
  createServiceClient,
  hasSupabaseServiceEnv,
} from "@/lib/supabase/service";
import { roadStageCopy, roadStageOrder, type RoadStageKey } from "@/lib/road-to-champion";

type Game1Stage = {
  stage_key: RoadStageKey;
  stage_name: string;
  required_selection_count: number;
  points_per_correct: number;
  status: string;
  due_at: string;
};

type Game2Round = {
  round_key: RoadStageKey;
  round_name: string;
  status: string;
};

async function loadStages() {
  if (!hasSupabaseServiceEnv()) {
    return { game1: [] as Game1Stage[], game2: [] as Game2Round[], error: "" };
  }

  try {
    const supabase = createServiceClient();
    const [{ data: game1Rows, error: game1Error }, { data: game2Rows, error: game2Error }] =
      await Promise.all([
        supabase
          .from("prediction_stages")
          .select(
            "stage_key, stage_name, required_selection_count, points_per_correct, status, due_at",
          ),
        supabase.from("knockout_rounds").select("round_key, round_name, status"),
      ]);

    if (game1Error) throw game1Error;
    if (game2Error) throw game2Error;

    const sortStage = (a: { stage_key?: RoadStageKey; round_key?: RoadStageKey }, b: { stage_key?: RoadStageKey; round_key?: RoadStageKey }) =>
      roadStageOrder.indexOf((a.stage_key ?? a.round_key) as RoadStageKey) -
      roadStageOrder.indexOf((b.stage_key ?? b.round_key) as RoadStageKey);

    return {
      game1: ((game1Rows ?? []) as Game1Stage[]).sort(sortStage),
      game2: ((game2Rows ?? []) as Game2Round[]).sort(sortStage),
      error: "",
    };
  } catch (error) {
    return {
      game1: [] as Game1Stage[],
      game2: [] as Game2Round[],
      error:
        error instanceof Error ? error.message : "Unable to load live stages.",
    };
  }
}

export default async function AdminRoundsPage() {
  const { game1, game2, error } = await loadStages();

  return (
    <AdminLayout active="/admin/rounds">
      <SectionHeader eyebrow="Rounds" title="Manage stages" />
      {error ? (
        <div className="mb-4 rounded bg-yellow-50 p-4 text-sm font-bold text-yellow-900">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-xl font-black">Game 1 · Ultimate Predictor</h2>
          <div className="mt-4 grid gap-3">
            {game1.length === 0 ? (
              <p className="rounded bg-slate-100 p-3 text-sm font-bold text-slate-500">
                No live Game 1 stages yet.
              </p>
            ) : null}
            {game1.map((stage) => (
              <div key={stage.stage_key} className="rounded bg-slate-100 p-4">
                <p className="whitespace-pre-line text-sm font-black text-[#0f8a4b]">
                  {roadStageCopy[stage.stage_key]?.shortName ?? stage.stage_name}
                </p>
                <p className="mt-2 font-semibold text-slate-600">
                  Pick {stage.required_selection_count} · +{stage.points_per_correct} each · {stage.status}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  Due: {new Date(stage.due_at).toLocaleString("zh-MY")}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="text-xl font-black">Game 2 · Knockout Winner</h2>
          <div className="mt-4 grid gap-3">
            {game2.length === 0 ? (
              <p className="rounded bg-slate-100 p-3 text-sm font-bold text-slate-500">
                No live Game 2 rounds yet.
              </p>
            ) : null}
            {game2.map((round) => (
              <div key={round.round_key} className="rounded bg-slate-100 p-4">
                <p className="whitespace-pre-line text-sm font-black text-[#0f8a4b]">
                  {roadStageCopy[round.round_key]?.shortName ?? round.round_name}
                </p>
                <p className="mt-2 font-semibold text-slate-600">
                  {round.round_name} · {round.status}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
