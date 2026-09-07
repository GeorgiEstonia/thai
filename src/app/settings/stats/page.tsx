import { requireAuth } from '@/lib/auth'
import { loadStats } from '@/lib/stats'

export const dynamic = 'force-dynamic'

/**
 * A month of practice as a bar per day.
 *
 * Deliberately not a charting library: thirty numbers scaled to a height is a
 * div each, and the point is to see at a glance whether you have been turning
 * up — not to inspect values.
 */
function Frequency({ days }: { days: { day: string; reviews: number; right: number }[] }) {
  const today = new Date()
  const window = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today.getTime() - (29 - index) * 86_400_000)
    const key = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 10)
    return days.find((day) => day.day === key) ?? { day: key, reviews: 0, right: 0 }
  })

  const peak = Math.max(1, ...window.map((day) => day.reviews))

  return (
    <div>
      <div className="flex h-24 items-end gap-[3px]">
        {window.map((day) => (
          <div
            key={day.day}
            title={`${day.day}: ${day.reviews} answered`}
            className="flex-1 rounded-sm bg-surface"
            style={{ height: `${Math.max(day.reviews === 0 ? 3 : 8, (day.reviews / peak) * 100)}%` }}
          >
            <div
              className="w-full rounded-sm bg-class-mid"
              style={{
                height: day.reviews === 0 ? '0%' : `${(day.right / day.reviews) * 100}%`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted">
        <span>30 days ago</span>
        <span>today</span>
      </div>
    </div>
  )
}

function Tiles({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-edge py-3">
          <p className="text-xl">{item.value}</p>
          <p className="mt-1 text-[11px] leading-tight text-muted">{item.label}</p>
        </div>
      ))}
    </div>
  )
}

export default async function StatsPage() {
  await requireAuth()
  const stats = await loadStats()

  if (stats.totals.reviews === 0) {
    return (
      <div className="mt-6">
        <h1 className="text-lg font-medium">Progress</h1>
        <p className="mt-3 text-sm text-muted">
          Nothing practised yet. Once you start answering cards this fills in.
        </p>
      </div>
    )
  }

  const maturityTotal = stats.maturity.reduce((sum, row) => sum + row.count, 0)

  return (
    <div className="mt-6">
      <h1 className="text-lg font-medium">Progress</h1>

      <section className="mt-5">
        <Tiles
          items={[
            { label: 'day streak', value: stats.currentStreak },
            { label: 'days practised of last 30', value: stats.activeDaysLast30 },
            { label: 'answers all time', value: stats.totals.reviews },
          ]}
        />
      </section>

      <section className="mt-6">
        <h2 className="text-xs uppercase tracking-widest text-muted">How often you practise</h2>
        <p className="mt-1 text-xs text-muted">
          Bar height is how much you answered; the lighter part is what you got right.
        </p>
        <div className="mt-3">
          <Frequency days={stats.days} />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-xs uppercase tracking-widest text-muted">Accuracy</h2>
        <div className="mt-2">
          <Tiles
            items={[
              { label: 'last 7 days', value: stats.accuracy.last7 === null ? '—' : `${stats.accuracy.last7}%` },
              { label: 'last 30 days', value: stats.accuracy.last30 === null ? '—' : `${stats.accuracy.last30}%` },
              { label: 'all time', value: stats.accuracy.allTime === null ? '—' : `${stats.accuracy.allTime}%` },
            ]}
          />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-xs uppercase tracking-widest text-muted">Where the deck stands</h2>
        <p className="mt-1 text-xs text-muted">
          Every item counts twice — reading it and producing it are scheduled apart.
        </p>
        <ul className="mt-3 space-y-2">
          {stats.maturity.map((row) => (
            <li key={row.label}>
              <div className="flex items-baseline justify-between text-sm">
                <span>{row.label}</span>
                <span className="text-muted">{row.count}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full bg-class-mid"
                  style={{ width: `${maturityTotal === 0 ? 0 : (row.count / maturityTotal) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-xs uppercase tracking-widest text-muted">Right now</h2>
        <div className="mt-2">
          <Tiles
            items={[
              { label: 'cards due', value: stats.deck.due },
              { label: 'answers per session day', value: stats.averagePerActiveDay },
              { label: 'sticking points', value: stats.deck.leeches },
            ]}
          />
        </div>
        {stats.deck.leeches > 0 ? (
          <p className="mt-2 text-xs text-muted">
            A sticking point is a card you have missed four times or more — usually a sign it
            needs a better mnemonic, not more repetitions.
          </p>
        ) : null}
      </section>

      <p className="mt-6 text-xs text-muted">
        Longest streak: {stats.longestStreak} {stats.longestStreak === 1 ? 'day' : 'days'}.
      </p>
    </div>
  )
}
