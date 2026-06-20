import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Users, 
  Heart, 
  Baby, 
  AlertTriangle, 
  CheckCircle2, 
  FileCheck, 
  Search, 
  Building2, 
  Sliders, 
  FileDown, 
  DollarSign 
} from 'lucide-react';
import { ASNProfile, KP4Anak } from '../../types';

interface DashboardKP4Props {
  currentRole: 'admin_dinkes' | 'admin_puskesmas';
  selectedPuskesmasId: number;
  puskesmasList: { id: number; nama: string }[];
  asnProfiles: ASNProfile[];
  onEditEmployee: (employee: ASNProfile) => void;
}

export default function DashboardKP4({
  currentRole,
  selectedPuskesmasId,
  puskesmasList,
  asnProfiles,
  onEditEmployee
}: DashboardKP4Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [unitFilter, setUnitFilter] = useState<number | 'ALL'>(
    currentRole === 'admin_dinkes' ? 'ALL' : selectedPuskesmasId
  );
  const [statusWarnFilter, setStatusWarnFilter] = useState<'ALL' | 'WARNING_ONLY' | 'CLEAN_ONLY'>('ALL');

  // get Puskesmas Name Helper
  const getPuskesmasName = (id: number) => {
    return puskesmasList.find(p => p.id === id)?.nama || `Puskesmas ID ${id}`;
  };

  // 2026 Fixed budget simulation based on approximate PNS/PPPK base salary
  const getEstimatedBaseSalary = (profile: ASNProfile) => {
    if (profile.status_pegawai_detail === 'PNS') {
      // standard Gapok III/a - IV/b approximation
      if (profile.golongan_ruang?.startsWith('IV')) return 4200000;
      if (profile.golongan_ruang?.startsWith('III')) return 3200000;
      if (profile.golongan_ruang?.startsWith('II')) return 2400000;
      return 2800000;
    } else {
      // PPPK salary approximation
      return 3000000;
    }
  };

  // Helper audit calculations for single profile
  const auditASNProfile = (asn: ASNProfile) => {
    const issues: { type: 'ERROR' | 'WARNING'; message: string; code: string; potentialFine: number }[] = [];
    if (asn.status_pegawai_detail === 'Non_ASN') return { isClean: true, issues, spouseClaimed: false, childrenClaimedCount: 0, estimatedAllowance: 0 };

    const baseSalary = getEstimatedBaseSalary(asn);
    let spouseAllowance = 0;
    let kidsAllowance = 0;

    // A. Spouse check
    const spouseClaimed = asn.kp4_status_pernikahan === 'Kawin' && asn.kp4_pasangan_tunjangan_diklaim;
    if (spouseClaimed) {
      spouseAllowance = baseSalary * 0.10; // 10% marriage allowance
      // BPK Violation if Partner is also ASN and allowance claimed
      if (asn.kp4_pasangan_asn) {
        issues.push({
          type: 'ERROR',
          code: 'DOUBLE_ASN_CLAIM',
          message: `Pasangan sesama ASN diklaim tunjangannya oleh PNS bersangkutan (${asn.kp4_nama_pasangan || 'Tanpa Nama'} - ASN). Beresiko temuan audit ganda (Double-funding).`,
          potentialFine: spouseAllowance * 12 // 1 year fine simulation
        });
      }
    }

    // B. Outdated KP4 year
    const validationYear = asn.kp4_tahun_validasi || 0;
    if (validationYear && validationYear < 2026) {
      issues.push({
        type: 'WARNING',
        code: 'OUTDATED_KP4',
        message: `Berkas KP4 kedaluwarsa (Tahun ${validationYear}). Wajib diperbarui ke Tahun Anggaran berjalan 2026 untuk meminimalisir temuan administratif BPK.`,
        potentialFine: 0
      });
    } else if (!asn.kp4_tanggal_validasi) {
      issues.push({
        type: 'WARNING',
        code: 'MISSING_DATE',
        message: 'Tanggal pengesahan KP4 kosong atau berkas fisik belum diverifikasi.',
        potentialFine: 0
      });
    }

    // C. Scan file check
    if (!asn.kp4_berkas_file_name) {
      issues.push({
        type: 'WARNING',
        code: 'NO_PHYSICAL_SCAN',
        message: 'Scan formulir KP4 asli (Model DK) fisik belum terunggah untuk pembuktian tanda tangan Kepala Unit.',
        potentialFine: 0
      });
    }

    // D. Children checks
    let childList: KP4Anak[] = [];
    try {
      childList = JSON.parse(asn.kp4_daftar_anak || '[]');
    } catch (e) {
      childList = [];
    }

    const claimedChildren = childList.filter(c => c.tunjangan_diklaim);
    const claimedCount = claimedChildren.length;

    // PP 51/1992: Limit max 2 children allowance
    if (claimedCount > 2) {
      issues.push({
        type: 'ERROR',
        code: 'EXCESSIVE_KIDS_LIMIT',
        message: `Jumlah klaim anak tertanggung (${claimedCount} anak) melebihi batas regulasi PP 51/1992 (Maksimal 2 Anak). Pengeluaran kas daerah kelebihan ${claimedCount - 2} anak.`,
        potentialFine: (baseSalary * 0.02) * (claimedCount - 2) * 12
      });
    }

    childList.forEach(child => {
      let age = 0;
      if (child.tanggal_lahir) {
        const birthYear = new Date(child.tanggal_lahir).getFullYear();
        age = 2026 - birthYear; // system simulation calendar year 2026
      }

      if (child.tunjangan_diklaim) {
        kidsAllowance += baseSalary * 0.02; // 2% per child

        const childBenefit = baseSalary * 0.02;

        // Age > 25 (strict forbidden)
        if (age > 25) {
          issues.push({
            type: 'ERROR',
            code: 'CHILD_OVERAGE_25',
            message: `Anak "${child.nama}" berumur ${age} Tahun (Melebihi batas absolut 25 tahun PP 7/1977). Tunjangan wajib dihentikan segera!`,
            potentialFine: childBenefit * 12
          });
        }
        // Age 21-25 (special check: must be active student with SKKS)
        else if (age >= 21) {
          if (child.status_sekolah !== 'Sekolah/Kuliah') {
            issues.push({
              type: 'ERROR',
              code: 'CHILD_NOT_STUDENT',
              message: `Anak "${child.nama}" berumur kuliah (${age} Tahun) tetapi status tertulis: "${child.status_sekolah}". Tidak berhak menerima tunjangan keluarga karena diasumsikan bekerja/mandiri.`,
              potentialFine: childBenefit * 12
            });
          } else if (!child.has_skks) {
            issues.push({
              type: 'WARNING',
              code: 'CHILD_MISSING_SKKS',
              message: `Anak "${child.nama}" kuliah (${age} Tahun) tetapi Surat Keterangan Kuliah Aktif (SKKS) tahun berjalan belum terlampir. Beresiko tinggi menjadi temuan sampling BPK.`,
              potentialFine: 0
            });
          }
        }

        // Status Pekerjaan / Menikah
        if (child.status_sekolah === 'Bekerja' || child.status_sekolah === 'Menikah') {
          issues.push({
            type: 'ERROR',
            code: 'CHILD_INELIGIBLE_STATUS',
            message: `Anak "${child.nama}" status sudah Menikah/Bekerja. Secara administratif gugur hak tunjangannya sesuai UU Gaji Pegawai BKN.`,
            potentialFine: childBenefit * 12
          });
        }
      }
    });

    const isClean = issues.length === 0;
    const totalPotentialFine = issues.reduce((acc, iss) => acc + iss.potentialFine, 0);

    return {
      isClean,
      issues,
      spouseClaimed,
      childrenClaimedCount: claimedCount,
      estimatedAllowance: spouseAllowance + (Math.min(claimedCount, 2) * (baseSalary * 0.02)),
      totalPotentialFine
    };
  };

  // Filter & Audit Profiles
  const rawAsnList = asnProfiles.filter(p => {
    if (p.status_pegawai_detail === 'Non_ASN') return false; // Only ASN
    
    // Multi-tenant isolation: Units only see their own, Dinkes sees all
    if (currentRole !== 'admin_dinkes' && p.id_puskesmas !== selectedPuskesmasId) {
      return false;
    }
    
    if (unitFilter !== 'ALL' && p.id_puskesmas !== unitFilter) {
      return false;
    }

    const matchesSearch = p.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.nip.includes(searchTerm) || 
                          (p.nik || '').includes(searchTerm);

    return matchesSearch;
  });

  const auditedList = rawAsnList.map(asn => {
    const audit = auditASNProfile(asn);
    return {
      asn,
      ...audit
    };
  });

  const finalFilteredList = auditedList.filter(item => {
    if (statusWarnFilter === 'WARNING_ONLY') return !item.isClean;
    if (statusWarnFilter === 'CLEAN_ONLY') return item.isClean;
    return true;
  });

  // Global calculations
  const totalASN = asnProfiles.filter(p => {
    if (p.status_pegawai_detail === 'Non_ASN') return false;
    if (currentRole !== 'admin_dinkes' && p.id_puskesmas !== selectedPuskesmasId) return false;
    return true;
  }).length;

  const totalWarnings = auditedList.reduce((acc, item) => acc + item.issues.length, 0);
  const totalErrors = auditedList.reduce((acc, item) => acc + item.issues.filter(i => i.type === 'ERROR').length, 0);
  const totalClean = auditedList.filter(item => item.isClean).length;
  const complianceRate = totalASN > 0 ? Math.round((totalClean / totalASN) * 100) : 100;
  
  const estimatedAllowanceSum = auditedList.reduce((acc, item) => acc + item.estimatedAllowance, 0);
  const totalPotentialFineSum = auditedList.reduce((acc, item) => acc + item.totalPotentialFine, 0);

  // Group Issues by categories for audit monitoring panel
  const groupCount = {
    DOUBLE_ASN_CLAIM: 0,
    OUTDATED_KP4: 0,
    EXCESSIVE_KIDS_LIMIT: 0,
    CHILD_OVERAGE_25: 0,
    CHILD_MISSING_SKKS: 0,
  };

  auditedList.forEach(item => {
    item.issues.forEach(issue => {
      if (issue.code in groupCount) {
        groupCount[issue.code as keyof typeof groupCount]++;
      }
    });
  });

  return (
    <div className="space-y-6 text-slate-800 animate-in fade-in duration-200">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/40 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-display font-bold text-white">
              Sistem Analisa KP4 &amp; Model DK ASN
            </h2>
            <span className="bg-rose-500/10 text-rose-400 font-mono text-[10px] px-2 py-0.5 rounded border border-rose-500/20 font-bold block">
              BPK Anti-Finding Engine v2.6
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {currentRole === 'admin_dinkes' 
              ? 'Panel Pengawasan Dinas Kesehatan Lombok Barat - Integrasi Data KP4 Terbuka dan Simulasi Validasi BPK.' 
              : `Pengawasan Internal ${getPuskesmasName(selectedPuskesmasId)} - Validasi Data Tunjangan Keluarga.`}
          </p>
        </div>

        {/* Export report button mockup */}
        <button
          onClick={() => alert("✓ Mengunduh Lembar Analisa Kepatuhan KP4 Lombok Barat Format XLSX untuk Auditor BPK...")}
          className="px-4 py-2 bg-[#1b1c21] hover:bg-slate-800 text-slate-200 border border-white/5 font-semibold text-xs rounded-xl flex items-center space-x-2 transition p-3 cursor-pointer shadow-sm"
        >
          <FileDown size={14} className="text-rose-400" />
          <span>Sertifikat Audit KP4 (XLSX)</span>
        </button>
      </div>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Compliance */}
        <div className="bg-[#16161a] border border-white/5 rounded-2xl p-4 md:p-5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider block">Kepatuhan Berkas</span>
            <span className="text-2xl font-mono font-extrabold text-white block">{complianceRate}%</span>
            <span className="text-[10.5px] text-slate-500 font-medium block">
              {totalClean} dr {totalASN} ASN Bersih Audit
            </span>
          </div>
          <div className={`h-11 w-11 rounded-full flex items-center justify-center ${complianceRate > 90 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
            <CheckCircle2 size={20} />
          </div>
        </div>

        {/* Card 2: BPK Warnings */}
        <div className="bg-[#16161a] border border-white/5 rounded-2xl p-4 md:p-5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider block">Resiko Temuan</span>
            <span className="text-2xl font-mono font-extrabold text-rose-500 block">
              {totalWarnings} <span className="text-xs font-normal text-slate-400">Temuan</span>
            </span>
            <span className="text-[10.5px] text-slate-500 font-medium block">
              <span className="text-red-400 font-bold">{totalErrors} Mayor</span>, {totalWarnings - totalErrors} Minor (Administratif)
            </span>
          </div>
          <div className="h-11 w-11 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <ShieldAlert size={20} />
          </div>
        </div>

        {/* Card 3: Budget claimed */}
        <div className="bg-[#16161a] border border-white/5 rounded-2xl p-4 md:p-5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider block">Estimasi Beban Tunjangan</span>
            <span className="text-xl font-mono font-extrabold text-teal-400 block">
              Rp {estimatedAllowanceSum.toLocaleString('id-ID')}
            </span>
            <span className="text-[10.5px] text-slate-500 font-medium block">
              Tunjangan Suami/Istri &amp; Anak / Bulan
            </span>
          </div>
          <div className="h-11 w-11 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center">
            <DollarSign size={20} />
          </div>
        </div>

        {/* Card 4: Potential recovery audit */}
        <div className="bg-[#16161a] border border-white/5 rounded-2xl p-4 md:p-5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider block">Potensi TGR (Setor Balik)</span>
            <span className="text-xl font-mono font-extrabold text-amber-500 block">
              Rp {totalPotentialFineSum.toLocaleString('id-ID')}
            </span>
            <span className="text-[10.5px] text-slate-500 font-medium block">
              Risiko Pengembalian Kas per Tahun (12 bln)
            </span>
          </div>
          <div className="h-11 w-11 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <AlertTriangle size={20} />
          </div>
        </div>
      </div>

      {/* BPK Rules Protective Indicators Summary */}
      <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-5 space-y-4">
        <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center space-x-2">
          <span>📋</span>
          <span>Proteksi Temuan BPK: Indikator Peringatan Aktif</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="p-3 bg-[#111115] border border-white/5 rounded-xl space-y-1">
            <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Ganda Suami/Istri</span>
            <div className="flex justify-between items-baseline">
              <span className="text-lg font-mono font-extrabold text-yellow-400">{groupCount.DOUBLE_ASN_CLAIM} Orang</span>
              <span className="text-[9px] text-rose-500 font-bold bg-rose-500/10 px-1 py-0.2 rounded border border-rose-500/20">Double ASN</span>
            </div>
            <p className="text-[9px] text-slate-500">Pasangan sesama ASN dilarang saling klaim tunjangan</p>
          </div>

          <div className="p-3 bg-[#111115] border border-white/5 rounded-xl space-y-1">
            <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Kedaluwarsa KP4</span>
            <div className="flex justify-between items-baseline">
              <span className="text-lg font-mono font-extrabold text-white">{groupCount.OUTDATED_KP4} Berkas</span>
              <span className="text-[9px] text-amber-500 font-bold bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20">Lama</span>
            </div>
            <p className="text-[9px] text-slate-500">Wajib update berkas tahun berjalan (Tahun 2026)</p>
          </div>

          <div className="p-3 bg-[#111115] border border-white/5 rounded-xl space-y-1">
            <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Melebihi Batas Usia</span>
            <div className="flex justify-between items-baseline">
              <span className="text-lg font-mono font-extrabold text-red-500">{groupCount.CHILD_OVERAGE_25} Anak</span>
              <span className="text-[9px] text-red-500 font-bold bg-red-500/10 px-1 py-0.2 rounded border border-red-500/20">&gt;25 Th</span>
            </div>
            <p className="text-[9px] text-slate-500">Anak di atas 25 tahun gugur hak secara undang-undang</p>
          </div>

          <div className="p-3 bg-[#111115] border border-white/5 rounded-xl space-y-1">
            <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Anak Absen SKKS</span>
            <div className="flex justify-between items-baseline">
              <span className="text-lg font-mono font-extrabold text-yellow-400">{groupCount.CHILD_MISSING_SKKS} Anak</span>
              <span className="text-[9px] text-yellow-500 font-bold bg-yellow-500/10 px-1 py-0.2 rounded border border-yellow-500/20">No SKKS</span>
            </div>
            <p className="text-[9px] text-slate-500">Anak kuliah (21-25 Th) wajib melampirkan SKKS aktif</p>
          </div>

          <div className="p-3 bg-[#111115] border border-white/5 rounded-xl space-y-1">
            <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Melebihi 2 Anak</span>
            <div className="flex justify-between items-baseline">
              <span className="text-lg font-mono font-extrabold text-red-500">{groupCount.EXCESSIVE_KIDS_LIMIT} Orang</span>
              <span className="text-[9px] text-red-500 font-bold bg-red-500/10 px-1 py-0.2 rounded border border-red-500/20">Max 2</span>
            </div>
            <p className="text-[9px] text-slate-500">Regulasi PP 51/1992 melarang klaim di atas 2 anak</p>
          </div>
        </div>
      </div>

      {/* Main Filter & Table area */}
      <div className="bg-[#16161a] border border-white/5 rounded-2xl p-6 space-y-4">
        
        {/* Navigation & Search toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Cari Nama / NIP / NIK..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 p-2 pl-8 border border-white/5 bg-[#1b1c21] text-xs text-white rounded-xl focus:ring-1 focus:ring-teal-500 outline-none transition"
              />
              <Search size={13} className="absolute left-2.5 top-3 text-slate-500" />
            </div>

            {/* Unit Tenant Filter (only for Dinkes) */}
            {currentRole === 'admin_dinkes' && (
              <div className="flex items-center space-x-2">
                <Building2 size={13} className="text-slate-400" />
                <select
                  value={unitFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUnitFilter(val === 'ALL' ? 'ALL' : parseInt(val));
                  }}
                  className="p-2 border border-white/5 bg-[#1b1c21] text-xs text-white rounded-xl focus:ring-1 focus:ring-teal-500 outline-none transition font-semibold"
                >
                  <option value="ALL">Semua Unit Kerja Lombok Barat</option>
                  {puskesmasList.map(p => (
                    <option key={p.id} value={p.id}>{p.nama}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Audit Status Filter */}
            <select
              value={statusWarnFilter}
              onChange={(e) => setStatusWarnFilter(e.target.value as any)}
              className="p-2 border border-white/5 bg-[#1b1c21] text-xs text-white rounded-xl focus:ring-1 focus:ring-teal-500 outline-none transition font-semibold"
            >
              <option value="ALL">Semua Hasil Audit</option>
              <option value="WARNING_ONLY">⚠️ Butuh Perhatian (Telah Terdeteksi Issue BPK)</option>
              <option value="CLEAN_ONLY">✓ Bebas Mayor &amp; Minor (Layak BPK)</option>
            </select>
          </div>

          <div className="text-xs text-slate-400">
            Menampilkan <strong className="text-white">{finalFilteredList.length}</strong> Pegawai ASN
          </div>
        </div>

        {/* Table Employee KP4 list */}
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#1c1d24] text-slate-400 font-bold border-b border-white/5 uppercase tracking-wider text-[10px]">
                <th className="p-3">Pegawai / Identitas</th>
                <th className="p-3">Puskesmas Unit</th>
                <th className="p-3">Status Klaim KP4</th>
                <th className="p-3">Estimasi Tunjangan</th>
                <th className="p-3">Hasil Audit Anti-BPK</th>
                <th className="p-3 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-transparent text-slate-300">
              {finalFilteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 italic">
                    Tidak ditemukan data pegawai ASN yang cocok dengan filter penelusuran.
                  </td>
                </tr>
              ) : (
                finalFilteredList.map((item) => {
                  const { asn, isClean, issues, spouseClaimed, childrenClaimedCount, estimatedAllowance, totalPotentialFine } = item;
                  return (
                    <tr key={asn.id} className="hover:bg-white/[0.02] transition">
                      <td className="p-3">
                        <p className="font-bold text-white text-xs">{asn.nama_lengkap}{asn.gelar_belakang ? `, ${asn.gelar_belakang}` : ''}</p>
                        <p className="text-[10px] text-slate-400 font-mono">NIP. {asn.nip}</p>
                        <p className="text-[10px] text-slate-500 font-mono">NIK. {asn.nik || 'Belum Diisi'}</p>
                      </td>
                      <td className="p-3 font-semibold text-slate-400">
                        {getPuskesmasName(asn.id_puskesmas)}
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold block w-fit ${
                            asn.kp4_status_pernikahan === 'Kawin' 
                              ? 'bg-emerald-500/10 text-emerald-400' 
                              : 'bg-slate-500/10 text-slate-400'
                          }`}>
                            {asn.kp4_status_pernikahan || 'Belum Kawin'}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            Tunjangan: {spouseClaimed ? 'Suami/Istri (✓)' : 'Suami/Istri (✗)'} &amp; {childrenClaimedCount} Anak
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            KP4 Validasi: <span className="font-mono text-slate-400">{asn.kp4_tahun_validasi || 'Belum'}</span>
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <p className="font-mono font-bold text-teal-400">Rp {estimatedAllowance.toLocaleString('id-ID')}</p>
                        <p className="text-[9px] text-slate-500">Estimasi Tunjangan/bln</p>
                      </td>
                      <td className="p-3">
                        {isClean ? (
                          <div className="flex items-center space-x-1.5 text-emerald-400 text-[11px] font-bold">
                            <CheckCircle2 size={14} />
                            <span>100% Layak Audit (Bersih)</span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1.5 text-amber-400 text-[11px] font-bold">
                              <AlertTriangle size={14} className="flex-shrink-0" />
                              <span>{issues.length} Risiko Temuan BPK</span>
                            </div>
                            
                            <ul className="list-disc pl-3 text-[10px] text-rose-300 space-y-0.5 max-w-sm line-clamp-2 hover:line-clamp-none transition">
                              {issues.map((i, idx) => (
                                <li key={idx} className={i.type === 'ERROR' ? 'text-red-300 font-medium' : 'text-amber-200'}>
                                  {i.message}
                                </li>
                              ))}
                            </ul>

                            {totalPotentialFine > 0 && (
                              <p className="text-[10px] text-red-400 font-semibold bg-rose-500/10 px-1 rounded block w-fit">
                                Potensi TGR: Rp {totalPotentialFine.toLocaleString('id-ID')}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => onEditEmployee(asn)}
                          className="px-2.5 py-1.5 bg-teal-800 hover:bg-teal-700 text-white rounded-lg text-[10px] font-bold transition flex items-center space-x-1 mx-auto cursor-pointer"
                        >
                          <Sliders size={12} />
                          <span>Sesuaikan data</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
