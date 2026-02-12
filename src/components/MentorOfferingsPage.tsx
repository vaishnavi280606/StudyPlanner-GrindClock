import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, Clock, Video, MessageCircle, Phone,
  Loader2, Star, DollarSign, Tag, FileText, Zap,
  ToggleLeft, ToggleRight, Users, TrendingUp, Edit3, X, Check
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchMentorOfferings,
  createMentorOffering,
  deleteMentorOffering,
  updateMentorOffering,
  fetchMentorReviews,
  fetchSessionRequests,
  subscribeToMentorReviews,
  subscribeToSessionRequests,
} from '../utils/supabase-queries';

interface MentorOfferingsPageProps {
  isDarkMode: boolean;
}

interface OfferingForm {
  title: string;
  description: string;
  durationMinutes: number;
  mode: 'chat' | 'call' | 'video';
  isFree: boolean;
  price: number;
}

const EMPTY_FORM: OfferingForm = {
  title: '',
  description: '',
  durationMinutes: 60,
  mode: 'video',
  isFree: true,
  price: 0,
};

const MODE_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  video: { icon: Video, label: 'Video Call', color: 'text-blue-500 bg-blue-500/10' },
  call: { icon: Phone, label: 'Audio Call', color: 'text-green-500 bg-green-500/10' },
  chat: { icon: MessageCircle, label: 'Chat', color: 'text-purple-500 bg-purple-500/10' },
};

