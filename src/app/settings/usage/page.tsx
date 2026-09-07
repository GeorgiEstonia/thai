import { requireAuth } from '@/lib/auth'
import { PRICING, formatCost, usageReport } from '@/lib/usage'

export const dynamic = 'force-dynamic'

const MODEL = 'claude-opus-5'

function tokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${Math.round(count / 1_000)}k`
  return String(count)
}

export default async function UsagePage() {
  await requireAuth()
  const report = await usageReport()

  const price = PRICING[MODEL]
  const allTime = report.windows.find((window) => window.days === null)?.totals

  if (!allTime || allTime.calls === 0) {
    return (
      <div className="mt-6">
        <h1 className="text-lg font-medium">AI usage</h1>
        <p className="mt-3 text-sm text-muted">
          Nothing spent yet. Reading a photographed page, writing examples and generating
          words all call the model; what they cost shows up here.
        </p>
      </div>
    )
  }

  const peakDay = Math.max(1, ...report.daily.map((day) => day.costMicros))

  return (
    <div className="mt-6">
      <h1 className="text-lg font-medium">AI usage</h1>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        Measured from what each call actually reported, priced at {MODEL} rates
        (${price.input}/M in, ${price.output}/M out). This is what this app spent — not your
        whole Anthropic bill, which would need an admin key.
      </p>

      <section className="mt-5 grid grid-cols-2 gap-2">
        {report.windows.map((window) => (
          <div key={window.label} className="rounded-xl border border-edge px-3 py-3">
            <p className="text-[11px] text-muted">{window.label}</p>
            <p className="mt-1 text-xl">{formatCost(window.totals.costMicros)}</p>
            <p className="mt-1 text-[11px] text-muted">
              {window.totals.calls} {window.totals.calls === 1 ? 'call' : 'calls'} ·{' '}
              {tokens(window.totals.inputTokens + window.totals.outputTokens)} tokens
            </p>
          </div>
        ))}
      </section>

      <section className="mt-6">
        <h2 className="text-xs uppercase tracking-widest text-muted">What it went on</h2>
        <ul className="mt-3 space-y-2">
          {report.byOperation.map((row) => (
            <li key={row.operation}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="capitalize">{row.operation}</span>
                <span className="text-muted">
                  {formatCost(row.totals.costMicros)}{' '}
                  <span className="text-[11px]">({row.totals.calls})</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full bg-class-mid"
                  style={{
                    width: `${allTime.costMicros === 0 ? 0 : (row.totals.costMicros / allTime.costMicros) * 100}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {report.daily.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-xs uppercase tracking-widest text-muted">By day</h2>
          <ul className="mt-3 divide-y divide-edge">
            {report.daily.slice(0, 14).map((day) => (
              <li key={day.day} className="flex items-center gap-3 py-2">
                <span className="w-20 shrink-0 font-mono text-xs text-muted">
                  {day.day.slice(5)}
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                  <span
                    className="block h-full rounded-full bg-class-mid"
                    style={{ width: `${(day.costMicros / peakDay) * 100}%` }}
                  />
                </span>
                <span className="w-16 shrink-0 text-right text-xs">
                  {formatCost(day.costMicros)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="text-xs uppercase tracking-widest text-muted">Most recent calls</h2>
        <ul className="mt-2 divide-y divide-edge">
          {report.recent.slice(0, 10).map((row, index) => (
            <li key={index} className="flex items-baseline gap-3 py-2 text-xs">
              <span className="w-24 shrink-0 font-mono text-muted">
                {row.at.toISOString().slice(5, 16).replace('T', ' ')}
              </span>
              <span className="flex-1 truncate capitalize">{row.operation}</span>
              <span className="shrink-0 text-muted">
                {tokens(row.inputTokens)}/{tokens(row.outputTokens)}
              </span>
              <span className="w-14 shrink-0 text-right">{formatCost(row.costMicros)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
