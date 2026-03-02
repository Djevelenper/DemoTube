/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Music, 
  Heart, 
  Settings, 
  LogOut, 
  Plus, 
  Trash2, 
  Edit2, 
  ChevronDown, 
  Play, 
  Pause,
  Filter,
  User as UserIcon,
  ShieldCheck,
  Search
} from 'lucide-react';
import { User, Demo, SortOrder } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'login' | 'dashboard' | 'favorites'>('landing');
  const [demos, setDemos] = useState<Demo[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<Demo | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', genre: 'pop' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [activeAudio, setActiveAudio] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchDemos();
      if (user.role === 'user') fetchFavorites();
    }
  }, [user, sortOrder]);

  const togglePlay = (url: string) => {
    if (activeAudio === url) {
      if (isPlaying) {
        audioRef.current?.pause();
      } else {
        audioRef.current?.play();
      }
      setIsPlaying(!isPlaying);
    } else {
      setActiveAudio(url);
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
      }
    }
  };

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/me');
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        setView('dashboard');
      }
    } catch (e) {
      console.error('Auth check failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchDemos = async () => {
    const res = await fetch(`/api/demos?sort=${sortOrder}`);
    const data = await res.json();
    setDemos(data);
  };

  const fetchFavorites = async () => {
    const res = await fetch('/api/favorites');
    const data = await res.json();
    setFavorites(data.map((d: Demo) => d.id));
  };

  const handleLogin = async (role: 'admin' | 'user') => {
    const credentials = role === 'admin' 
      ? { username: 'admin', password: 'admin123', role: 'admin' }
      : { username: 'user1', password: 'password123', role: 'user' };

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
      setView('dashboard');
    } else {
      alert('Login failed. Try admin/admin123');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setUser(null);
    setView('landing');
  };

  const toggleFavorite = async (demoId: number) => {
    const isFav = favorites.includes(demoId);
    const method = isFav ? 'DELETE' : 'POST';
    const res = await fetch(`/api/favorites/${demoId}`, { method });
    if (res.ok) {
      setFavorites(prev => isFav ? prev.filter(id => id !== demoId) : [...prev, demoId]);
    }
  };

  const handleAddDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing ? `/api/demos/${isEditing.id}` : '/api/demos';
    
    const data = new FormData();
    data.append('name', formData.name);
    data.append('genre', formData.genre);
    if (selectedFile) data.append('file', selectedFile);
    
    const res = await fetch(url, {
      method,
      body: data
    });

    if (res.ok) {
      fetchDemos();
      setShowAddModal(false);
      setIsEditing(null);
      setFormData({ name: '', genre: 'pop' });
      setSelectedFile(null);
    }
  };

  const deleteDemo = async (id: number) => {
    if (confirm('Are you sure?')) {
      await fetch(`/api/demos/${id}`, { method: 'DELETE' });
      fetchDemos();
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-black text-emerald-400 font-mono">LOADING_SYSTEM_2026...</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-emerald-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-white/5 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('landing')}>
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)]">
            <Music className="text-black" size={24} />
          </div>
          <span className="font-serif text-2xl font-bold tracking-tighter">DEMO<span className="text-emerald-400">VAULT</span></span>
        </div>

        <div className="flex items-center gap-6">
          {user ? (
            <>
              <button 
                onClick={() => setView('dashboard')}
                className={`text-sm font-medium transition-colors ${view === 'dashboard' ? 'text-emerald-400' : 'text-white/60 hover:text-white'}`}
              >
                Explore
              </button>
              {user.role === 'user' && (
                <button 
                  onClick={() => setView('favorites')}
                  className={`text-sm font-medium transition-colors ${view === 'favorites' ? 'text-emerald-400' : 'text-white/60 hover:text-white'}`}
                >
                  Favorites
                </button>
              )}
              <div className="h-4 w-[1px] bg-white/10" />
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-white/40 uppercase tracking-widest">{user.role}</p>
                  <p className="text-sm font-medium">{user.username}</p>
                </div>
                <button onClick={handleLogout} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-red-400">
                  <LogOut size={20} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex gap-4">
              <button onClick={() => handleLogin('user')} className="text-sm font-medium text-white/60 hover:text-white transition-colors">User Access</button>
              <button onClick={() => handleLogin('admin')} className="px-4 py-2 bg-white text-black rounded-lg text-sm font-bold hover:bg-emerald-400 transition-all">Admin Portal</button>
            </div>
          )}
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {view === 'landing' && (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-20"
            >
              <h1 className="text-7xl sm:text-9xl font-serif font-bold tracking-tighter mb-8">
                The Future of <br />
                <span className="text-gradient italic">Sound Archives.</span>
              </h1>
              <p className="text-white/40 max-w-2xl mx-auto text-lg mb-12 leading-relaxed">
                A premium, secure environment for music professionals to manage, 
                discover, and curate high-fidelity demo recordings.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={() => handleLogin('user')}
                  className="px-8 py-4 glass hover:bg-white/10 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  <UserIcon size={20} />
                  Enter as Listener
                </button>
                <button 
                  onClick={() => handleLogin('admin')}
                  className="px-8 py-4 bg-emerald-500 text-black hover:bg-emerald-400 rounded-2xl font-bold transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={20} />
                  Admin Control
                </button>
              </div>
            </motion.div>
          )}

          {(view === 'dashboard' || view === 'favorites') && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                  <h2 className="text-4xl font-serif font-bold mb-2">
                    {view === 'favorites' ? 'Your Curated Collection' : 'Global Archives'}
                  </h2>
                  <p className="text-white/40">
                    {view === 'favorites' ? 'A private selection of your favorite demos.' : 'Browse the latest recordings from the vault.'}
                  </p>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search archives..." 
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>
                  
                  <div className="flex glass rounded-xl p-1">
                    <button 
                      onClick={() => setSortOrder('newest')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sortOrder === 'newest' ? 'bg-white/10 text-emerald-400' : 'text-white/40 hover:text-white'}`}
                    >
                      NEWEST
                    </button>
                    <button 
                      onClick={() => setSortOrder('oldest')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sortOrder === 'oldest' ? 'bg-white/10 text-emerald-400' : 'text-white/40 hover:text-white'}`}
                    >
                      OLDEST
                    </button>
                  </div>

                  {user?.role === 'admin' && (
                    <button 
                      onClick={() => {
                        setIsEditing(null);
                        setFormData({ name: '', genre: 'pop' });
                        setSelectedFile(null);
                        setShowAddModal(true);
                      }}
                      className="p-2.5 bg-emerald-500 text-black rounded-xl hover:bg-emerald-400 transition-all shadow-lg"
                    >
                      <Plus size={24} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(view === 'favorites' ? demos.filter(d => favorites.includes(d.id)) : demos).map((demo) => (
                  <motion.div 
                    layout
                    key={demo.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="group relative glass rounded-3xl p-6 hover:border-emerald-500/30 transition-all duration-500"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-black transition-all duration-500">
                        <Music size={24} />
                      </div>
                      <div className="flex gap-2">
                        {user?.role === 'admin' ? (
                          <>
                            <button 
                              onClick={() => {
                                setIsEditing(demo);
                                setFormData({ name: demo.name, genre: demo.genre });
                                setSelectedFile(null);
                                setShowAddModal(true);
                              }}
                              className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-colors"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => deleteDemo(demo.id)}
                              className="p-2 hover:bg-red-500/20 rounded-lg text-white/40 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={() => toggleFavorite(demo.id)}
                            className={`p-2 rounded-lg transition-all ${favorites.includes(demo.id) ? 'text-emerald-400 bg-emerald-400/10' : 'text-white/20 hover:text-white hover:bg-white/5'}`}
                          >
                            <Heart size={20} fill={favorites.includes(demo.id) ? 'currentColor' : 'none'} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em]">{demo.genre}</p>
                      <h3 className="text-xl font-bold truncate">{demo.name}</h3>
                      <p className="text-xs text-white/30 font-mono">ID: {demo.id.toString().padStart(4, '0')} • {new Date(demo.created_at).toLocaleDateString()}</p>
                    </div>

                    <div className="mt-8 flex items-center gap-4">
                      <button 
                        onClick={() => togglePlay(demo.url)}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeAudio === demo.url && isPlaying ? 'bg-emerald-500 text-black' : 'bg-white/5 hover:bg-white/10'}`}
                      >
                        {activeAudio === demo.url && isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                        {activeAudio === demo.url && isPlaying ? 'Playing' : 'Preview'}
                      </button>
                      <a 
                        href={demo.url} 
                        download
                        className="p-3 glass hover:bg-white/10 rounded-xl transition-all"
                      >
                        <ChevronDown className="-rotate-90" size={18} />
                      </a>
                    </div>
                  </motion.div>
                ))}
              </div>

              {demos.length === 0 && (
                <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
                  <p className="text-white/20 font-mono">NO_DATA_FOUND_IN_VAULT</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg glass rounded-[2rem] p-8 shadow-2xl"
            >
              <h2 className="text-3xl font-serif font-bold mb-8">{isEditing ? 'Update Recording' : 'Archive New Demo'}</h2>
              <form onSubmit={handleAddDemo} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Recording Name</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Midnight Sessions Vol. 1"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Genre Classification</label>
                    <select 
                      value={formData.genre}
                      onChange={e => setFormData({...formData, genre: e.target.value as any})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none"
                    >
                      <option value="pop">Pop</option>
                      <option value="folk">Folk</option>
                      <option value="rock">Rock</option>
                      <option value="pop/folk">Pop/Folk</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">MP3 Recording</label>
                    <div className="relative">
                      <input 
                        required={!isEditing}
                        type="file" 
                        accept=".mp3,audio/mpeg"
                        onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="file-upload"
                      />
                      <label 
                        htmlFor="file-upload"
                        className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-2xl py-4 px-6 cursor-pointer hover:bg-white/10 transition-colors truncate"
                      >
                        {selectedFile ? selectedFile.name : (isEditing ? 'Change File' : 'Upload MP3')}
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-4 glass hover:bg-white/10 rounded-2xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-emerald-500 text-black hover:bg-emerald-400 rounded-2xl font-bold transition-all shadow-lg"
                  >
                    {isEditing ? 'Save Changes' : 'Commit to Vault'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} className="hidden" />

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 opacity-40 grayscale">
            <Music size={20} />
            <span className="font-serif text-lg font-bold tracking-tighter">DEMOVAULT</span>
          </div>
          <p className="text-white/20 text-xs font-mono">© 2026 ARCHIVE_PROTOCOL_V4.0 // ALL_RIGHTS_RESERVED</p>
          <div className="flex gap-6 text-white/40 text-xs font-bold uppercase tracking-widest">
            <a href="#" className="hover:text-emerald-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
