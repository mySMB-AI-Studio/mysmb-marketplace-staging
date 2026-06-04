/**
 * myob-accounting — widget-elements module
 * ──────────────────────────────────────────────────────────────────
 * Connector-specific `$computed` helpers contributed to the host's
 * widgets-system at runtime. The host prepends the slug `myob-accounting_`
 * to every name in `functions`, so e.g. the spec-side reference is
 * `myob-accounting_format_currency`.
 */
// ── format_currency ──────────────────────────────────────────────────
// Format a number as AUD using en-AU locale so the symbol renders as
// "$" rather than "A$" (which Intl produces in non-AU locales).
// Args: { value: number | string }
const format_currency = (args) => {
    const n = Number(args.value);
    if (!Number.isFinite(n))
        return '';
    const fmt = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });
    return fmt.formatToParts(n).map(p => p.type === 'currency' ? p.value + ' ' : p.value).join('');
};
// ── overdue_buckets ──────────────────────────────────────────────────
// Groups open invoices into overdue age buckets based on DueDate.
// Only includes invoices where DueDate < today (genuinely overdue).
// Returns { buckets: [{ key, label, count, total, tone }], total, count }
// Buckets are ordered worst-first: 30+, 16-30, 1-15 days overdue.
// Buckets with zero invoices are omitted from the result.
// Args: { value: Invoice[] }
const overdue_buckets = (args) => {
    const items = Array.isArray(args.value) ? args.value : [];
    const now = Date.now();
    const MS_PER_DAY = 86_400_000;
    const BUCKETS = [
        { key: '30+',   label: 'Over 30 days overdue',  min: 31, max: Infinity, tone: 'destructive' },
        { key: '16-30', label: '16 to 30 days overdue', min: 16, max: 30,       tone: 'warning'     },
        { key: '1-15',  label: '1 to 15 days overdue',  min: 1,  max: 15,       tone: 'muted'       },
    ];
    let grandTotal = 0;
    let grandCount = 0;
    const buckets = BUCKETS.map((b) => {
        let count = 0;
        let total = 0;
        for (const item of items) {
            const due = new Date(String(item['DueDate'])).getTime();
            if (!Number.isFinite(due))
                continue;
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
const ar_by_customer = (args) => {
    const items = Array.isArray(args.value) ? args.value : [];
    const now = Date.now();
    const MS_PER_DAY = 86_400_000;
    const sortCol = String(args.sortCol ?? 'name');
    const sortDir = String(args.sortDir ?? 'asc');
    const map = new Map();
    for (const item of items) {
        const customer = item['Customer'];
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
const sort_items = (args) => {
    const items = Array.isArray(args.value) ? args.value : [];
    const field = String(args.field ?? '');
    const dir = String(args.dir ?? 'asc');
    if (!field || items.length === 0) return items;
    const getVal = (item) => {
        const parts = field.split('/');
        let val = item;
        for (const part of parts) {
            if (val != null && typeof val === 'object') {
                val = val[part];
            } else { return undefined; }
        }
        return val;
    };
    return [...items].sort((a, b) => {
        const av = getVal(a), bv = getVal(b);
        let cmp;
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
const sort_toggle_dir = (args) => {
    const col = String(args.col ?? '');
    const currentCol = String(args.currentCol ?? '');
    const currentDir = String(args.currentDir ?? 'asc');
    if (col === currentCol && currentDir === 'asc') return 'desc';
    return 'asc';
};
// ── sort_label ───────────────────────────────────────────────────────
// Appends a ↑ or ↓ arrow to a column header label when it is the active
// sort column, so users can see which column is sorted and in what direction.
// Args: { label: string, col: string, currentCol: string, currentDir: string }
const sort_label = (args) => {
    const label = String(args.label ?? '');
    const col = String(args.col ?? '');
    const currentCol = String(args.currentCol ?? '');
    const currentDir = String(args.currentDir ?? 'asc');
    if (col !== currentCol) return label;
    return label + (currentDir === 'asc' ? ' ↑' : ' ↓');
};
const elements = {
    slug: 'myob-accounting',
    functions: {
        format_currency,
        overdue_buckets,
        ar_by_customer,
        sort_items,
        sort_toggle_dir,
        sort_label,
    },
};
export default elements;
