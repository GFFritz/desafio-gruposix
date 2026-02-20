import { usePage } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import {
  Package, DollarSign, CheckCircle2, Users, Ticket, RotateCcw,
  Trophy, TrendingUp, Award, CreditCard, Globe, AlertTriangle,
  Search, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight,
  ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

// Formatters
const fmt = {
  usd: (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v),
  brl: (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v),
  pct: (v) => `${v}%`,
  num: (v) => new Intl.NumberFormat('en-US').format(v),
  date: (v) => {
    try { return new Date(v).toLocaleDateString('pt-BR'); }
    catch { return v; }
  },
};

// Colors
const CHART_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b'];

const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

// Components
function KPICard({ title, value, subtitle, icon, color = 'indigo' }) {
  const colorMap = {
    indigo: 'from-indigo-500 to-indigo-600',
    cyan: 'from-cyan-500 to-cyan-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    rose: 'from-rose-500 to-rose-600',
    violet: 'from-violet-500 to-violet-600',
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-5 hover:border-gray-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-gray-900/20">
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-300 text-sm font-medium">{title}</span>
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center text-white shadow-lg`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      {subtitle && <div className="text-xs text-gray-400">{subtitle}</div>}
    </div>
  );
}

function ChartCard({ title, children, className = '' }) {
  return (
    <div className={`bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-300 mb-4">{title}</h3>
      <div className="relative">{children}</div>
    </div>
  );
}

function FinancialSummaryCard({ data }) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-gray-300 mb-4">Resumo Financeiro</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Faturamento Bruto</span>
          <span className="text-emerald-400 font-semibold">{fmt.usd(data.grossRevenue)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Reembolsos</span>
          <span className="text-rose-400 font-semibold">-{fmt.usd(data.totalRefunds)}</span>
        </div>
        <div className="border-t border-gray-700 pt-3 flex justify-between items-center">
          <span className="text-white font-medium">Receita Líquida</span>
          <span className="text-white font-bold text-lg">{fmt.usd(data.netRevenue)}</span>
        </div>
      </div>
    </div>
  );
}

function TopProductCard({ product }) {
  return (
    <div className="bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-400" /> Produto Mais Vendido
      </h3>
      <div className="text-lg font-bold text-white mb-2">{product.name}</div>
      <div className="flex gap-4 text-sm">
        <span className="text-gray-400">Qtd: <span className="text-indigo-400 font-semibold">{product.quantity}</span></span>
        <span className="text-gray-400">Receita: <span className="text-emerald-400 font-semibold">{fmt.usd(product.revenue)}</span></span>
      </div>
    </div>
  );
}

// Orders table
const PER_PAGE_OPTIONS = [5, 10, 20, 50];

