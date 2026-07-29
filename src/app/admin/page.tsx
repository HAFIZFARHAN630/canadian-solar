'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';
import {
  LayoutDashboard, Database, FileText, Settings, LogOut, Search, X, Plus, Pencil, Trash2,
  ChevronLeft, ChevronRight, Shield, Activity, Globe, TrendingUp, Download, CheckCircle,
  Sun, AlertTriangle, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster, toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface ModuleData {
  id: string; moduleSn: string; moduleType: string; power: string; moduleGrade: string;
  endMarketCountry: string; customerDesc: string | null; productionDate: string | null;
  actualMovementDate: string | null; verifyCode: string | null; isActive: boolean; createdAt: string;
}

interface QueryLogEntry {
  id: string; moduleSn: string; queryNumber: number; ipAddress: string; userAgent: string;
  result: string; createdAt: string;
}

interface StatsData {
  totalModules: number; activeModules: number; totalQueries: number; todayQueries: number;
  weekQueries: number; monthQueries: number; failedQueries: number; successRate: string;
  countryStats: { endMarketCountry: string; _count: { id: number } }[];
  gradeDistribution: { moduleGrade: string; _count: { id: number } }[];
  recentQueries: QueryLogEntry[];
  dailyQueryTrend: { date: string; count: number }[];
  topQueriedModules: { moduleSn: string; _count: { id: number } }[];
}

const COLORS = ['#CE0412', '#2563eb', '#16a34a', '#d97706', '#8b5cf6', '#ec4899', '#0891b2', '#dc2626'];

/* ===== ADMIN LOGIN ===== */
function AdminLogin({ onLogin }: { onLogin: (token: string, user: { id: string; username: string; name: string; role: string }) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      const data = await res.json();
      if (data.success) { onLogin(data.token, data.user); toast.success('Login successful'); }
      else { toast.error(data.msg || 'Login failed'); }
    } catch { toast.error('Network error'); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: '#fff', borderRadius: '12px', padding: '40px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', margin: '0 auto 16px', fontFamily: 'inherit' }}>
            <ChevronLeft style={{ width: 16, height: 16 }} /> Back to Verification
          </button>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', background: 'rgb(206, 4, 18)' }}>
            <Shield style={{ width: 32, height: 32, color: '#fff' }} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111', marginBottom: '4px' }}>Admin Panel</h1>
          <p style={{ color: '#888', fontSize: '14px' }}>Sign in to manage modules</p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div><Label htmlFor="auser" style={{ fontSize: '14px', marginBottom: '4px', display: 'block' }}>Username</Label><Input id="auser" value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" style={{ marginTop: '4px' }} /></div>
          <div><Label htmlFor="apass" style={{ fontSize: '14px', marginBottom: '4px', display: 'block' }}>Password</Label><Input id="apass" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="admin123" style={{ marginTop: '4px' }} /></div>
          <Button type="submit" disabled={loading} style={{ background: 'rgb(206, 4, 18)', marginTop: '8px' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

/* ===== ADMIN DASHBOARD ===== */
function AdminDashboard({ token, user, onLogout }: { token: string; user: { id: string; username: string; name: string; role: string }; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [logs, setLogs] = useState<QueryLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editModule, setEditModule] = useState<Partial<ModuleData> | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        setStats(json.data || json);
      }
    } catch {}
  }, [token]);

  const fetchModules = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '15' });
      if (searchTerm) params.set('search', searchTerm);
      const res = await fetch(`/api/admin/modules?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setModules(data.data || []); setTotalPages(data.pagination?.totalPages || 1); }
    } catch {}
    setLoading(false);
  }, [token, page, searchTerm]);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/logs?page=1&pageSize=50', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setLogs(data.data || []); }
    } catch {}
  }, [token]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { if (activeTab === 'modules') fetchModules(); }, [activeTab, fetchModules]);
  useEffect(() => { if (activeTab === 'logs') fetchLogs(); }, [activeTab, fetchLogs]);

  const handleSaveModule = async () => {
    if (!editModule) return;
    try {
      const res = await fetch('/api/admin/modules', {
        method: editModule.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editModule),
      });
      const data = await res.json();
      if (data.success) {
        if (!editModule.id) {
          try { localStorage.setItem('csi_last_sn', editModule.moduleSn || ''); localStorage.setItem('csi_last_type', editModule.moduleType || ''); localStorage.setItem('csi_last_power', editModule.power || ''); } catch {}
        }
        toast.success(editModule.id ? 'Module updated' : 'Module added'); setIsDialogOpen(false); setEditModule(null); fetchModules(); fetchStats();
      }
      else toast.error(data.msg || 'Failed');
    } catch { toast.error('Network error'); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch('/api/admin/modules', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ id }) });
      const data = await res.json();
      if (data.success) { toast.success('Module deleted'); setDeleteConfirm(null); fetchModules(); fetchStats(); }
      else toast.error(data.msg || 'Failed');
    } catch { toast.error('Network error'); }
  };

  const handleBulkImport = async () => {
    if (!importText.trim()) return;
    setImportLoading(true);
    try {
      const lines = importText.trim().split('\n').filter(l => l.trim());
      let imported = 0;
      for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length >= 5) {
          const res = await fetch('/api/admin/modules', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ moduleSn: parts[0], moduleType: parts[1], power: parts[2], moduleGrade: parts[3], endMarketCountry: parts[4], customerDesc: parts[5] || null, productionDate: parts[6] || null, actualMovementDate: parts[7] || null, verifyCode: parts[8] || null }),
          });
          const data = await res.json();
          if (data.success) imported++;
        }
      }
      toast.success(`Imported ${imported}/${lines.length} modules`);
      setBulkImportOpen(false); setImportText(''); fetchModules(); fetchStats();
    } catch { toast.error('Import failed'); }
    setImportLoading(false);
  };

  const exportCSV = () => {
    const headers = ['Module SN', 'Type', 'Power', 'Grade', 'Country', 'Customer', 'Prod Date', 'Ship Date', 'Active'];
    const rows = modules.map(m => [m.moduleSn, m.moduleType, m.power, m.moduleGrade, m.endMarketCountry, m.customerDesc || '', m.productionDate || '', m.actualMovementDate || '', m.isActive ? 'Yes' : 'No']);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'modules.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const sidebarItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'modules', icon: Database, label: 'Modules' },
    { id: 'logs', icon: FileText, label: 'Query Logs' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Sidebar */}
      <div style={{ width: '240px', background: '#1a1a2e', color: '#fff', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50 }}>
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgb(206, 4, 18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sun style={{ width: 20, height: 20, color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>CSI Admin</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{user.name}</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '12px 0' }}>
          {sidebarItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 20px', background: activeTab === item.id ? 'rgba(206, 4, 18, 0.2)' : 'transparent', color: activeTab === item.id ? '#fff' : 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit', borderLeft: activeTab === item.id ? '3px solid rgb(206, 4, 18)' : '3px solid transparent', transition: 'all 0.2s' }}>
              <item.icon style={{ width: 18, height: 18 }} /> {item.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit' }}>
            <LogOut style={{ width: 16, height: 16 }} /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, marginLeft: '240px', padding: '24px' }}>
        {activeTab === 'dashboard' && stats && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', color: '#111' }}>Dashboard</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'Total Modules', value: stats.totalModules, icon: Database, color: '#CE0412' },
                { label: 'Active Modules', value: stats.activeModules, icon: CheckCircle, color: '#16a34a' },
                { label: 'Total Queries', value: stats.totalQueries, icon: Search, color: '#2563eb' },
                { label: 'Today Queries', value: stats.todayQueries, icon: Activity, color: '#d97706' },
                { label: 'This Week', value: stats.weekQueries, icon: TrendingUp, color: '#8b5cf6' },
                { label: 'This Month', value: stats.monthQueries, icon: Calendar, color: '#0891b2' },
              ].map(s => (
                <div key={s.label} style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '13px', color: '#888', marginBottom: '4px' }}>{s.label}</div>
                      <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#111' }}>{(s.value ?? 0).toLocaleString()}</div>
                    </div>
                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <s.icon style={{ width: 22, height: 22, color: s.color }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#111' }}>Daily Query Trend</h3>
                <div style={{ height: '250px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.dailyQueryTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" stroke="#CE0412" fill="#CE041220" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#111' }}>Country Distribution</h3>
                <div style={{ height: '250px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={stats.countryStats} dataKey="_count.id" nameKey="endMarketCountry" cx="50%" cy="50%" outerRadius={80} label={({ endMarketCountry, percent }) => `${endMarketCountry} ${(percent * 100).toFixed(0)}%`}>
                        {stats.countryStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'modules' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111' }}>Module Management</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ position: 'relative' }}>
                  <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#999' }} />
                  <input value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} placeholder="Search SN, type, country..."
                    style={{ paddingLeft: '36px', paddingRight: '12px', padding: '8px 12px 8px 36px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', width: '250px', outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <Button onClick={() => {
                  const today = new Date();
                  const shipDate = new Date(today); shipDate.setDate(shipDate.getDate() + 15);
                  const fmt = (d: Date) => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
                  let lastSn = '', lastType = '', lastPower = '';
                  try { lastSn = localStorage.getItem('csi_last_sn') || ''; lastType = localStorage.getItem('csi_last_type') || ''; lastPower = localStorage.getItem('csi_last_power') || ''; } catch {}
                  setEditModule({ isActive: true, moduleSn: lastSn, moduleType: lastType, power: lastPower, moduleGrade: 'A Grade', endMarketCountry: 'Pakistan', customerDesc: 'B&S Impex Pvt Ltd', productionDate: fmt(today), actualMovementDate: fmt(shipDate) });
                  setIsDialogOpen(true);
                }} style={{ background: 'rgb(206, 4, 18)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plus style={{ width: 16, height: 16 }} /> Add
                </Button>
                <Button onClick={() => setBulkImportOpen(true)} variant="outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Download style={{ width: 16, height: 16 }} /> Import
                </Button>
                <Button onClick={exportCSV} variant="outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Download style={{ width: 16, height: 16 }} /> Export
                </Button>
              </div>
            </div>
            <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <Table>
                <TableHeader><TableRow style={{ background: '#fafafa' }}>
                  <TableHead>Serial Number</TableHead><TableHead>Type</TableHead><TableHead>Power</TableHead><TableHead>Grade</TableHead><TableHead>Country</TableHead><TableHead>Status</TableHead><TableHead style={{ textAlign: 'right' }}>Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {loading ? Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={7}><Skeleton style={{ height: '40px' }} /></TableCell></TableRow>)
                    : modules.map(m => (
                      <TableRow key={m.id}>
                        <TableCell style={{ fontFamily: 'monospace', fontSize: '12px' }}>{m.moduleSn}</TableCell>
                        <TableCell>{m.moduleType}</TableCell>
                        <TableCell>{m.power}W</TableCell>
                        <TableCell>{m.moduleGrade}</TableCell>
                        <TableCell><Badge variant="outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Globe style={{ width: 12, height: 12 }} /> {m.endMarketCountry}</Badge></TableCell>
                        <TableCell><Badge style={{ background: m.isActive ? '#16a34a' : '#dc2626', color: '#fff' }}>{m.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                        <TableCell style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                            <Button size="sm" variant="ghost" onClick={() => { setEditModule(m); setIsDialogOpen(true); }} style={{ padding: '4px 8px' }}><Pencil style={{ width: 14, height: 14 }} /></Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(m.id)} style={{ padding: '4px 8px', color: '#dc2626' }}><Trash2 style={{ width: 14, height: 14 }} /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px' }}>
              <span style={{ fontSize: '13px', color: '#888' }}>Page {page} of {totalPages}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft style={{ width: 16, height: 16 }} /></Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight style={{ width: 16, height: 16 }} /></Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#111' }}>Query Logs</h2>
            <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <Table>
                <TableHeader><TableRow style={{ background: '#fafafa' }}>
                  <TableHead>Time</TableHead><TableHead>Serial Number</TableHead><TableHead>Query #</TableHead><TableHead>IP</TableHead><TableHead>Result</TableHead><TableHead>User Agent</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {logs.map(l => (
                    <TableRow key={l.id}>
                      <TableCell style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{l.createdAt ? new Date(l.createdAt).toLocaleString() : '-'}</TableCell>
                      <TableCell style={{ fontFamily: 'monospace', fontSize: '12px' }}>{l.moduleSn}</TableCell>
                      <TableCell>{l.queryNumber}</TableCell>
                      <TableCell style={{ fontSize: '12px' }}>{l.ipAddress || '-'}</TableCell>
                      <TableCell><Badge style={{ background: l.result === 'success' ? '#16a34a' : '#dc2626', color: '#fff' }}>{l.result}</Badge></TableCell>
                      <TableCell style={{ fontSize: '11px', color: '#888', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.userAgent}</TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && <TableRow><TableCell colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>No logs found</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#111' }}>Settings</h2>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Database Management</h3>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Button onClick={async () => {
                  const res = await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: 'seed' }) });
                  const data = await res.json();
                  if (data.success) { toast.success('Seeded'); fetchStats(); fetchModules(); } else toast.error(data.msg || 'Failed');
                }} style={{ background: 'rgb(206, 4, 18)' }}>Seed Sample Data</Button>
                <Button onClick={async () => {
                  if (!confirm('Delete ALL query logs?')) return;
                  const res = await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: 'clearLogs' }) });
                  const data = await res.json();
                  if (data.success) { toast.success('Logs cleared'); fetchStats(); fetchLogs(); } else toast.error(data.msg || 'Failed');
                }} variant="outline">Clear Query Logs</Button>
                <Button onClick={async () => {
                  if (!confirm('Delete ALL modules?')) return;
                  const res = await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: 'clearModules' }) });
                  const data = await res.json();
                  if (data.success) { toast.success('All modules deleted'); fetchStats(); fetchModules(); } else toast.error(data.msg || 'Failed');
                }} variant="outline" style={{ color: '#dc2626' }}>Delete All Modules</Button>
              </div>
              <Separator style={{ margin: '24px 0' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>System Info</h3>
              <div style={{ fontSize: '13px', color: '#666', lineHeight: 2 }}>
                <div><strong>Admin:</strong> {user.name} ({user.role})</div>
                <div><strong>Database:</strong> SQLite</div>
                <div><strong>Version:</strong> 1.0.0</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Module Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent style={{ maxWidth: '600px' }}>
          <DialogHeader><DialogTitle>{editModule?.id ? 'Edit Module' : 'Add Module'}</DialogTitle><DialogDescription>Enter module details below</DialogDescription></DialogHeader>
          <div style={{ display: 'grid', gap: '12px', padding: '8px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><Label>Serial Number *</Label><Input value={editModule?.moduleSn || ''} onChange={e => setEditModule({ ...editModule!, moduleSn: e.target.value })} placeholder="e.g. HJT72VDD..." style={{ marginTop: '4px' }} /></div>
              <div><Label>Module Type *</Label><Input value={editModule?.moduleType || ''} onChange={e => setEditModule({ ...editModule!, moduleType: e.target.value })} placeholder="e.g. HiKu7" style={{ marginTop: '4px' }} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><Label>Power (W) *</Label><Input value={editModule?.power || ''} onChange={e => setEditModule({ ...editModule!, power: e.target.value })} placeholder="e.g. 550" style={{ marginTop: '4px' }} /></div>
              <div><Label>Module Grade *</Label><Input value={editModule?.moduleGrade || ''} onChange={e => setEditModule({ ...editModule!, moduleGrade: e.target.value })} placeholder="e.g. A" style={{ marginTop: '4px' }} /></div>
            </div>
            <div><Label>Ship To Country *</Label><Input value={editModule?.endMarketCountry || ''} onChange={e => setEditModule({ ...editModule!, endMarketCountry: e.target.value })} placeholder="e.g. Pakistan" style={{ marginTop: '4px' }} /></div>
            <div><Label>Importer&apos;s Name</Label><Input value={editModule?.customerDesc || ''} onChange={e => setEditModule({ ...editModule!, customerDesc: e.target.value })} placeholder="Optional" style={{ marginTop: '4px' }} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><Label>Production Date</Label><Input value={editModule?.productionDate || ''} onChange={e => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                let shipAuto = editModule?.actualMovementDate || '';
                if (val.length === 8 && !editModule?.id) {
                  const pd = new Date(parseInt(val.substring(0,4)), parseInt(val.substring(4,6))-1, parseInt(val.substring(6,8)));
                  const sd = new Date(pd); sd.setDate(sd.getDate() + 15);
                  shipAuto = `${sd.getFullYear()}${String(sd.getMonth()+1).padStart(2,'0')}${String(sd.getDate()).padStart(2,'0')}`;
                }
                setEditModule({ ...editModule!, productionDate: val, actualMovementDate: shipAuto });
              }} placeholder="YYYYMMDD" style={{ marginTop: '4px' }} /></div>
              <div><Label>Shipment Date</Label><Input value={editModule?.actualMovementDate || ''} onChange={e => setEditModule({ ...editModule!, actualMovementDate: e.target.value })} placeholder="YYYYMMDD" style={{ marginTop: '4px' }} /></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Switch checked={editModule?.isActive ?? true} onCheckedChange={c => setEditModule({ ...editModule!, isActive: c })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveModule} style={{ background: 'rgb(206, 4, 18)' }}>{editModule?.id ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Delete</DialogTitle><DialogDescription>Are you sure? This cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} style={{ background: '#dc2626' }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={bulkImportOpen} onOpenChange={setBulkImportOpen}>
        <DialogContent style={{ maxWidth: '600px' }}>
          <DialogHeader><DialogTitle>Bulk Import</DialogTitle><DialogDescription>Paste tab-separated data. Columns: SN, Type, Power, Grade, Country, Customer (opt), ProdDate (opt), ShipDate (opt), VerifyCode (opt)</DialogDescription></DialogHeader>
          <textarea value={importText} onChange={e => setImportText(e.target.value)} rows={10}
            placeholder={`HJT72VDD1234567\tHiKu7\t550\tA\tPakistan\tABC Trading\t20260101\t20260115\tVRC123`}
            style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', fontFamily: 'monospace', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkImportOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkImport} disabled={importLoading} style={{ background: 'rgb(206, 4, 18)' }}>{importLoading ? 'Importing...' : 'Import'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ===== ADMIN PAGE ===== */
export default function AdminPage() {
  const [token, setToken] = useState('');
  const [user, setUser] = useState<{ id: string; username: string; name: string; role: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const saved = sessionStorage.getItem('adminToken');
    const savedUser = sessionStorage.getItem('adminUser');
    if (saved && savedUser) { setToken(saved); setUser(JSON.parse(savedUser)); }
  }, [mounted]);

  const handleLogin = (t: string, u: { id: string; username: string; name: string; role: string }) => {
    setToken(t); setUser(u);
    try { sessionStorage.setItem('adminToken', t); sessionStorage.setItem('adminUser', JSON.stringify(u)); } catch {}
  };

  const handleLogout = () => {
    setToken(''); setUser(null);
    try { sessionStorage.removeItem('adminToken'); sessionStorage.removeItem('adminUser'); } catch {}
  };

  if (!mounted) return <div style={{ minHeight: '100vh', background: '#f5f5f5' }} />;
  if (!token || !user) return <AdminLogin onLogin={handleLogin} />;
  return <AdminDashboard token={token} user={user} onLogout={handleLogout} />;
}