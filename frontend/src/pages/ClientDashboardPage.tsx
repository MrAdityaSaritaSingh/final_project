import { useEffect, useMemo, useState } from 'react';

interface ClientRecord {
  id: string;
  clientName: string;
  industry: string;
  contactPerson: string;
  email: string;
  lastAuditDate: string;
  notes: string;
  createdAt: string;
}

interface ClientInput {
  clientName: string;
  industry: string;
  contactPerson: string;
  email: string;
  lastAuditDate: string;
  notes: string;
}

const STORAGE_KEY = 'audit_client_records_v1';

const EMPTY_FORM: ClientInput = {
  clientName: '',
  industry: '',
  contactPerson: '',
  email: '',
  lastAuditDate: '',
  notes: '',
};

function loadClients(): ClientRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ClientRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function ClientDashboardPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [form, setForm] = useState<ClientInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setClients(loadClients());
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  }, [clients]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.clientName, c.industry, c.contactPerson, c.email, c.notes]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [clients, search]);

  const totalClients = clients.length;
  const reviewedThisYear = clients.filter((c) => c.lastAuditDate.startsWith(new Date().getFullYear().toString())).length;

  const updateForm = (key: keyof ClientInput, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError(null);
  };

  const validate = (): boolean => {
    if (form.clientName.trim().length < 2) {
      setError('Client name must be at least 2 characters.');
      return false;
    }
    if (form.email.trim() && !form.email.includes('@')) {
      setError('Please enter a valid email address.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSave = () => {
    if (!validate()) return;

    if (editingId) {
      setClients((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? { ...item, ...form }
            : item,
        ),
      );
    } else {
      const now = new Date().toISOString();
      setClients((prev) => [
        {
          id: now,
          createdAt: now,
          ...form,
        },
        ...prev,
      ]);
    }

    resetForm();
  };

  const handleEdit = (client: ClientRecord) => {
    setEditingId(client.id);
    setForm({
      clientName: client.clientName,
      industry: client.industry,
      contactPerson: client.contactPerson,
      email: client.email,
      lastAuditDate: client.lastAuditDate,
      notes: client.notes,
    });
    setError(null);
  };

  const handleDelete = (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
    if (editingId === id) resetForm();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Clients" value={String(totalClients)} helper="Stored in this workspace" />
        <StatCard title="Audited This Year" value={String(reviewedThisYear)} helper="Based on last audit date" />
        <StatCard title="Need Audit Update" value={String(Math.max(totalClients - reviewedThisYear, 0))} helper="No audit date this year" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-1 bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">{editingId ? 'Edit Client' : 'Add Client'}</h3>
            <p className="text-xs text-slate-400 mt-1">Store client profile data for repeated audits.</p>
          </div>

          <Field label="Client Name" value={form.clientName} onChange={(v) => updateForm('clientName', v)} />
          <Field label="Industry" value={form.industry} onChange={(v) => updateForm('industry', v)} />
          <Field label="Contact Person" value={form.contactPerson} onChange={(v) => updateForm('contactPerson', v)} />
          <Field label="Email" value={form.email} onChange={(v) => updateForm('email', v)} />

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Last Audit Date</label>
            <input
              type="date"
              value={form.lastAuditDate}
              onChange={(e) => updateForm('lastAuditDate', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => updateForm('notes', e.target.value)}
              rows={4}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              placeholder="Risk remarks, engagement notes, or pending documents"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button onClick={handleSave} className="flex-1 bg-[#0F766E] text-white text-sm font-semibold rounded-lg py-2.5 hover:bg-[#115E59] transition-colors">
              {editingId ? 'Update Client' : 'Save Client'}
            </button>
            <button onClick={resetForm} className="px-4 border border-slate-300 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">
              Reset
            </button>
          </div>
        </div>

        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-sm font-bold text-slate-800">Client Register</h3>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search client, contact, industry..."
              className="w-full sm:w-72 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="py-20 text-center text-sm text-slate-400 border border-dashed border-slate-200 rounded-xl">
              No clients found. Add a client record to start tracking audit work.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                    <th className="text-left py-2.5 pr-3">Client</th>
                    <th className="text-left py-2.5 pr-3">Industry</th>
                    <th className="text-left py-2.5 pr-3">Contact</th>
                    <th className="text-left py-2.5 pr-3">Last Audit</th>
                    <th className="text-right py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((client) => (
                    <tr key={client.id} className="border-b border-slate-100">
                      <td className="py-3 pr-3">
                        <p className="font-semibold text-slate-700">{client.clientName}</p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-64">{client.notes || 'No notes'}</p>
                      </td>
                      <td className="py-3 pr-3 text-slate-600">{client.industry || '-'}</td>
                      <td className="py-3 pr-3">
                        <p className="text-slate-700">{client.contactPerson || '-'}</p>
                        <p className="text-xs text-slate-400">{client.email || '-'}</p>
                      </td>
                      <td className="py-3 pr-3 text-slate-600">{client.lastAuditDate || '-'}</td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleEdit(client)} className="px-2.5 py-1.5 rounded-md text-xs border border-slate-300 text-slate-600 hover:bg-slate-50">Edit</button>
                          <button onClick={() => handleDelete(client.id)} className="px-2.5 py-1.5 rounded-md text-xs border border-red-200 text-red-600 hover:bg-red-50">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1.5">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
      />
    </div>
  );
}

function StatCard({ title, value, helper }: { title: string; value: string; helper: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <p className="text-xs text-slate-400 uppercase tracking-wide">{title}</p>
      <p className="text-2xl font-black text-slate-800 mt-1">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{helper}</p>
    </div>
  );
}