function OrdersTable({ orders }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState(null);

  const handleSort = (key) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortKey(null);
      setSortDir(null);
    }
    setPage(1);
  };

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter(o =>
      String(o.id).includes(q) ||
      o.customer.toLowerCase().includes(q) ||
      o.status.toLowerCase().includes(q)
    );
  }, [orders, search]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / perPage);
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  const statusColor = (status) => {
    if (status === 'Fully Fulfilled') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (status === 'Partially Fulfilled') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  const PaginationButton = ({ onClick, disabled, children, active = false }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center px-2.5 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${active
        ? 'bg-indigo-500 text-white'
        : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 disabled:opacity-30 disabled:cursor-not-allowed'
        }`}
    >
      {children}
    </button>
  );

  // Calcula quais números de página exibir (janela de 3)
  const getPageNumbers = () => {
    const visible = Math.min(3, totalPages);
    return Array.from({ length: visible }, (_, i) => {
      if (totalPages <= 3) return i + 1;
      if (page <= 2) return i + 1;
      if (page >= totalPages - 1) return totalPages - 2 + i;
      return page - 1 + i;
    });
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h3 className="text-sm font-semibold text-gray-300">Tabela de Pedidos</h3>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input
              id="orders-search"
              type="text"
              placeholder="Buscar por ID, cliente ou status..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="bg-gray-900/50 border border-gray-700 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-indigo-500 w-full sm:w-72 transition-colors"
            />
          </div>
          <select
            id="orders-per-page"
            value={perPage}
            onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
            className="bg-gray-900/50 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
          >
            {PER_PAGE_OPTIONS.map(n => (
              <option key={n} value={n}>{n} / página</option>
            ))}
          </select>
        </div>
      </div>
      {/* Mobile: cards */}
      <div className="md:hidden space-y-3">
        {paginated.map(order => (
          <div key={order.id} className="bg-gray-900/40 border border-gray-700/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 font-mono text-xs">#{order.id}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusColor(order.status)}`}>
                {order.status}
              </span>
            </div>
            <div className="text-gray-300 text-sm truncate">{order.customer}</div>
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold text-sm">{fmt.usd(order.total)}</span>
              <span className="text-gray-500 text-xs">{fmt.date(order.date)}</span>
            </div>
          </div>
        ))}
        {paginated.length === 0 && (
          <div className="py-8 text-center text-gray-600">Nenhum pedido encontrado.</div>
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-700/50">
              <th className="pb-3 text-left font-medium cursor-pointer select-none" onClick={() => handleSort('id')}>
                <span className="inline-flex items-center gap-1">ID <SortIcon col="id" /></span>
              </th>
              <th className="pb-3 text-left font-medium cursor-pointer select-none" onClick={() => handleSort('customer')}>
                <span className="inline-flex items-center gap-1">Cliente <SortIcon col="customer" /></span>
              </th>
              <th className="pb-3 text-left font-medium cursor-pointer select-none" onClick={() => handleSort('status')}>
                <span className="inline-flex items-center gap-1">Status <SortIcon col="status" /></span>
              </th>
              <th className="pb-3 text-right font-medium cursor-pointer select-none" onClick={() => handleSort('total')}>
                <span className="inline-flex items-center gap-1 justify-end">Valor <SortIcon col="total" /></span>
              </th>
              <th className="pb-3 text-right font-medium cursor-pointer select-none" onClick={() => handleSort('date')}>
                <span className="inline-flex items-center gap-1 justify-end">Data <SortIcon col="date" /></span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/30">
            {paginated.map(order => (
              <tr key={order.id} className="hover:bg-gray-700/20 transition-colors">
                <td className="py-3 text-gray-300 font-mono text-xs">#{order.id}</td>
                <td className="py-3 text-gray-300 max-w-[180px] truncate">{order.customer}</td>
                <td className="py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusColor(order.status)}`}>
                    {order.status}
                  </span>
                </td>
                <td className="py-3 text-right text-gray-300 font-medium">{fmt.usd(order.total)}</td>
                <td className="py-3 text-right text-gray-500 text-xs">{fmt.date(order.date)}</td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-600">
                  Nenhum pedido encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 pt-3 border-t border-gray-700/50 gap-3">
          <span className="text-xs text-gray-500">
            Mostrando {(page - 1) * perPage + 1}-{Math.min(page * perPage, sorted.length)} de {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <PaginationButton onClick={() => setPage(1)} disabled={page === 1}>
              <ChevronsLeft className="w-3.5 h-3.5" />
            </PaginationButton>
            <PaginationButton onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </PaginationButton>
            {getPageNumbers().map(p => (
              <PaginationButton key={p} onClick={() => setPage(p)} active={page === p}>
                {p}
              </PaginationButton>
            ))}
            <PaginationButton onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="w-3.5 h-3.5" />
            </PaginationButton>
            <PaginationButton onClick={() => setPage(totalPages)} disabled={page === totalPages}>
              <ChevronsRight className="w-3.5 h-3.5" />
            </PaginationButton>
          </div>
        </div>
      )}
    </div>
  );
}

// Chart defaults
const defaultChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(17,24,39,0.95)',
      titleColor: '#e5e7eb',
      bodyColor: '#9ca3af',
      borderColor: 'rgba(75,85,99,0.3)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
    },
  },
  scales: {
    x: { ticks: { color: '#6b7280', font: { size: 11 } }, grid: { color: 'rgba(55,65,81,0.3)' } },
    y: { ticks: { color: '#6b7280', font: { size: 11 } }, grid: { color: 'rgba(55,65,81,0.3)' } },
  },
};

