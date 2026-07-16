import React, { useEffect, useState, useRef } from 'react';
import { postsAPI, servicesAPI, postMediaUrl } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, Image, Tag, Calendar, Megaphone, Film,
  Eye, MousePointerClick, X, ChevronDown,
} from 'lucide-react';

const TYPE_META = {
  photo:        { label: 'Photo / Portfolio', icon: Image,      color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
  offer:        { label: 'Offer',             icon: Tag,        color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
  availability: { label: 'Availability',      icon: Calendar,   color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
  announcement: { label: 'Announcement',      icon: Megaphone,  color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
};

const EMPTY = {
  type: 'photo', caption: '', offer_text: '', offer_expires_at: '',
  cta_label: '', cta_service_id: '', image: null, preview: null,
};

function PostCard({ post, onDelete }) {
  const meta = TYPE_META[post.type] || TYPE_META.photo;
  const Icon = meta.icon;
  return (
    <div className="app-panel p-4 flex gap-3">
      {post.has_media && post.media_type === 'video' ? (
        <video src={postMediaUrl(post.id)} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" muted playsInline />
      ) : post.has_media ? (
        <img src={postMediaUrl(post.id)} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
      ) : null}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${meta.color}`}>
            {post.media_type === 'video' ? <Film className="w-3 h-3" /> : <Icon className="w-3 h-3" />}{post.media_type === 'video' ? 'Reel / Video' : meta.label}
          </span>
          <button onClick={() => onDelete(post.id)} className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        {post.caption && <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{post.caption}</p>}
        {post.offer_text && (
          <div className="flex items-center gap-2 mt-1">
            <p className={`text-xs font-semibold ${post.is_expired ? 'text-gray-400 line-through' : 'text-amber-600'}`}>{post.offer_text}</p>
            {post.is_expired && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500">Expired</span>}
          </div>
        )}
        {post.offer_expires_at && !post.is_expired && (
          <p className="text-[10px] text-gray-400 mt-0.5">
            Expires {new Date(post.offer_expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        )}
        {post.cta_label && (
          <span className="mt-1.5 inline-block text-xs font-semibold text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-700 rounded-lg px-2 py-0.5">
            CTA: {post.cta_label}
          </span>
        )}
        <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.views} views</span>
          <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" />{post.booking_clicks} book clicks</span>
          <span>{new Date(post.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
        </div>
      </div>
    </div>
  );
}

export default function Posts() {
  const [posts, setPosts] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      const [postsResult, servicesResult] = await Promise.allSettled([
        postsAPI.list(),
        servicesAPI.list(),
      ]);

      if (cancelled) return;

      if (postsResult.status === 'fulfilled') {
        setPosts(postsResult.value || []);
      } else {
        toast.error(postsResult.reason?.message || 'Failed to load posts');
      }

      if (servicesResult.status === 'fulfilled') {
        setServices(servicesResult.value || []);
      } else {
        toast.error(servicesResult.reason?.message || 'Failed to load services');
      }

      setLoading(false);
    }

    loadData();
    return () => { cancelled = true; };
  }, []);

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) && !/^video\/(mp4|webm|quicktime)$/.test(file.type)) {
      toast.error('Use a JPEG, PNG, WebP, MP4, WebM, or MOV file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Media must be 5MB or less. Compress images or trim videos before uploading.');
      return;
    }
    setForm(f => ({ ...f, image: file, preview: URL.createObjectURL(file) }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.caption.trim() && !form.image) return toast.error('Add a caption or image');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('type', form.type);
      if (form.caption.trim()) fd.append('caption', form.caption.trim());
      if (form.offer_text.trim()) fd.append('offer_text', form.offer_text.trim());
      if (form.offer_expires_at) fd.append('offer_expires_at', form.offer_expires_at);
      if (form.cta_label.trim()) fd.append('cta_label', form.cta_label.trim());
      if (form.cta_service_id) fd.append('cta_service_id', form.cta_service_id);
      if (form.image) fd.append('image', form.image);
      const post = await postsAPI.create(fd);
      setPosts(p => [post, ...p]);
      setForm(EMPTY);
      setShowForm(false);
      toast.success('Post published');
    } catch (err) {
      toast.error(err.message || 'Failed to publish post');
    } finally {
      setSaving(false);
    }
  };

  const deletePost = async (id) => {
    try {
      await postsAPI.remove(id);
      setPosts(p => p.filter(x => x.id !== id));
      toast.success('Post deleted');
    } catch {
      toast.error('Failed to delete post');
    }
  };

  const meta = TYPE_META[form.type];
  const FormIcon = meta.icon;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Posts</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Share updates, offers, and availability with customers</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="btn-primary flex items-center gap-2">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'New post'}
        </button>
      </div>

      {showForm && (
        <div className="app-panel p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Create a post</h2>
          <form onSubmit={submit} className="space-y-4">
            {/* Type selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(TYPE_META).map(([key, m]) => {
                const Ic = m.icon;
                return (
                  <button
                    key={key} type="button"
                    onClick={() => setForm(f => ({ ...f, type: key }))}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 text-xs font-bold transition-all ${
                      form.type === key
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Ic className="w-5 h-5" />{m.label}
                  </button>
                );
              })}
            </div>

            {/* Media upload */}
            <div>
              <label className="label">Photo or reel (optional)</label>
              {form.preview ? (
                <div className="relative w-32 h-32">
                  {form.image?.type?.startsWith('video/') ? (
                    <video src={form.preview} className="w-32 h-32 rounded-lg object-cover" muted playsInline controls />
                  ) : (
                    <img src={form.preview} alt="" className="w-32 h-32 rounded-lg object-cover" />
                  )}
                  <button type="button" onClick={() => setForm(f => ({ ...f, image: null, preview: null }))}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors">
                  <Image className="w-4 h-4" /> Add media
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" className="hidden" onChange={handleImage} />
              <p className="text-xs text-gray-400 mt-1">Supports images and short clips. Max 5MB — compress or trim before uploading.</p>
            </div>

            <div>
              <label className="label">Caption</label>
              <textarea className="input resize-none" rows={3} placeholder="Write something customers will see…"
                value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))} maxLength={500} />
              <p className="text-xs text-gray-400 mt-1">{form.caption.length}/500</p>
            </div>

            {form.type === 'offer' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Offer details</label>
                  <input className="input" placeholder="e.g. 20% off all cuts this weekend"
                    value={form.offer_text} onChange={e => setForm(f => ({ ...f, offer_text: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Expires (optional)</label>
                  <input type="date" className="input"
                    value={form.offer_expires_at} onChange={e => setForm(f => ({ ...f, offer_expires_at: e.target.value }))} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Book CTA label (optional)</label>
                <input className="input" placeholder="e.g. Book now, Claim offer"
                  value={form.cta_label} onChange={e => setForm(f => ({ ...f, cta_label: e.target.value }))} />
              </div>
              {services.length > 0 && (
                <div>
                  <label className="label">Link to service (optional)</label>
                  <select className="input" value={form.cta_service_id} onChange={e => setForm(f => ({ ...f, cta_service_id: e.target.value }))}>
                    <option value="">Any service</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Publishing…' : 'Publish post'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : posts.length === 0 ? (
        <div className="app-panel p-10 text-center">
          <div className="w-14 h-14 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-7 h-7 text-primary-500" />
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white mb-1">No posts yet</h3>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">Share your work, offers, and availability. Posts appear on your profile and in the customer discovery feed.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-5 inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create your first post
          </button>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {posts.map(p => <PostCard key={p.id} post={p} onDelete={deletePost} />)}
        </div>
      )}
    </div>
  );
}
