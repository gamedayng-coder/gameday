import { redirect } from 'next/navigation';
import { getUser } from '../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../lib/supabase/service';
import type { SystemHealthCheck } from '../../../../db/schema';

export const dynamic = 'force-dynamic';

const STATUS_COLORS: Record<string, string> = {
  healthy:  'bg-emerald-900/50 text-emerald-300 border border-emerald-800',
  degraded: 'bg-amber-900/50 text-amber-300 border border-amber-800',
  down:     'bg-red-900/50 text-red-300 border border-red-800',
};

const STATUS_INDICATOR: Record<string, string> = {
  healthy:  'bg-emerald-400',
  degraded: 'bg-amber-400',
  down:     'bg-red-400',
};

type LatestByService = Record<string, SystemHealthCheck>;
type HistoryByService = Record<string, SystemHealthCheck[]>;

export default async function HealthPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  // Latest check per service (last 24 h worth of records, we'll group client-side)
  const { data: recentData } = await db
    .from('system_health_checks')
    .select('*')
    .order('checked_at', { ascending: false })
    .limit(500);

  const checks = (recentData ?? []) as SystemHealthCheck[];

  // Group: latest per service + recent history (last 10 per service)
  const latestByService: LatestByService = {};
  const historyByService: HistoryByService = {};

  for (const check of checks) {
    if (!latestByService[check.service]) {
      latestByService[check.service] = check;
    }
    const hist = historyByService[check.service] ?? [];
    if (hist.length < 10) {
      hist.push(check);
      historyByService[check.service] = hist;
    }
  }

  const services = Object.keys(latestByService).sort();

  // Overall platform status
  const overallStatus = services.length === 0
    ? 'unknown'
    : services.some((s) => latestByService[s].status === 'down')
      ? 'down'
      : services.some((s) => latestByService[s].status === 'degraded')
        ? 'degraded'
        : 'healthy';

  const overallColors: Record<string, string> = {
    healthy: 'text-emerald-400',
    degraded: 'text-amber-400',
    down: 'text-red-400',
    unknown: 'text-slate-500',
  };

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Health Checks</h1>
          <p className={`text-sm mt-0.5 font-semibold ${overallColors[overallStatus]}`}>
            Platform: {overallStatus}
          </p>
        </div>
        <p className="text-xs text-slate-500">Auto-refreshes on page load</p>
      </div>

      {services.length === 0 ? (
        <p className="text-sm text-slate-500">No health check records yet. Services write checks after each pipeline run.</p>
      ) : (
        <div className="space-y-4">
          {services.map((service) => {
            const latest = latestByService[service];
            const history = historyByService[service] ?? [];
            const minsAgo = Math.round((Date.now() - new Date(latest.checked_at).getTime()) / 60000);

            return (
              <div
                key={service}
                className="bg-slate-800 border border-slate-700 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_INDICATOR[latest.status] ?? 'bg-slate-500'}`} />
                    <span className="text-sm font-semibold text-slate-100 font-mono">{service}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${STATUS_COLORS[latest.status] ?? ''}`}>
                      {latest.status}
                    </span>
                  </div>
                  <time className="text-xs text-slate-500">
                    {minsAgo === 0 ? 'just now' : `${minsAgo}m ago`}
                  </time>
                </div>

                {latest.message && (
                  <p className="text-xs text-slate-400 mb-3 ml-5">{latest.message}</p>
                )}

                {latest.response_time_ms != null && (
                  <p className="text-xs text-slate-500 mb-3 ml-5">
                    Response time: {latest.response_time_ms}ms
                  </p>
                )}

                {/* Mini history */}
                <div className="ml-5 flex items-center gap-1.5">
                  <span className="text-xs text-slate-600 mr-1">Recent:</span>
                  {history.map((h) => (
                    <span
                      key={h.id}
                      title={`${h.status} — ${new Date(h.checked_at).toLocaleString()}${h.message ? ` — ${h.message}` : ''}`}
                      className={`w-2 h-4 rounded-sm ${STATUS_INDICATOR[h.status] ?? 'bg-slate-600'}`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