// Dashboard
export default function Dashboard() {
  const {
    totalOrders, totalRevenueUSD, totalRevenueBRL,
    fulfilledOrders, uniqueCustomers, financialSummary,
    refundRate, topProduct, ordersTable,
    topProductsByRevenue, averageTicket, paymentConversion,
    topCities, salesByDate, highRefundProducts,
  } = usePage().props;


  const salesChartData = {
    labels: (salesByDate || []).map(d => fmt.date(d.date)),
    datasets: [
      {
        label: 'Receita (USD)',
        data: (salesByDate || []).map(d => d.revenue),
        borderColor: CHART_COLORS[0],
        backgroundColor: hexToRgba(CHART_COLORS[0], 0.1),
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: CHART_COLORS[0],
      },
      {
        label: 'Pedidos',
        data: (salesByDate || []).map(d => d.orders),
        borderColor: CHART_COLORS[1],
        backgroundColor: 'transparent',
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: CHART_COLORS[1],
        yAxisID: 'y1',
      },
    ],
  };

  const salesChartOptions = {
    ...defaultChartOptions,
    plugins: {
      ...defaultChartOptions.plugins,
      legend: { display: true, labels: { color: '#9ca3af', usePointStyle: true, pointStyle: 'circle' } },
    },
    scales: {
      ...defaultChartOptions.scales,
      y: { ...defaultChartOptions.scales.y, position: 'left' },
      y1: { ...defaultChartOptions.scales.y, position: 'right', grid: { drawOnChartArea: false } },
    },
  };

  const topProductsData = {
    labels: (topProductsByRevenue || []).map(p => p.name.length > 20 ? p.name.slice(0, 20) + '…' : p.name),
    datasets: [{
      label: 'Receita (USD)',
      data: (topProductsByRevenue || []).map(p => p.revenue),
      backgroundColor: (topProductsByRevenue || []).map((_, i) => hexToRgba(CHART_COLORS[i % CHART_COLORS.length], 0.7)),
      borderColor: (topProductsByRevenue || []).map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
      borderWidth: 1,
      borderRadius: 8,
    }],
  };

  const paymentData = {
    labels: (paymentConversion || []).map(p => p.type.toUpperCase()),
    datasets: [{
      data: (paymentConversion || []).map(p => p.count),
      backgroundColor: (paymentConversion || []).map((_, i) => hexToRgba(CHART_COLORS[i % CHART_COLORS.length], 0.8)),
      borderColor: 'transparent',
      borderWidth: 0,
    }],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#9ca3af',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 16,
          generateLabels: (chart) => {
            const data = chart.data;
            return data.labels.map((label, i) => ({
              text: `${label} (${data.datasets[0].data[i]})`,
              fillStyle: data.datasets[0].backgroundColor[i],
              fontColor: '#9ca3af',
              strokeStyle: 'transparent',
              pointStyle: 'circle',
              hidden: false,
              index: i,
            }));
          },
        },
      },
      tooltip: defaultChartOptions.plugins.tooltip,
    },
  };

  const citiesData = {
    labels: (topCities || []).map(c => c.city),
    datasets: [{
      label: 'Receita (USD)',
      data: (topCities || []).map(c => c.revenue),
      backgroundColor: (topCities || []).map((_, i) => hexToRgba(CHART_COLORS[i % CHART_COLORS.length], 0.7)),
      borderColor: (topCities || []).map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
      borderWidth: 1,
      borderRadius: 6,
    }],
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-sm font-bold shadow-lg shadow-indigo-500/20">
            G6
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Dashboard Analítico</h1>
            <p className="text-xs text-gray-500">Grupo Six — Análise de Pedidos</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KPICard title="Total Pedidos" value={fmt.num(totalOrders)} icon={<Package className="w-4 h-4" />} color="indigo" />
          <KPICard title="Receita (USD)" value={fmt.usd(totalRevenueUSD)} subtitle={`≈ ${fmt.brl(totalRevenueBRL)}`} icon={<DollarSign className="w-4 h-4" />} color="emerald" />
          <KPICard title="Entregues" value={fulfilledOrders?.count} subtitle={`${fulfilledOrders?.rate}% do total`} icon={<CheckCircle2 className="w-4 h-4" />} color="cyan" />
          <KPICard title="Clientes Únicos" value={uniqueCustomers?.count} subtitle={`${uniqueCustomers?.avgOrdersPerCustomer} pedidos/cliente`} icon={<Users className="w-4 h-4" />} color="violet" />
          <KPICard title="Ticket Médio" value={fmt.usd(averageTicket)} icon={<Ticket className="w-4 h-4" />} color="amber" />
          <KPICard title="Taxa Reembolso" value={fmt.pct(refundRate)} icon={<RotateCcw className="w-4 h-4" />} color="rose" />
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FinancialSummaryCard data={financialSummary || {}} />
          <TopProductCard product={topProduct || {}} />
        </section>

        <ChartCard title={<span className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-400" /> Análise Temporal de Vendas</span>}>
          <div className="h-72 md:h-72 overflow-x-auto">
            <div className="min-w-[600px] h-full">
              <Line data={salesChartData} options={salesChartOptions} />
            </div>
          </div>
        </ChartCard>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title={<span className="flex items-center gap-2"><Award className="w-4 h-4 text-amber-400" /> Top 5 Produtos por Receita</span>}>
            <div className="h-64">
              <Bar data={topProductsData} options={defaultChartOptions} />
            </div>
          </ChartCard>
          <ChartCard title={<span className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-cyan-400" /> Conversão por Forma de Pagamento</span>}>
            <div className="h-64 flex items-center justify-center">
              <Doughnut data={paymentData} options={doughnutOptions} />
            </div>
          </ChartCard>
        </section>

        <ChartCard title={<span className="flex items-center gap-2"><Globe className="w-4 h-4 text-emerald-400" /> Top 10 Cidades em Vendas</span>}>
          <div className="h-80">
            <Bar data={citiesData} options={{ ...defaultChartOptions, indexAxis: 'y' }} />
          </div>
        </ChartCard>

        {highRefundProducts?.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Produtos com Alta Taxa de Reembolso
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-700/50">
                    <th className="pb-3 text-left font-medium">Produto</th>
                    <th className="pb-3 text-right font-medium">Vendas</th>
                    <th className="pb-3 text-right font-medium">Reembolsos</th>
                    <th className="pb-3 text-right font-medium">Taxa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/30">
                  {highRefundProducts.map((prod, i) => (
                    <tr key={i} className="hover:bg-gray-700/20 transition-colors">
                      <td className="py-3 text-gray-300">{prod.title}</td>
                      <td className="py-3 text-right text-gray-400">{prod.occurrences}</td>
                      <td className="py-3 text-right text-gray-400">{prod.refundedQuantity}</td>
                      <td className="py-3 text-right">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${prod.refundRate > 30
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                          {prod.refundRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <OrdersTable orders={ordersTable || []} />
      </main>

      <footer className="border-t border-gray-800/50 bg-gray-900/30 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 text-center text-xs text-gray-600">
          Dashboard Analítico — Desafio Técnico Grupo Six
        </div>
      </footer>
    </div>
  );
}