export const MentorOfferingsPage: React.FC<MentorOfferingsPageProps> = ({ isDarkMode }) => {
  const { user } = useAuth();
  const dark = isDarkMode;

  const [offerings, setOfferings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<OfferingForm>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalBookings: 0, avgRating: 0, totalReviews: 0, totalEarnings: 0 });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<OfferingForm>({ ...EMPTY_FORM });
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [offeringsData, reviewsData, sessionsData] = await Promise.all([
        fetchMentorOfferings(user.id),
        fetchMentorReviews(user.id),
        fetchSessionRequests(user.id, 'mentor'),
      ]);
      setOfferings(Array.isArray(offeringsData) ? offeringsData : []);
      const completed = sessionsData.filter((s: any) => s.status === 'completed');
      const avgR = reviewsData.length > 0
        ? reviewsData.reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviewsData.length
        : 0;
      const totalEarnings = completed.reduce((s: number, sess: any) => {
        const off = offeringsData.find((o: any) => o.id === sess.offering_id);
        return s + (off && !off.is_free ? (off.price || 0) : 0);
      }, 0);
      setStats({
        totalBookings: sessionsData.length,
        avgRating: avgR,
        totalReviews: reviewsData.length,
        totalEarnings,
      });
    } catch (err) {
      console.error('Error loading offerings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
      const reviewSub = subscribeToMentorReviews(user.id, () => loadData());
      const sessionSub = subscribeToSessionRequests(user.id, 'mentor', () => loadData());
      return () => { reviewSub.unsubscribe(); sessionSub.unsubscribe(); };
    }
  }, [user]);

  const handleCreate = async () => {
    if (!user || !form.title.trim() || !form.description.trim()) return;
    setSaving(true);
    try {
      const result = await createMentorOffering({
        mentor_id: user.id,
        title: form.title.trim(),
        description: form.description.trim(),
        duration_minutes: form.durationMinutes,
        mode: form.mode,
        is_free: form.isFree,
        price: form.isFree ? 0 : form.price,
        is_active: true,
      });
      if (!result.error) {
        setShowForm(false);
        setForm({ ...EMPTY_FORM });
        await loadData();
      }
    } catch (err) {
      console.error('Error creating offering:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteMentorOffering(id);
      await loadData();
    } catch (err) {
      console.error('Error deleting offering:', err);
    } finally {
      setDeletingId(null);
      setDeleteConfirm(null);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    setTogglingId(id);
    try {
      await updateMentorOffering(id, { is_active: !currentActive });
      await loadData();
    } catch (err) {
      console.error('Error toggling offering:', err);
    } finally {
      setTogglingId(null);
    }
  };

  const startEdit = (off: any) => {
    setEditingId(off.id);
    setEditForm({
      title: off.title || '',
      description: off.description || '',
      durationMinutes: off.duration_minutes || 60,
      mode: off.mode || 'video',
      isFree: off.is_free ?? true,
      price: off.price || 0,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editForm.title.trim() || !editForm.description.trim()) return;
    setSaving(true);
    try {
      await updateMentorOffering(editingId, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        duration_minutes: editForm.durationMinutes,
        mode: editForm.mode,
        is_free: editForm.isFree,
        price: editForm.isFree ? 0 : editForm.price,
      });
      setEditingId(null);
      await loadData();
    } catch (err) {
      console.error('Error updating offering:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className={`text-3xl font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>My Offerings</h2>
          <p className={dark ? 'text-slate-400' : 'text-slate-600'}>Create and manage your mentorship offerings</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md ${
            showForm
              ? dark ? 'bg-slate-700 text-red-400 hover:bg-slate-600' : 'bg-red-50 text-red-500 hover:bg-red-100 border border-red-200'
              : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700'
          }`}
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'New Offering'}
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Bookings', value: stats.totalBookings, icon: Users, color: 'from-blue-500 to-cyan-500' },
          { label: 'Avg Rating', value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '—', icon: Star, color: 'from-amber-500 to-orange-500' },
          { label: 'Reviews', value: stats.totalReviews, icon: TrendingUp, color: 'from-green-500 to-emerald-500' },
          { label: 'Active Offerings', value: offerings.filter(o => o.is_active !== false).length, icon: Zap, color: 'from-purple-500 to-fuchsia-500' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className={`rounded-2xl border p-5 transition-all duration-300 hover:scale-[1.02] ${dark ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200 hover:shadow-lg'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br ${stat.color} shadow-lg`}>
                <Icon size={18} className="text-white" />
              </div>
              <p className={`text-3xl font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>{stat.value}</p>
              <p className={`text-xs mt-1 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Create Offering Form */}
      {showForm && (
        <div className={`rounded-2xl border p-6 ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-lg`}>
          <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${dark ? 'text-white' : 'text-slate-900'}`}>
            <Plus size={18} className="text-amber-500" />
            Create New Offering
          </h3>
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className={`text-xs font-bold mb-1 block ${dark ? 'text-slate-400' : 'text-slate-600'}`}>Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. 1:1 Career Mentorship, Resume Review, Mock Interview..."
                className={`w-full px-4 py-2.5 rounded-xl text-sm border transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
                  dark ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                }`}
              />
            </div>
            {/* Description */}
            <div>
              <label className={`text-xs font-bold mb-1 block ${dark ? 'text-slate-400' : 'text-slate-600'}`}>Description *</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe what students will get from this session..."
                rows={3}
                className={`w-full px-4 py-2.5 rounded-xl text-sm border transition-all resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
                  dark ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                }`}
              />
            </div>
            {/* Mode + Duration row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`text-xs font-bold mb-1 block ${dark ? 'text-slate-400' : 'text-slate-600'}`}>Session Mode</label>
                <div className="flex gap-2">
                  {(['video', 'call', 'chat'] as const).map(m => {
                    const meta = MODE_META[m];
                    const Icon = meta.icon;
                    return (
                      <button
                        key={m}
                        onClick={() => setForm(f => ({ ...f, mode: m }))}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                          form.mode === m
                            ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-transparent shadow-md'
                            : dark ? 'bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <Icon size={14} />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className={`text-xs font-bold mb-1 block ${dark ? 'text-slate-400' : 'text-slate-600'}`}>Duration (minutes)</label>
                <div className="flex gap-2">
                  {[30, 45, 60, 90].map(d => (
                    <button
                      key={d}
                      onClick={() => setForm(f => ({ ...f, durationMinutes: d }))}
                      className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                        form.durationMinutes === d
                          ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-transparent shadow-md'
                          : dark ? 'bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {d}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* Pricing */}
            <div>
              <label className={`text-xs font-bold mb-1 block ${dark ? 'text-slate-400' : 'text-slate-600'}`}>Pricing</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setForm(f => ({ ...f, isFree: true, price: 0 }))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                    form.isFree
                      ? 'bg-green-500/10 text-green-500 border-green-500/30'
                      : dark ? 'bg-slate-700 border-slate-600 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <Zap size={14} /> Free
                </button>
                <button
                  onClick={() => setForm(f => ({ ...f, isFree: false }))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                    !form.isFree
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                      : dark ? 'bg-slate-700 border-slate-600 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <DollarSign size={14} /> Paid
                </button>
                {!form.isFree && (
                  <div className="relative flex-1 max-w-[160px]">
                    <DollarSign size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
                    <input
                      type="number"
                      min={0}
                      value={form.price}
                      onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                      className={`w-full pl-8 pr-3 py-2 rounded-xl text-sm border transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
                        dark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                      placeholder="0.00"
                    />
                  </div>
                )}
              </div>
            </div>
            {/* Submit */}
            <button
              onClick={handleCreate}
              disabled={saving || !form.title.trim() || !form.description.trim()}
              className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {saving ? 'Creating...' : 'Create Offering'}
            </button>
          </div>
        </div>
      )}

      {/* Offerings Grid */}
      {offerings.length === 0 && !showForm ? (
        <div className={`text-center py-20 rounded-2xl border ${dark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
          <Tag className={`mx-auto mb-3 ${dark ? 'text-slate-600' : 'text-slate-300'}`} size={56} />
          <p className={`text-lg font-bold ${dark ? 'text-slate-400' : 'text-slate-600'}`}>No offerings yet</p>
          <p className={`text-sm mt-1 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Create your first offering to start accepting sessions</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 px-6 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 transition-all shadow-md inline-flex items-center gap-2"
          >
            <Plus size={16} /> Create Offering
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {offerings.map(off => {
            const meta = MODE_META[off.mode] || MODE_META.video;
            const ModeIcon = meta.icon;
            const isEditing = editingId === off.id;
            const isActive = off.is_active !== false;

            // Inline edit mode
            if (isEditing) {
              return (
                <div key={off.id} className={`rounded-2xl border p-5 col-span-1 md:col-span-2 ${dark ? 'bg-slate-800 border-amber-500/30 ring-1 ring-amber-500/10' : 'bg-white border-amber-200 ring-1 ring-amber-100'}`}>
                  <h4 className={`text-sm font-bold mb-3 flex items-center gap-2 ${dark ? 'text-amber-400' : 'text-amber-600'}`}>
                    <Edit3 size={14} /> Edit Offering
                  </h4>
                  <div className="space-y-3">
                    <input type="text" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} placeholder="Title"
                      className={`w-full px-4 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${dark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    />
                    <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Description"
                      className={`w-full px-4 py-2 rounded-xl text-sm border resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${dark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className={`text-[10px] font-bold mb-1 block ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Mode</label>
                        <div className="flex gap-1">
                          {(['video', 'call', 'chat'] as const).map(m => (
                            <button key={m} onClick={() => setEditForm(f => ({ ...f, mode: m }))}
                              className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${editForm.mode === m ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-transparent' : dark ? 'bg-slate-700 border-slate-600 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                            >
                              {MODE_META[m].label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className={`text-[10px] font-bold mb-1 block ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Duration</label>
                        <div className="flex gap-1">
                          {[30, 45, 60, 90].map(d => (
                            <button key={d} onClick={() => setEditForm(f => ({ ...f, durationMinutes: d }))}
                              className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${editForm.durationMinutes === d ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-transparent' : dark ? 'bg-slate-700 border-slate-600 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                            >
                              {d}m
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className={`text-[10px] font-bold mb-1 block ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Pricing</label>
                        <div className="flex gap-1">
                          <button onClick={() => setEditForm(f => ({ ...f, isFree: true, price: 0 }))}
                            className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold border ${editForm.isFree ? 'bg-green-500/10 text-green-500 border-green-500/30' : dark ? 'bg-slate-700 border-slate-600 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                          >Free</button>
                          <button onClick={() => setEditForm(f => ({ ...f, isFree: false }))}
                            className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold border ${!editForm.isFree ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : dark ? 'bg-slate-700 border-slate-600 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                          >Paid</button>
                          {!editForm.isFree && (
                            <input type="number" min={0} value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                              className={`w-20 px-2 py-1.5 rounded-lg text-[10px] border ${dark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={handleSaveEdit} disabled={saving || !editForm.title.trim() || !editForm.description.trim()}
                        className="flex-1 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-600 text-white disabled:opacity-50 flex items-center justify-center gap-1">
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button onClick={() => setEditingId(null)} className={`px-4 py-2 rounded-xl text-xs font-bold ${dark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={off.id} className={`rounded-2xl border p-5 transition-all duration-300 group relative ${
                !isActive
                  ? dark ? 'bg-slate-800/50 border-slate-700/50 opacity-60' : 'bg-slate-50 border-slate-200/50 opacity-60'
                  : dark ? 'bg-slate-800 border-slate-700 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5' : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-100'
              }`}>
                {/* Delete Confirm overlay */}
                {deleteConfirm === off.id && (
                  <div className="absolute inset-0 z-10 rounded-2xl bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <div className={`rounded-xl p-5 text-center ${dark ? 'bg-slate-800' : 'bg-white'} shadow-2xl`}>
                      <p className={`text-sm font-bold mb-3 ${dark ? 'text-white' : 'text-slate-900'}`}>Delete this offering?</p>
                      <div className="flex gap-2">
                        <button onClick={() => setDeleteConfirm(null)} className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold ${dark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>Cancel</button>
                        <button
                          onClick={() => handleDelete(off.id)}
                          disabled={deletingId === off.id}
                          className="flex-1 px-4 py-2 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          {deletingId === off.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.color}`}>
                      <ModeIcon size={18} />
                    </div>
                    <div className="min-w-0">
                      <h4 className={`font-bold truncate ${dark ? 'text-white' : 'text-slate-900'}`}>{off.title}</h4>
                      <p className={`text-xs mt-0.5 line-clamp-2 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>{off.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => startEdit(off)} className={`p-1.5 rounded-lg ${dark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`} title="Edit">
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleToggleActive(off.id, isActive)}
                      disabled={togglingId === off.id}
                      className={`p-1.5 rounded-lg ${isActive ? (dark ? 'hover:bg-amber-500/20 text-amber-400' : 'hover:bg-amber-50 text-amber-500') : (dark ? 'hover:bg-green-500/20 text-green-400' : 'hover:bg-green-50 text-green-500')}`}
                      title={isActive ? 'Deactivate' : 'Activate'}
                    >
                      {togglingId === off.id ? <Loader2 size={14} className="animate-spin" /> : isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                    </button>
                    <button onClick={() => setDeleteConfirm(off.id)} className={`p-1.5 rounded-lg ${dark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-400'}`} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${meta.color}`}>
                    <ModeIcon size={10} /> {meta.label}
                  </span>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${dark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                    <Clock size={10} /> {off.duration_minutes || 60} min
                  </span>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${
                    off.is_free
                      ? 'bg-green-500/10 text-green-500'
                      : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {off.is_free ? (
                      <><Zap size={10} /> Free</>
                    ) : (
                      <><DollarSign size={10} /> ${off.price}</>
                    )}
                  </span>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${
                    isActive ? 'bg-green-500/10 text-green-500' : 'bg-slate-500/10 text-slate-400'
                  }`}>
                    {isActive ? <><ToggleRight size={10} /> Active</> : <><ToggleLeft size={10} /> Paused</>}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
