/**
 * myob-accounting — widget-elements module
 * ──────────────────────────────────────────────────────────────────
 * Connector-specific `$computed` helpers contributed to the host's
 * widgets-system at runtime. The host prepends the slug `myob-accounting_`
 * to every name in `functions`, so e.g. the spec-side reference is
 * `myob-accounting_format_currency`.
 */

import type { ComputedFunction, PluginElementsModule } from './types';

// ── format_currency ──────────────────────────────────────────────────
// Format a number as AUD using en-AU locale so the symbol renders as
// "$" rather than "A$" (which Intl produces in non-AU locales).
// Args: { value: number | string }
const format_currency: ComputedFunction = (args) => {
  const n = Number(args.value);
  if (!Number.isFinite(n)) return '';
  const fmt = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });
  return fmt.formatToParts(n).map(p => p.value).join('');
};

// ── overdue_buckets ──────────────────────────────────────────────────
// Groups open invoices into overdue age buckets based on DueDate.
// Only includes invoices where DueDate < today (genuinely overdue).
// Returns { buckets: [{ key, label, count, total, tone }], total, count }
// Buckets are ordered worst-first: 30+, 16-30, 1-15 days overdue.
// Buckets with zero invoices are omitted from the result.
// Args: { value: Invoice[] }
const overdue_buckets: ComputedFunction = (args) => {
  const items = Array.isArray(args.value) ? (args.value as Record<string, unknown>[]) : [];
  const now = Date.now();
  const MS_PER_DAY = 86_400_000;

  const BUCKETS = [
    { key: '30+',   label: 'Over 30 days overdue',   min: 31, max: Infinity, tone: 'destructive' },
    { key: '16-30', label: '16 to 30 days overdue',  min: 16, max: 30,       tone: 'warning'     },
    { key: '1-15',  label: '1 to 15 days overdue',   min: 1,  max: 15,       tone: 'muted'       },
  ];

  let grandTotal = 0;
  let grandCount = 0;

  const buckets = BUCKETS.map((b) => {
    let count = 0;
    let total = 0;
    for (const item of items) {
      const due = new Date(String(item['DueDate'])).getTime();
      if (!Number.isFinite(due)) continue;
      const days = Math.floor((now - due) / MS_PER_DAY);
      if (days >= b.min && days <= b.max) {
        count++;
        total += Number(item['BalanceDueAmount']) || 0;
      }
    }
    grandTotal += total;
    grandCount += count;
    return { key: b.key, label: b.label, count, total, tone: b.tone };
  }).filter((b) => b.count > 0);

  return { buckets, total: grandTotal, count: grandCount };
};

