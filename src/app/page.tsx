import { createAuthenticationRiskDemo } from "@/server/analysis/demo/authentication-risk";

const actionLabels = {
  standard_review: "Standard review",
  focused_review: "Focused review",
  block_until_addressed: "Block until addressed",
} as const;

function formatLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export default function Home() {
  const analysis = createAuthenticationRiskDemo();
  const { pullRequest, signals, decision } = analysis;

  const signalCards = [
    {
      label: "Overall risk",
      value: signals.overallRisk.value,
      confidence: signals.overallRisk.confidence,
    },
    {
      label: "Primary area",
      value: signals.primaryChangeArea.value,
      confidence: signals.primaryChangeArea.confidence,
    },
    {
      label: "Blast radius",
      value: signals.blastRadius.value,
      confidence: signals.blastRadius.confidence,
    },
    {
      label: "Test coverage",
      value: signals.testAssessment.value,
      confidence: signals.testAssessment.confidence,
    },
  ];

  return (
    <main className="min-h-screen bg-[#090b10] text-zinc-100">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">
        <header className="mb-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 font-mono text-sm font-semibold text-emerald-300">
              DG
            </div>

            <div>
              <p className="font-semibold tracking-tight">DiffGuard</p>
              <p className="text-xs text-zinc-500">
                Probabilistic PR risk triage
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-xs font-medium text-amber-200">
            <span className="size-1.5 rounded-full bg-amber-300" />
            Demo data
          </div>
        </header>

        <section className="mb-8 max-w-3xl">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-emerald-300">
            Review attention, intelligently routed
          </p>

          <h1 className="text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            Find the risky changes hiding inside small diffs.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400">
            Jev evaluates structured risk signals. DiffGuard applies
            explicit policy rules to decide where human review matters
            most.
          </p>
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#11141b] shadow-2xl shadow-black/30">
          <div className="border-b border-white/10 px-6 py-5 sm:px-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2 font-mono text-xs text-zinc-500">
                  <span>{pullRequest.repository}</span>
                  <span>·</span>
                  <span>PR #{pullRequest.number}</span>
                  <span>·</span>
                  <span>
                    {pullRequest.baseBranch} ← {pullRequest.headBranch}
                  </span>
                </div>

                <h2 className="text-xl font-semibold tracking-tight text-white">
                  {pullRequest.title}
                </h2>

                <p className="mt-1 text-sm text-zinc-400">
                  {pullRequest.description}
                </p>
              </div>

              <div className="shrink-0 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-3">
                <p className="text-xs font-medium uppercase tracking-wider text-red-300">
                  Recommendation
                </p>
                <p className="mt-1 font-semibold text-red-100">
                  {actionLabels[decision.action]}
                </p>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1.25fr_0.75fr]">
            <div className="border-b border-white/10 p-6 sm:p-8 lg:border-r lg:border-b-0">
              <div className="mb-6 flex items-end justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-400">
                    Composite risk score
                  </p>

                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-5xl font-semibold tracking-[-0.05em] text-white">
                      {decision.riskScore}
                    </span>
                    <span className="text-lg text-zinc-600">/100</span>
                  </div>
                </div>

                <p className="text-right text-xs leading-5 text-zinc-500">
                  Calculated by
                  <br />
                  deterministic policy
                </p>
              </div>

              <div className="mb-8 h-2 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-red-500"
                  style={{ width: `${decision.riskScore}%` }}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {signalCards.map((signal) => (
                  <article
                    key={signal.label}
                    className="rounded-2xl border border-white/8 bg-white/[0.025] p-4"
                  >
                    <p className="text-xs font-medium text-zinc-500">
                      {signal.label}
                    </p>

                    <div className="mt-2 flex items-end justify-between gap-3">
                      <p className="font-medium text-zinc-100">
                        {formatLabel(signal.value)}
                      </p>

                      <p className="font-mono text-xs text-emerald-300">
                        {formatPercent(signal.confidence)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-8">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-zinc-300">
                    Submitted diff
                  </h3>

                  <span className="font-mono text-xs text-zinc-600">
                    {pullRequest.additions} additions ·{" "}
                    {pullRequest.deletions} deletions
                  </span>
                </div>

                <pre className="overflow-x-auto rounded-2xl border border-white/8 bg-black/30 p-5 font-mono text-xs leading-6 text-zinc-400">
                  <code>{pullRequest.diff}</code>
                </pre>
              </div>
            </div>

            <aside className="p-6 sm:p-8">
              <div className="mb-6">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Policy trace
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white">
                  Why this was blocked
                </h3>
              </div>

              <div className="space-y-5">
                {decision.triggeredRules.map((rule) => (
                  <article
                    key={rule.id}
                    className="border-l border-white/10 pl-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h4 className="text-sm font-medium text-zinc-200">
                        {rule.label}
                      </h4>

                      <span className="font-mono text-xs text-amber-300">
                        +{rule.contribution}
                      </span>
                    </div>

                    <p className="mt-1.5 text-xs leading-5 text-zinc-500">
                      {rule.explanation}
                    </p>
                  </article>
                ))}
              </div>

              <div className="mt-8 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] p-4">
                <p className="text-xs leading-5 text-emerald-100/70">
                  Jev supplies typed probabilities and confidence.
                  DiffGuard—not the model—applies the final review
                  policy.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <footer className="mt-5 flex flex-col justify-between gap-2 text-xs text-zinc-600 sm:flex-row">
          <p>Fixture-backed demo · No repository data was transmitted</p>
          <p>Live Jev integration ready when API access is available</p>
        </footer>
      </div>
    </main>
  );
}