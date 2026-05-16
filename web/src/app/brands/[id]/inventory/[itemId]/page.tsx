import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '../../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../../lib/supabase/service';
import type { InventoryItem, InventoryMovement, InventoryAlert, InventoryAlertStatus } from '../../../../../db/schema';
import { adjustStock, acknowledgeAlert } from '../../../../../lib/inventory-actions';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string; itemId: string } };

const ALERT_STATUS_COLOURS: Record<InventoryAlertStatus, string> = {
  active:       'bg-orange-900/40 text-orange-300',
  acknowledged: 'bg-slate-700 text-slate-400',
  resolved:     'bg-green-900/40 text-green-400',
};

export default async function InventoryItemPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login');

  const db = createSupabaseServiceClient();

  const [{ data: itemData }, { data: movementsData }, { data: alertsData }] = await Promise.all([
    db.from('inventory_items')
      .select('*')
      .eq('id', params.itemId)
      .eq('brand_id', params.id)
      .maybeSingle(),
    db.from('inventory_movements')
      .select('*')
      .eq('inventory_item_id', params.itemId)
      .eq('brand_id', params.id)
      .order('created_at', { ascending: false })
      .limit(50),
    db.from('inventory_alerts')
      .select('*')
      .eq('inventory_item_id', params.itemId)
      .eq('brand_id', params.id)
      .order('created_at', { ascending: false }),
  ]);

  if (!itemData) redirect(`/brands/${params.id}/inventory`);

  const item      = itemData as InventoryItem;
  const movements = (movementsData ?? []) as InventoryMovement[];
  const alerts    = (alertsData ?? []) as InventoryAlert[];

  const activeAlerts = alerts.filter((a) => a.status === 'active');
  const pastAlerts   = alerts.filter((a) => a.status !== 'active');

  const adjust = adjustStock.bind(null, params.id, params.itemId);

  return (
    <div className="px-8 py-8 max-w-3xl">
      <Link
        href={`/brands/${params.id}/inventory`}
        className="text-xs text-slate-500 hover:text-slate-300 mb-4 inline-block"
      >
        ← Inventory
      </Link>

      {/* Header */}
      <h1 className="text-xl font-bold text-slate-100 mb-1">{item.name}</h1>
      <div className="flex items-center gap-3 mb-6">
        {item.sku && <span className="text-xs text-slate-500 font-mono">{item.sku}</span>}
        {item.category && <span className="text-xs text-slate-500">{item.category}</span>}
        <span className="text-xs text-slate-600 capitalize">{item.status.replace('_', ' ')}</span>
      </div>

      {/* Stock summary */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 mb-1">Current stock</p>
          <p className="text-3xl font-bold text-slate-100">{item.current_stock}</p>
          {item.low_stock_threshold != null && (
            <p className={`text-xs mt-1 ${Number(item.current_stock) <= Number(item.low_stock_threshold) ? 'text-orange-400' : 'text-slate-600'}`}>
              Threshold: {item.low_stock_threshold}
            </p>
          )}
        </div>
        {item.unit_price != null && (
          <div className="text-right">
            <p className="text-xs text-slate-500 mb-1">Unit price</p>
            <p className="text-lg font-semibold text-slate-300">£{Number(item.unit_price).toFixed(2)}</p>
          </div>
        )}
      </div>

      {/* Active alerts */}
      {activeAlerts.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-2">Alerts</h2>
          <div className="space-y-2">
            {activeAlerts.map((a) => {
              const ack = acknowledgeAlert.bind(null, params.id, a.id);
              return (
                <div key={a.id} className="bg-slate-800 border border-orange-800/50 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
                  <div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ALERT_STATUS_COLOURS[a.status as InventoryAlertStatus]}`}>
                      {a.alert_type.replace('_', ' ')}
                    </span>
                    {a.triggered_at && (
                      <p className="text-xs text-slate-600 mt-1">{new Date(a.triggered_at).toLocaleString()}</p>
                    )}
                  </div>
                  <form action={ack}>
                    <button className="text-xs px-3 py-1.5 border border-slate-600 rounded-lg text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors">
                      Acknowledge
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stock adjustment form */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-2">Adjust stock</h2>
        <form action={adjust} className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-slate-400 block mb-1">
              Quantity (+ to add, − to remove)
            </label>
            <input
              name="quantity_delta"
              type="number"
              step="any"
              placeholder="e.g. 10 or -3"
              required
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-slate-400 block mb-1">Note (optional)</label>
            <input
              name="note"
              type="text"
              placeholder="Reason for adjustment…"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
            />
          </div>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shrink-0"
          >
            Apply
          </button>
        </form>
      </div>

      {/* Movement history — append-only log */}
      <div className="border-t border-slate-700 pt-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Movement history</h2>
        {movements.length === 0 ? (
          <p className="text-sm text-slate-500">No movements recorded.</p>
        ) : (
          <div className="space-y-2">
            {movements.map((m) => (
              <div key={m.id} className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-slate-400 capitalize">{m.movement_type}</span>
                    {m.note && <span className="text-xs text-slate-500">— {m.note}</span>}
                  </div>
                  {m.created_by_agent && (
                    <p className="text-xs text-slate-600">{m.created_by_agent}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-semibold ${Number(m.quantity_delta) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {Number(m.quantity_delta) >= 0 ? '+' : ''}{m.quantity_delta}
                  </p>
                  <p className="text-xs text-slate-600">{new Date(m.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Past alerts, collapsed */}
        {pastAlerts.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Past alerts</h3>
            <div className="space-y-1">
              {pastAlerts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 py-1.5 px-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ALERT_STATUS_COLOURS[a.status as InventoryAlertStatus]}`}>
                    {a.status}
                  </span>
                  <span className="text-xs text-slate-500 capitalize">{a.alert_type.replace('_', ' ')}</span>
                  <span className="text-xs text-slate-600 ml-auto">
                    {a.triggered_at ? new Date(a.triggered_at).toLocaleDateString() : new Date(a.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