// ── ar_by_customer ───────────────────────────────────────────────────
// Aggregates open invoices by customer to produce a per-customer AR summary.
// Accepts optional sortCol ("name" | "invoiceCount" | "total") and
// sortDir ("asc" | "desc") to drive column-header sorting.
// Returns { entries: [{ uid, name, total, invoiceCount, overdueCount,
//   maxDaysOverdue, badgeText, badgeTone }], grandTotal, customerCount }
// Args: { value: Invoice[], sortCol?: string, sortDir?: string }
const ar_by_customer: ComputedFunction = (args) => {
  const items = Array.isArray(args.value) ? (args.value as Record<string, unknown>[]) : [];
  const now = Date.now();
  const MS_PER_DAY = 86_400_000;
  const sortCol = String(args.sortCol ?? 'name');
  const sortDir = String(args.sortDir ?? 'asc');

  const map = new Map<string, {
    uid: string; name: string; total: number;
    invoiceCount: number; overdueCount: number; maxDaysOverdue: number;
  }>();

  for (const item of items) {
    const customer = item['Customer'] as Record<string, unknown> | undefined;
    const uid = String(customer?.['UID'] ?? 'unknown');
    const name = String(customer?.['Name'] ?? 'Unknown');
    const amount = Number(item['BalanceDueAmount']) || 0;
    const due = new Date(String(item['DueDate'])).getTime();
    const daysOverdue = Number.isFinite(due) ? Math.max(0, Math.floor((now - due) / MS_PER_DAY)) : 0;

    const existing = map.get(uid);
    if (existing) {
      existing.total += amount;
      existing.invoiceCount += 1;
      if (daysOverdue > 0) existing.overdueCount += 1;
      if (daysOverdue > existing.maxDaysOverdue) existing.maxDaysOverdue = daysOverdue;
    } else {
      map.set(uid, { uid, name, total: amount, invoiceCount: 1,
        overdueCount: daysOverdue > 0 ? 1 : 0, maxDaysOverdue: daysOverdue });
    }
  }

  let grandTotal = 0;
  const entries = Array.from(map.values())
    .sort((a, b) => {
      let cmp = 0;
      if (sortCol === 'invoiceCount') cmp = a.invoiceCount - b.invoiceCount;
      else if (sortCol === 'total') cmp = a.total - b.total;
      else cmp = a.name.localeCompare(b.name);
      return sortDir === 'desc' ? -cmp : cmp;
    })
    .map((e) => {
      grandTotal += e.total;
      const badgeTone = e.maxDaysOverdue > 30 ? 'destructive'
        : e.maxDaysOverdue > 0 ? 'warning' : 'info';
      const badgeText = e.overdueCount > 0
        ? `${e.overdueCount} overdue`
        : `${e.invoiceCount} invoice${e.invoiceCount !== 1 ? 's' : ''}`;
      return { ...e, badgeText, badgeTone };
    });

  return { entries, grandTotal, customerCount: entries.length };
};

// ── sort_items ───────────────────────────────────────────────────────
// Sorts an array of objects by a dot/slash-delimited field path.
// Numeric fields are compared numerically; others use localeCompare.
// Returns a new sorted array; does not mutate the input.
// Args: { value: object[], field: string, dir: "asc" | "desc" }
const sort_items: ComputedFunction = (args) => {
  const items = Array.isArray(args.value) ? (args.value as Record<string, unknown>[]) : [];
  const field = String(args.field ?? '');
  const dir = String(args.dir ?? 'asc');
  if (!field || items.length === 0) return items;

  const getVal = (item: Record<string, unknown>): unknown => {
    const parts = field.split('/');
    let val: unknown = item;
    for (const part of parts) {
      if (val != null && typeof val === 'object') {
        val = (val as Record<string, unknown>)[part];
      } else { return undefined; }
    }
    return val;
  };

  return [...items].sort((a, b) => {
    const av = getVal(a), bv = getVal(b);
    let cmp: number;
    if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
    else cmp = String(av ?? '').localeCompare(String(bv ?? ''));
    return dir === 'desc' ? -cmp : cmp;
  });
};

// ── sort_toggle_dir ──────────────────────────────────────────────────
// Returns the next sort direction when a column header is clicked.
// Toggles asc→desc when clicking the already-active column; resets to
// "asc" when switching to a different column.
// Args: { col: string, currentCol: string, currentDir: string }
const sort_toggle_dir: ComputedFunction = (args) => {
  const col = String(args.col ?? '');
  const currentCol = String(args.currentCol ?? '');
  const currentDir = String(args.currentDir ?? 'asc');
  if (col === currentCol && currentDir === 'asc') return 'desc';
  return 'asc';
};

