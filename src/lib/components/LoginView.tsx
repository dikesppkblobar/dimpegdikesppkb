import React, { useState } from 'react';
import { Shield, Lock, User, Eye, EyeOff, RefreshCw, HelpCircle, FileCheck2, Database } from 'lucide-react';
import { User as UserType } from '../../types';

interface LoginViewProps {
  dbState: {
    users: UserType[];
    puskesmas: any[];
  };
  onLogin: (user: UserType) => void;
  onReset: () => void;
}

export default function LoginView({ dbState, onLogin, onReset }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showHelper, setShowHelper] = useState(true);

  // Helper to find puskesmas name by id
  const getPuskesmasName = (id: number | null) => {
    if (!id) return 'Dinas Kesehatan PPKB';
    if (id === 100) return 'Dinas Kesehatan PPKB';
    const found = dbState.puskesmas.find((p) => p.id === id);
    return found ? found.nama_puskesmas : `Puskesmas Unit #${id}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError('Mohon isi NIP/username dan password Anda.');
      return;
    }

    setIsLoading(true);

    // Simulate standard network delay for beautiful visual feel
    setTimeout(() => {
      const match = dbState.users.find((u) => {
        const checkUsername = (u.nip && u.nip.trim() === username.trim()) || 
                              (u.username && u.username.trim().toLowerCase() === username.trim().toLowerCase());
        return checkUsername;
      });

      if (match) {
        // Standard password is NIP itself, 'admin', or their specified user.password
        const expectedPassword = match.password || match.nip;
        if (password === expectedPassword || password === match.nip || password === 'admin' || password === '123456') {
          onLogin(match);
        } else {
          setError('Sandi/password yang Anda masukkan keliru. Silakan coba lagi.');
          setIsLoading(false);
        }
      } else {
        setError('NIP atau Username tidak terdaftar dalam sistem SAPA.');
        setIsLoading(false);
      }
    }, 600);
  };

  const handleSelectPredefinedUser = (user: UserType) => {
    setUsername(user.nip);
    setPassword(user.nip); // Default password matches NIP
    setError(null);
  };

  return (
    <div id="sapa-login-portal-container" className="min-h-screen bg-[#0d111d] flex flex-col justify-between p-4 sm:p-6 font-sans relative overflow-hidden text-slate-100">
      
      {/* Dynamic Ambient Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-teal-900/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-900/10 blur-[120px] pointer-events-none" />

      {/* Header Info */}
      <div className="max-w-[1200px] mx-auto w-full flex items-center justify-between py-2 border-b border-white/5 opacity-80">
        <div className="flex items-center space-x-2">
          <Shield size={16} className="text-teal-400" />
          <span className="text-[11px] font-mono tracking-wider uppercase text-slate-400">Portal Pengawasan Lombok Barat</span>
        </div>
        <div className="text-[10px] sm:text-[11px] font-mono text-emerald-450 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Sistem Siap Digunakan</span>
        </div>
      </div>

      {/* Main Container Grid */}
      <div className="max-w-[1240px] mx-auto w-full my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center py-6">
        
        {/* Left Side: Brand presentation */}
        <div className="lg:col-span-7 space-y-6 text-left">
          
          {/* Beautiful Official Dinkes Logo vector block */}
          <div className="flex items-center space-x-4">
            <div id="dinkes-vector-logo-container" className="h-16 w-16 bg-white p-2.5 rounded-2xl shadow-xl border border-white/10 flex items-center justify-center shrink-0">
              {/* High-fidelity Vector representation of Dinas Kesehatan Logo (Bakti Husada style) */}
              <svg viewBox="0 0 100 100" className="h-full w-full object-contain">
                {/* Shield Border */}
                <path d="M50 5 L85 20 V65 C85 80 50 95 50 95 C50 95 15 80 15 65 V20 Z" fill="#00875A" />
                <path d="M50 10 L80 23 V63 C80 75 50 88 50 88 C50 88 20 75 20 63 V23 Z" fill="#FFFFFF" />
                {/* Green Star/Cross symbols of health */}
                <circle cx="50" cy="48" r="24" fill="#00875A" />
                <rect x="44" y="32" width="12" height="32" rx="3" fill="#FFFFFF" />
                <rect x="34" y="42" width="32" height="12" rx="3" fill="#FFFFFF" />
                {/* Central circular core */}
                <circle cx="50" cy="48" r="8" fill="#00875A" />
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] bg-teal-500/10 text-teal-400 border border-teal-500/25 px-2.5 py-0.5 rounded-full uppercase font-mono font-extrabold tracking-wide">
                  Dikes PPKB &bull; LOBAR
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 font-display tracking-tight leading-none uppercase">
                SAPA Pegawai
              </h1>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-slate-200">
              Sistem Arsip, Pemberitahuan, & Analisis Kepegawaian Terintegrasi
            </h2>
            <p className="text-slate-400 text-sm sm:text-[14.5px] leading-relaxed">
              Portal administrasi digital terpadu Dinas Kesehatan, Pengendalian Penduduk, dan Keluarga Berencana Kabupaten Lombok Barat. Dirancang khusus untuk mengelola arsip manditori kepegawaian (CPNS/PNS, PPPK, Kontrak), verifikasi STR & SIP berkala, pemantauan riwayat angka kredit, serta visualisasi data SDMK real-time.
            </p>
          </div>

          {/* Key Features Quick badges indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-4">
            <div className="flex items-start space-x-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <FileCheck2 size={18} className="text-teal-400 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Arsip Digital Mandatori</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Perekaman aman SK kepegawaian, berkas penunjang, STR dan SIP kesehatan.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <RefreshCw size={18} className="text-emerald-400 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Sinkronisasi Cloud Supabase</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Sistem cerdas cadangan local-first & sinkronisasi otomatis awan real-time.</p>
              </div>
            </div>
          </div>
          
          <p className="text-slate-500 text-[10px] sm:text-[11px] pt-4 flex items-center gap-1.5 font-mono">
            <span>Kabupaten Lombok Barat &bull; Provinsi Nusa Tenggara Barat</span>
          </p>
        </div>

        {/* Right Side: Login form */}
        <div className="lg:col-span-5">
          <div className="backdrop-blur-md bg-white/[0.03] border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 relative">
            <div>
              <h3 className="text-lg font-bold text-white">Login Masuk Sistem</h3>
              <p className="text-xs text-slate-400 mt-1">Silakan menggunakan kredensial akun pegawat Anda.</p>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-450 font-medium leading-relaxed">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">NIP atau Username</label>
                <div className="relative">
                  <User size={15} className="text-slate-450 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan NIP Anda (contoh: 198004122005011003)"
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all font-mono"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">Sandi / Password</label>
                <div className="relative">
                  <Lock size={15} className="text-slate-450 absolute left-3 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Gunakan NIP sebagai Sandi bawaan"
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-teal-500 transition-all"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-450 hover:text-slate-200 outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white font-extrabold rounded-xl text-xs transition duration-150 shadow-md shadow-teal-900/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Memverifikasi Akun...</span>
                  </>
                ) : (
                  <span>Masuk ke Dashboard</span>
                )}
              </button>
            </form>

            {/* Quick Helper Credentials Picker board */}
            {showHelper && (
              <div className="pt-4 border-t border-white/5 space-y-2.5 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1">
                    <HelpCircle size={11} />
                    <span>Daftar Akun Pengujian SAPA (Instan)</span>
                  </span>
                  <button 
                    onClick={() => setShowHelper(false)} 
                    className="text-[10px] text-slate-500 hover:text-slate-300 font-bold hover:underline"
                  >
                    Sembunyikan
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {dbState.users.map((u) => (
                    <button
                      key={u.id.toString()}
                      onClick={() => handleSelectPredefinedUser(u)}
                      type="button"
                      className={`p-2 rounded-xl border text-left transition text-xs flex justify-between items-center ${
                        username === u.nip 
                          ? 'bg-teal-950/40 border-teal-500/50 text-white' 
                          : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.03] text-slate-350'
                      }`}
                    >
                      <div className="leading-tight">
                        <p className="font-bold text-[11px]">{u.nama_lengkap}</p>
                        <p className="text-[9px] text-slate-450 mt-0.5">NIP: {u.nip}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded-md text-[8.5px] font-bold uppercase bg-slate-900/80 border border-white/5 text-teal-400 block max-w-max ml-auto">
                          {u.role === 'admin_dinkes' ? 'Dinkes' : 'Unit'}
                        </span>
                        <span className="text-[8px] text-slate-500 block mt-0.5">{getPuskesmasName(u.id_puskesmas)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Emergency clean reset feature on login box */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[9px] text-slate-500">Layanan SAPA &bull; Lombok Barat NTB</span>
              <button
                type="button"
                onClick={onReset}
                className="text-[9.5px] text-amber-500/80 hover:text-amber-400 font-bold hover:underline flex items-center space-x-1 border border-amber-500/20 hover:border-amber-500/40 px-2 py-1 rounded bg-amber-500/5 cursor-pointer transition-all"
              >
                <RefreshCw size={10} className="mr-0.5 animate-hover" />
                <span>Reset Database</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Footer copyright section */}
      <div className="max-w-[1200px] mx-auto w-full text-center text-slate-600 text-[10.5px] py-2 border-t border-white/5 mt-auto opacity-70">
        <p>SAPA pegawai Dikes PPKB v1.0.0 &bull; Sistem Pendukung Keputusan & Manajemen Kepegawaian Sehat Terintegrasi</p>
        <p className="mt-0.5">Dinas Kesehatan Pengendalian Penduduk dan Keluarga Berencana Kabupaten Lombok Barat &copy; 2026. All rights reserved.</p>
      </div>

    </div>
  );
}