// ── format_date ──────────────────────────────────────────────────────
// Formats a date value to "d MMM" (e.g. "15 Jan").
// Handles ISO strings and MYOB /Date(ms+tz)/ format.
// Args: { value: string }
const format_date: ComputedFunction = (args) => {
  const raw = String(args.value ?? '');
  if (!raw) return '';
  // MYOB /Date(timestamp+offset)/ format
  const msMatch = raw.match(/\/Date\((-?\d+)(?:[+-]\d{4})?\)\//);
  if (msMatch) {
    return new Date(Number(msMatch[1])).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  }
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ── sort_label ───────────────────────────────────────────────────────
// Appends a ↑ or ↓ arrow to a column header label when it is the active
// sort column, so users can see which column is sorted and in what direction.
// Args: { label: string, col: string, currentCol: string, currentDir: string }
const sort_label: ComputedFunction = (args) => {
  const label = String(args.label ?? '');
  const col = String(args.col ?? '');
  const currentCol = String(args.currentCol ?? '');
  const currentDir = String(args.currentDir ?? 'asc');
  if (col !== currentCol) return label;
  return label + (currentDir === 'asc' ? ' ↑' : ' ↓');
};

// ── pnl_get ──────────────────────────────────────────────────────────
// Extracts a summary amount from a MYOB ProfitAndLoss report object.
// Tries known top-level fields first, falls back to scanning Sections by title.
// Args: { value: PnLReport, key: "income" | "expenses" | "netProfit" | "grossProfit" }
const pnl_get: ComputedFunction = (args) => {
  const r = args.value as Record<string, unknown>;
  const key = String(args.key ?? '');
  if (!r) return 0;
  const candidates: Record<string, string[]> = {
    income:      ['IncomeTotal', 'TotalIncome'],
    expenses:    ['ExpenseTotal', 'TotalExpenses', 'OperatingExpensesTotal'],
    netProfit:   ['NetProfit', 'NetIncome'],
    grossProfit: ['GrossProfit'],
  };
  for (const field of (candidates[key] ?? [])) {
    const v = r[field] as Record<string, unknown> | undefined;
    if (v?.Amount !== undefined) return Number(v.Amount);
  }
  const sections = Array.isArray(r.Sections)
    ? (r.Sections as Record<string, unknown>[])
    : [];
  const terms: Record<string, string> = {
    income: 'income', expenses: 'expens',
    netProfit: 'net profit', grossProfit: 'gross profit',
  };
  const term = terms[key] ?? '';
  for (const s of sections) {
    if (String(s.Title ?? '').toLowerCase().includes(term)) {
      return Number((s.Total as Record<string, unknown>)?.Amount ?? 0);
    }
  }
  return 0;
};

// ── pnl_entries ──────────────────────────────────────────────────────
// Returns account-level entries from a named P&L section shaped for BarChart.
// Returns [{ name: string, amount: number }] filtered to non-zero amounts.
// Args: { value: PnLReport, section: "income" | "expenses" }
const pnl_entries: ComputedFunction = (args) => {
  const r = args.value as Record<string, unknown>;
  const section = String(args.section ?? 'income');
  if (!r) return [];
  const sections = Array.isArray(r.Sections)
    ? (r.Sections as Record<string, unknown>[])
    : [];
  const term = section === 'income' ? 'income' : 'expens';
  const results: { name: string; amount: number }[] = [];
  for (const s of sections) {
    if (!String(s.Title ?? '').toLowerCase().includes(term)) continue;
    const entries = Array.isArray(s.Entries)
      ? (s.Entries as Record<string, unknown>[])
      : [];
    for (const e of entries) {
      const acct = e.Account as Record<string, unknown> | undefined;
      const name = String(acct?.Name ?? e.Title ?? 'Other');
      const amount = Math.abs(Number(e.Amount ?? 0));
      if (amount > 0) results.push({ name, amount });
    }
  }
  return results;
};

// ── pnl_summary_bars ─────────────────────────────────────────────────
// Builds [{label, amount}] for Income, Expenses, and Net Profit totals.
// Suitable for use as BarChart data for a top-level P&L overview.
// Args: { value: PnLReport }
const pnl_summary_bars: ComputedFunction = (args) => {
  const r = args.value as Record<string, unknown>;
  if (!r) return [];
  const get = (key: string) => Number(pnl_get({ value: r, key }) ?? 0);
  return [
    { label: 'Income',     amount: get('income')    },
    { label: 'Expenses',   amount: get('expenses')  },
    { label: 'Net Profit', amount: get('netProfit') },
  ];
};

const elements: PluginElementsModule = {
  slug: 'myob-accounting',
  functions: {
    format_currency,
    format_date,
    overdue_buckets,
    ar_by_customer,
    sort_items,
    sort_toggle_dir,
    sort_label,
    pnl_get,
    pnl_entries,
    pnl_summary_bars,
  },
};

export default elements;
