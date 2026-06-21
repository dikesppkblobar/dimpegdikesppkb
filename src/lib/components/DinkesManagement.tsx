/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  FileText, 
  Sliders, 
  Image as ImageIcon,
  Plus, 
  Trash2, 
  Check, 
  X, 
  Edit3, 
  Shield, 
  FileCheck,
  AlertCircle,
  HelpCircle,
  Link,
  Database,
  RefreshCw,
  Terminal,
  Copy,
  Globe,
  CheckSquare
} from 'lucide-react';
import { 
  Puskesmas, 
  MasterFitur, 
  MasterDokumen, 
  User, 
  RoleType 
} from '../../types';
import { 
  testSupabaseConnection, 
  pushClientDataToSupabase, 
  pullCloudDataFromSupabase, 
  SUPABASE_URL,
  SUPABASE_SQL_SCHEMA
} from '../supabase';

interface DinkesManagementProps {
  puskesmasList: Puskesmas[];
  featuresList: MasterFitur[];
  documentsList: MasterDokumen[];
  syaratFiturMap: Record<string, number[]>;
  usersList: User[];
  logoUrl: string;
  faviconUrl: string;
  onUpdateFeaturesList: (updated: MasterFitur[]) => void;
  onUpdateDocumentsList: (updated: MasterDokumen[]) => void;
  onUpdateSyaratFiturMap: (updated: Record<string, number[]>) => void;
  onUpdateUsersList: (updated: User[]) => void;
  onUpdateBranding: (logo: string, favicon: string) => void;
  onUpdatePuskesmasList?: (updated: Puskesmas[]) => void;
  dbState?: any;
  onUpdateDbState?: (updatedState: any) => void;
}

export default function DinkesManagement({
  puskesmasList,
  featuresList,
  documentsList,
  syaratFiturMap,
  usersList,
  logoUrl,
  faviconUrl,
  onUpdateFeaturesList,
  onUpdateDocumentsList,
  onUpdateSyaratFiturMap,
  onUpdateUsersList,
  onUpdateBranding,
  onUpdatePuskesmasList,
  dbState,
  onUpdateDbState
}: DinkesManagementProps) {

  const [activeMgtTab, setActiveMgtTab] = useState<'users' | 'documents' | 'features' | 'branding' | 'units' | 'supabase'>('users');

  // Supabase states
  const [supabaseLoading, setSupabaseLoading] = useState(false);
  const [supabaseTestResult, setSupabaseTestResult] = useState<{ success: boolean; message: string; mode: string } | null>(null);
  const [supabaseLogs, setSupabaseLogs] = useState<string[]>(['Sistem monitoring Supabase Lombok Barat siap digunakan...']);
  const [copydone, setCopydone] = useState(false);

  useEffect(() => {
    if (activeMgtTab === 'supabase') {
      handleTestConnection();
    }
  }, [activeMgtTab]);

  const handleTestConnection = async () => {
    setSupabaseLoading(true);
    try {
      const res = await testSupabaseConnection();
      setSupabaseTestResult(res);
      setSupabaseLogs(prev => [...prev, `[TEST KONEKSI] ${res.message}`]);
    } catch (e: any) {
      setSupabaseTestResult({ success: false, message: e?.message || String(e), mode: "ERROR" });
    } finally {
      setSupabaseLoading(false);
    }
  };

  const handleManualPush = async () => {
    if (!dbState) {
      alert("Database state kosong atau tidak terdefinisi.");
      return;
    }
    setSupabaseLoading(true);
    setSupabaseLogs(prev => [...prev, `⏳ [PUSH] Memulai sinkronisasi seluruh data lokal ke cloud Supabase...`]);
    try {
      const res = await pushClientDataToSupabase(dbState);
      if (res.log && res.log.length > 0) {
        setSupabaseLogs(prev => [...prev, ...res.log]);
      }
      if (res.success) {
        alert("✓ Sukses Sinkronisasi Push! Semua data lokal Anda telah di-upload ke Supabase Cloud dan siap diakses langsung.");
      } else {
        alert("⚠️ Gagal Sinkronisasi Push. Silakan periksa log terminal di bawah untuk rincian error SQL.");
      }
    } catch (e: any) {
      setSupabaseLogs(prev => [...prev, `❌ Error fatal push: ${e?.message || e}`]);
    } finally {
      setSupabaseLoading(false);
    }
  };

  const handleManualPull = async () => {
    if (!onUpdateDbState) {
      alert("Sistem state manager induk tidak mendukung sinkronisasi.");
      return;
    }
    setSupabaseLoading(true);
    setSupabaseLogs(prev => [...prev, `⏳ [PULL] Memulai penarikan data live dari Supabase...`]);
    try {
      const res = await pullCloudDataFromSupabase();
      if (res.log && res.log.length > 0) {
        setSupabaseLogs(prev => [...prev, ...res.log]);
      }
      if (res.success && res.data) {
        onUpdateDbState(res.data);
        alert("⚡ Sukses Sinkronisasi Pull! Seluruh data live dari Supabase ditarik dan menggantikan state lokal Anda.");
      } else {
        alert("⚠️ Gagal Sinkronisasi Pull. Silakan periksa apakah tabel-tabel di Supabase sudah siap.");
      }
    } catch (e: any) {
      setSupabaseLogs(prev => [...prev, `❌ Error fatal pull: ${e?.message || e}`]);
    } finally {
      setSupabaseLoading(false);
    }
  };

  // Custom confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    warningMessage?: string;
    onConfirm: () => void;
  } | null>(null);

  // Success and warning toast notification state
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Auto-clear toast after 5 seconds
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => {
        setSuccessToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  // ------- 5. MANAJEMEN UNIT KERJA STATES & ACTION -------
  const [newUnitKode, setNewUnitKode] = useState('');
  const [newUnitNama, setNewUnitNama] = useState('');
  const [newUnitAlamat, setNewUnitAlamat] = useState('');
  const [editingUnitId, setEditingUnitId] = useState<number | null>(null);
  const [editingUnitKode, setEditingUnitKode] = useState('');
  const [editingUnitNama, setEditingUnitNama] = useState('');
  const [editingUnitAlamat, setEditingUnitAlamat] = useState('');

  const handleCreateUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitKode.trim() || !newUnitNama.trim()) return;
    if (onUpdatePuskesmasList) {
      const nextId = puskesmasList.length > 0 ? Math.max(...puskesmasList.map(p => p.id)) + 1 : 1;
      const newUnit: Puskesmas = {
        id: nextId,
        kode_puskesmas: newUnitKode.trim(),
        nama_puskesmas: newUnitNama.trim(),
        alamat: newUnitAlamat.trim() || 'Lombok Barat'
      };
      onUpdatePuskesmasList([...puskesmasList, newUnit]);
      setNewUnitKode('');
      setNewUnitNama('');
      setNewUnitAlamat('');
      alert(`✓ Unit Kerja "${newUnit.nama_puskesmas}" berhasil ditambahkan!`);
    } else {
      alert("Sistem database unit tidak dapat diakses.");
    }
  };

  const handleUpdateUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnitKode.trim() || !editingUnitNama.trim() || editingUnitId === null) return;
    if (onUpdatePuskesmasList) {
      const updated = puskesmasList.map(p => p.id === editingUnitId ? {
        ...p,
        kode_puskesmas: editingUnitKode.trim(),
        nama_puskesmas: editingUnitNama.trim(),
        alamat: editingUnitAlamat.trim()
      } : p);
      onUpdatePuskesmasList(updated);
      setEditingUnitId(null);
      setEditingUnitKode('');
      setEditingUnitNama('');
      setEditingUnitAlamat('');
      alert(`✓ Informasi Unit Kerja berhasil diperbarui.`);
    }
  };

  const handleDeleteUnit = (id: number, nama: string) => {
    if (id === 1 || id === 100) {
      setSuccessToast("❌ Unit kerja induk utama (Dikes PPKB) tidak boleh dihapus untuk mencegah kegagalan sistem.");
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: "Konfirmasi Hapus Unit Kerja",
      message: `Apakah Anda yakin ingin menghapus unit kerja "${nama}" secara permanen?`,
      warningMessage: "Semua pengguna dan data pegawai terkait unit kerja ini akan terpengaruh.",
      onConfirm: () => {
        if (onUpdatePuskesmasList) {
          const updated = puskesmasList.filter(p => p.id !== id);
          onUpdatePuskesmasList(updated);
          setSuccessToast(`✓ Unit kerja "${nama}" berhasil dihapus dari sistem.`);
        }
      }
    });
  };

  // ------- 1. MANAJEMEN PENGGUNA STATES & ACTION -------
  const [newUserNip, setNewUserNip] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<RoleType>('admin_puskesmas');
  const [newUserPuskesmasId, setNewUserPuskesmasId] = useState<number>(1);
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserWa, setNewUserWa] = useState('');

  // Edit states for user CRUD
  const [editingUserId, setEditingUserId] = useState<number | bigint | null>(null);
  const [editingUserNip, setEditingUserNip] = useState('');
  const [editingUserName, setEditingUserName] = useState('');
  const [editingUserRole, setEditingUserRole] = useState<RoleType>('admin_puskesmas');
  const [editingUserPuskesmasId, setEditingUserPuskesmasId] = useState<number>(1);
  const [editingUserUsername, setEditingUserUsername] = useState('');
  const [editingUserPassword, setEditingUserPassword] = useState('');
  const [editingUserWa, setEditingUserWa] = useState('');

  const handleStartEditUser = (user: User) => {
    setEditingUserId(user.id);
    setEditingUserNip(user.nip);
    setEditingUserName(user.nama_lengkap);
    setEditingUserRole(user.role);
    setEditingUserPuskesmasId(user.id_puskesmas || 1);
    setEditingUserUsername(user.username || '');
    setEditingUserPassword(user.password || '');
    setEditingUserWa(user.nomor_wa || '');
  };

  const handleCancelEditUser = () => {
    setEditingUserId(null);
    setEditingUserNip('');
    setEditingUserName('');
    setEditingUserUsername('');
    setEditingUserPassword('');
    setEditingUserWa('');
  };

  const handleSaveUserEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserNip || !editingUserName) return;

    const updated = usersList.map(u => {
      if (u.id === editingUserId) {
        return {
          ...u,
          nip: editingUserNip,
          nama_lengkap: editingUserName,
          role: editingUserRole,
          id_puskesmas: editingUserRole === 'admin_dinkes' ? null : editingUserPuskesmasId,
          username: editingUserUsername || undefined,
          password: editingUserPassword || undefined,
          nomor_wa: editingUserWa || undefined
        };
      }
      return u;
    });

    onUpdateUsersList(updated);
    setEditingUserId(null);
    setEditingUserNip('');
    setEditingUserName('');
    setEditingUserUsername('');
    setEditingUserPassword('');
    setEditingUserWa('');
    alert("✓ Data pengguna berhasil diperbarui!");
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserNip || !newUserName) return;

    const nextId = usersList.length > 0 ? Math.max(...usersList.map(u => Number(u.id))) + 1 : 1;
    const newUser: User = {
      id: nextId,
      nip: newUserNip,
      nama_lengkap: newUserName,
      role: newUserRole,
      id_puskesmas: newUserRole === 'admin_dinkes' ? null : newUserPuskesmasId,
      username: newUserUsername || undefined,
      password: newUserPassword || undefined,
      nomor_wa: newUserWa || undefined
    };

    onUpdateUsersList([...usersList, newUser]);
    setNewUserNip('');
    setNewUserName('');
    setNewUserUsername('');
    setNewUserPassword('');
    setNewUserWa('');
    alert("✓ Pengguna berhasil ditambahkan!");
  };

  const handleDeleteUser = (id: number | bigint) => {
    const usr = usersList.find(u => u.id === id);
    const userName = usr ? usr.nama_lengkap : "pengguna";
    setConfirmDialog({
      isOpen: true,
      title: "Konfirmasi Hapus Pengguna",
      message: `Apakah anda yakin ingin menghapus pengguna "${userName}"?`,
      warningMessage: "Pengguna ini tidak akan dapat login lagi ke sistem Simpeg.",
      onConfirm: () => {
        onUpdateUsersList(usersList.filter(u => u.id !== id));
        setSuccessToast(`✓ Pengguna "${userName}" berhasil dihapus.`);
      }
    });
  };


  // ------- 2. MANAJEMEN DOKUMEN STATES & ACTION -------
  const [newDocName, setNewDocName] = useState('');
  const [newDocKeywords, setNewDocKeywords] = useState('');
  const [selectedFiturForDocs, setSelectedFiturForDocs] = useState<string>('kenaikan-pangkat');

  // Edit states for document CRUD
  const [editingDocId, setEditingDocId] = useState<number | null>(null);
  const [editingDocName, setEditingDocName] = useState('');
  const [editingDocKeywords, setEditingDocKeywords] = useState('');

  const handleStartEditDoc = (doc: MasterDokumen) => {
    setEditingDocId(doc.id);
    setEditingDocName(doc.nama_dokumen);
    setEditingDocKeywords(doc.kata_kunci_ocr);
  };

  const handleCancelEditDoc = () => {
    setEditingDocId(null);
    setEditingDocName('');
    setEditingDocKeywords('');
  };

  const handleSaveDocEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDocName) return;

    const updated = documentsList.map(d => {
      if (d.id === editingDocId) {
        return {
          ...d,
          nama_dokumen: editingDocName,
          kata_kunci_ocr: editingDocKeywords || "DOKUMEN"
        };
      }
      return d;
    });

    onUpdateDocumentsList(updated);
    setEditingDocId(null);
    setEditingDocName('');
    setEditingDocKeywords('');
    alert("✓ Kamus dokumen berhasil diperbarui!");
  };

  const handleAddDocumentType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName) return;

    const nextId = documentsList.length > 0 ? Math.max(...documentsList.map(d => d.id)) + 1 : 1;
    const newDoc: MasterDokumen = {
      id: nextId,
      nama_dokumen: newDocName,
      kata_kunci_ocr: newDocKeywords || "DOKUMEN, KEDINASAN"
    };

    onUpdateDocumentsList([...documentsList, newDoc]);
    setNewDocName('');
    setNewDocKeywords('');
    alert("✓ Tipe dokumen baru berhasil ditambahkan!");
  };

  const handleDeleteDocumentType = (id: number) => {
    // Check if document is linked to any requirements
    let inUse = false;
    Object.values(syaratFiturMap).forEach(arr => {
      if (arr.includes(id)) inUse = true;
    });

    if (inUse) {
      setSuccessToast("⚠️ Dokumen ini tidak bisa dihapus karena masih digunakan sebagai syarat pada salah satu layanan kepegawaian!");
      return;
    }

    const docTarget = documentsList.find(d => d.id === id);
    const docName = docTarget ? docTarget.nama_dokumen : "";

    setConfirmDialog({
      isOpen: true,
      title: "Konfirmasi Hapus Tipe Berkas",
      message: `Apakah anda yakin ingin menghapus tipe berkas "${docName}" secara permanen?`,
      warningMessage: "Berkas ini akan terhapus dari opsi persyaratan semua layanan.",
      onConfirm: () => {
        onUpdateDocumentsList(documentsList.filter(d => d.id !== id));
        setSuccessToast(`✓ Tipe dokumen "${docName}" berhasil dihapus.`);
      }
    });
  };

  const handleToggleSyaratDokumen = (fiturSlug: string, docId: number) => {
    const currentList = syaratFiturMap[fiturSlug] || [];
    let nextList: number[];

    if (currentList.includes(docId)) {
      // Must keep at least one document
      if (currentList.length <= 1) {
        alert("⚠️ Minimal harus ada 1 dokumen wajib untuk setiap layanan!");
        return;
      }
      nextList = currentList.filter(id => id !== docId);
    } else {
      nextList = [...currentList, docId];
    }

    const nextMap = {
      ...syaratFiturMap,
      [fiturSlug]: nextList
    };
    onUpdateSyaratFiturMap(nextMap);
  };


  // ------- 3. MANAJEMEN FITUR STATES & ACTION -------
  // CRUD Create State
  const [newFiturNama, setNewFiturNama] = useState('');
  const [newFiturSlug, setNewFiturSlug] = useState('');
  const [newFiturThreshold, setNewFiturThreshold] = useState<number>(0);
  const [newFiturIsActive, setNewFiturIsActive] = useState<boolean>(true);
  const [newFiturKonfigurasi, setNewFiturKonfigurasi] = useState('');

  // CRUD Edit State
  const [editingFiturId, setEditingFiturId] = useState<number | null>(null);
  const [editingFiturNama, setEditingFiturNama] = useState('');
  const [editingFiturSlug, setEditingFiturSlug] = useState('');
  const [editingFiturThreshold, setEditingFiturThreshold] = useState<number>(0);
  const [editingFiturIsActive, setEditingFiturIsActive] = useState<boolean>(true);
  const [editingFiturKonfigurasi, setEditingFiturKonfigurasi] = useState('');

  const handleAddFeature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFiturNama.trim() || !newFiturSlug.trim()) {
      alert("Nama Fitur dan Slug wajib diisi!");
      return;
    }
    const slugPattern = /^[a-z0-9-_]+$/;
    if (!slugPattern.test(newFiturSlug)) {
      alert("⚠️ Format slug tidak valid! Gunakan huruf kecil, angka, strip (-) atau underscore (_).");
      return;
    }
    const slugExists = featuresList.some(f => f.slug === newFiturSlug.trim());
    if (slugExists) {
      alert("⚠️ Slug fitur sudah digunakan! Harap tentukan slug yang unik.");
      return;
    }

    const nextId = featuresList.length > 0 ? Math.max(...featuresList.map(f => f.id)) + 1 : 1;
    const newFeature: MasterFitur = {
      id: nextId,
      nama_fitur: newFiturNama.trim(),
      slug: newFiturSlug.trim(),
      warning_threshold_bulan: newFiturThreshold,
      is_active: newFiturIsActive,
      konfigurasi_tambahan: newFiturKonfigurasi.trim() ? newFiturKonfigurasi.trim() : undefined
    };

    onUpdateFeaturesList([...featuresList, newFeature]);
    setNewFiturNama('');
    setNewFiturSlug('');
    setNewFiturThreshold(0);
    setNewFiturIsActive(true);
    setNewFiturKonfigurasi('');
    alert("✓ Fitur baru berhasil ditambahkan!");
  };

  const handleStartEditFeature = (f: MasterFitur) => {
    setEditingFiturId(f.id);
    setEditingFiturNama(f.nama_fitur);
    setEditingFiturSlug(f.slug);
    setEditingFiturThreshold(f.warning_threshold_bulan);
    setEditingFiturIsActive(f.is_active);
    setEditingFiturKonfigurasi(f.konfigurasi_tambahan || '');
  };

  const handleSaveFeatureEdit = (id: number) => {
    if (!editingFiturNama.trim() || !editingFiturSlug.trim()) {
      alert("Nama Fitur dan Slug wajib diisi!");
      return;
    }
    const slugExists = featuresList.some(f => f.slug === editingFiturSlug.trim() && f.id !== id);
    if (slugExists) {
      alert("⚠️ Slug fitur sudah digunakan oleh fitur lain!");
      return;
    }

    const updated = featuresList.map(f => {
      if (f.id === id) {
        return {
          ...f,
          nama_fitur: editingFiturNama.trim(),
          slug: editingFiturSlug.trim(),
          warning_threshold_bulan: editingFiturThreshold,
          is_active: editingFiturIsActive,
          konfigurasi_tambahan: editingFiturKonfigurasi.trim() ? editingFiturKonfigurasi.trim() : undefined
        };
      }
      return f;
    });

    onUpdateFeaturesList(updated);
    setEditingFiturId(null);
    setEditingFiturKonfigurasi('');
    alert("✓ Berhasil memperbarui data fitur!");
  };

  const handleDeleteFeature = (id: number) => {
    const fTarget = featuresList.find(f => f.id === id);
    const fName = fTarget ? fTarget.nama_fitur : "";

    setConfirmDialog({
      isOpen: true,
      title: "Konfirmasi Hapus Fitur / Layanan",
      message: `Apakah Anda yakin ingin menghapus fitur layanan "${fName}" dari sistem?`,
      warningMessage: "Seluruh pengaturan syarat berkas terkait untuk fitur ini juga akan terpengaruh.",
      onConfirm: () => {
        const updated = featuresList.filter(f => f.id !== id);
        onUpdateFeaturesList(updated);
        setSuccessToast(`✓ Layanan "${fName}" berhasil dihapus dari sistem.`);
      }
    });
  };

  const handleToggleFeatureActive = (id: number) => {
    const nextList = featuresList.map(f => {
      if (f.id === id) {
        return { ...f, is_active: !f.is_active };
      }
      return f;
    });
    onUpdateFeaturesList(nextList);
  };


  // ------- 4. MANAJEMEN LOGO DAN FAVICON -------
  const [inputLogo, setInputLogo] = useState(logoUrl);
  const [inputFavicon, setInputFavicon] = useState(faviconUrl);

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBranding(inputLogo, inputFavicon);

    // Dynamic simulate favicon update in real-time on browser header!
    try {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = inputFavicon;
    } catch (err) {
      console.log("Favicon dynamic simulate bypassed", err);
    }

    alert("✨ Branding institusi (Logo & Favicon) berhasil diperbarui dan diterapkan ke seluruh sistem!");
  };

  // Preset Branding CRUD section
  interface BrandingPreset {
    id: number;
    name: string;
    logo: string;
    favicon: string;
    is_active: boolean;
  }

  const [brandingPresets, setBrandingPresets] = useState<BrandingPreset[]>(() => {
    const saved = localStorage.getItem('simpeg_branding_presets');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      { id: 1, name: "Dinas Kesehatan Utama (Default)", logo: "/logo_lombok_barat.jpg", favicon: "/logo_lombok_barat.jpg", is_active: true },
      { id: 2, name: "Lombok Barat Sehat Segar Theme", logo: "/logo_lombok_barat.jpg", favicon: "/logo_lombok_barat.jpg", is_active: false },
      { id: 3, name: "SIMPEG Lobar Digital Green Theme", logo: "/logo_lombok_barat.jpg", favicon: "/logo_lombok_barat.jpg", is_active: false }
    ];
  });

  const savePresets = (updated: BrandingPreset[]) => {
    setBrandingPresets(updated);
    localStorage.setItem('simpeg_branding_presets', JSON.stringify(updated));
  };

  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetLogo, setNewPresetLogo] = useState('');
  const [newPresetFavicon, setNewPresetFavicon] = useState('');
  const [editingPresetId, setEditingPresetId] = useState<number | null>(null);

  const handleAddPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim() || !newPresetLogo.trim() || !newPresetFavicon.trim()) {
      alert("Harap lengkapi semua isian preset branding!");
      return;
    }

    if (editingPresetId !== null) {
      // Update Mode
      const updated = brandingPresets.map(p => {
        if (p.id === editingPresetId) {
          return {
            ...p,
            name: newPresetName.trim(),
            logo: newPresetLogo.trim(),
            favicon: newPresetFavicon.trim()
          };
        }
        return p;
      });
      savePresets(updated);
      setEditingPresetId(null);
      alert("✓ Preset branding berhasil diperbarui!");
    } else {
      // Create Mode
      const nextId = brandingPresets.length > 0 ? Math.max(...brandingPresets.map(p => p.id)) + 1 : 1;
      const newPreset: BrandingPreset = {
        id: nextId,
        name: newPresetName.trim(),
        logo: newPresetLogo.trim(),
        favicon: newPresetFavicon.trim(),
        is_active: false
      };
      savePresets([...brandingPresets, newPreset]);
      alert("✓ Preset branding baru ditambahkan!");
    }

    setNewPresetName('');
    setNewPresetLogo('');
    setNewPresetFavicon('');
  };

  const handleStartEditPreset = (p: BrandingPreset) => {
    setEditingPresetId(p.id);
    setNewPresetName(p.name);
    setNewPresetLogo(p.logo);
    setNewPresetFavicon(p.favicon);
  };

  const handleCancelEditPreset = () => {
    setEditingPresetId(null);
    setNewPresetName('');
    setNewPresetLogo('');
    setNewPresetFavicon('');
  };

  const handleDeletePreset = (id: number) => {
    const target = brandingPresets.find(p => p.id === id);
    if (target?.is_active) {
      setSuccessToast("⚠️ Tidak dapat menghapus preset yang sedang aktif digunakan!");
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: "Konfirmasi Hapus Preset Tema",
      message: `Apakah anda yakin ingin menghapus tema preset "${target?.name || ''}" secara permanen?`,
      onConfirm: () => {
        savePresets(brandingPresets.filter(p => p.id !== id));
        setSuccessToast(`✓ Preset tema "${target?.name || ''}" berhasil dihapus.`);
      }
    });
  };

  const handleApplyPreset = (id: number) => {
    const updated = brandingPresets.map(p => ({
      ...p,
      is_active: p.id === id
    }));
    savePresets(updated);

    const target = brandingPresets.find(p => p.id === id);
    if (target) {
      setInputLogo(target.logo);
      setInputFavicon(target.favicon);
      onUpdateBranding(target.logo, target.favicon);

      // Realtime Favicon change
      try {
        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (!link) {
          link = document.createElement('link');
          link.type = 'image/x-icon';
          link.rel = 'shortcut icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = target.favicon;
      } catch (err) {
        console.log("Favicon dynamic simulate bypassed", err);
      }

      alert(`✨ Tema visual "${target.name}" berhasil diterapkan secara global!`);
    }
  };

  return (
    <div className="bg-[#16161a] border border-white/5 p-6 rounded-2xl shadow-xs space-y-6 animate-in fade-in duration-200">
      
      {/* View Header */}
      <div className="border-b border-white/5 pb-4">
        <h2 className="text-xl font-display font-bold text-white flex items-center space-x-2">
          <Shield className="text-emerald-500" size={22} />
          <span>Pusat Administrasi & Keamanan</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Kelola otorisasi pengguna, kamus berkas anti-slop, kelayakan threshold, dan identitas visual institusi Lombok Barat
        </p>
      </div>

      {/* Mode Sub-nav Tabs */}
      <div className="flex border-b border-white/5 -mx-6 px-6 overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setActiveMgtTab('users')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 mr-6 ${activeMgtTab === 'users' ? 'border-emerald-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <Users size={15} />
          <span>Manajemen Pengguna</span>
        </button>

        <button
          onClick={() => setActiveMgtTab('documents')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 mr-6 ${activeMgtTab === 'documents' ? 'border-emerald-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <FileText size={15} />
          <span>Manajemen Dokumen & Layanan</span>
        </button>

        <button
          onClick={() => setActiveMgtTab('features')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 mr-6 ${activeMgtTab === 'features' ? 'border-emerald-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <Sliders size={15} />
          <span>Manajemen Fitur</span>
        </button>

        <button
          onClick={() => setActiveMgtTab('units')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 mr-6 ${activeMgtTab === 'units' ? 'border-emerald-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <Link size={15} />
          <span>Unit Kerja (Puskesmas / PKM)</span>
        </button>

        <button
          onClick={() => setActiveMgtTab('supabase')}
          className={`pb-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 ${activeMgtTab === 'supabase' ? 'border-emerald-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <Database size={15} className="text-sky-400" />
          <span className="text-sky-400 font-extrabold font-mono text-[11px] animate-pulse">SUPABASE CLOUD LIVE</span>
        </button>
      </div>

      {/* ======================= SUB-TAB: MANAJEMEN PENGGUNA ======================= */}
      {activeMgtTab === 'users' && (
        <div className="space-y-6 pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* User Form block (Create/Update transition) */}
            <div className="bg-[#0f0f12] p-5 border border-white/5 rounded-xl space-y-4 animate-in fade-in duration-200">
              {editingUserId !== null ? (
                <>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1">
                    <span className="w-1.5 h-3 bg-amber-500 rounded-full inline-block mr-1 animate-pulse"></span>
                    Edit Data Pengguna
                  </h3>

                  <form onSubmit={handleSaveUserEdit} className="space-y-3.5 text-xs">
                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-medium">NIP / Identitas</label>
                      <input
                        type="text"
                        required
                        placeholder="NIP..."
                        value={editingUserNip}
                        onChange={(e) => setEditingUserNip(e.target.value)}
                        className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-medium">Nama Lengkap & Gelar</label>
                      <input
                        type="text"
                        required
                        placeholder="Nama lengkap pejabat..."
                        value={editingUserName}
                        onChange={(e) => setEditingUserName(e.target.value)}
                        className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-medium">Peran Otoritas (Role)</label>
                      <select
                        value={editingUserRole}
                        onChange={(e) => setEditingUserRole(e.target.value as RoleType)}
                        className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                      >
                        <option value="admin_puskesmas">Admin Unit (Puskesmas)</option>
                        <option value="admin_dinkes">Admin Utama (Dikes PPKB)</option>
                      </select>
                    </div>

                    {editingUserRole === 'admin_puskesmas' && (
                      <div className="space-y-1.5">
                        <label className="text-slate-400 font-medium">Penempatan Unit Kerja</label>
                        <select
                          value={editingUserPuskesmasId}
                          onChange={(e) => setEditingUserPuskesmasId(Number(e.target.value))}
                          className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        >
                          {puskesmasList.map(p => (
                            <option key={p.id} value={p.id}>{p.nama_puskesmas}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-medium">Username (Akses Login)</label>
                      <input
                        type="text"
                        placeholder="Masukkan username baru..."
                        value={editingUserUsername}
                        onChange={(e) => setEditingUserUsername(e.target.value)}
                        className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-medium">Password Baru</label>
                      <input
                        type="password"
                        placeholder="Masukkan password baru..."
                        value={editingUserPassword}
                        onChange={(e) => setEditingUserPassword(e.target.value)}
                        className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-medium">Nomor WA Aktif (+62)</label>
                      <input
                        type="text"
                        placeholder="Contoh: +628123456789"
                        value={editingUserWa}
                        onChange={(e) => setEditingUserWa(e.target.value)}
                        className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none text-xs font-mono"
                      />
                    </div>

                    <div className="flex space-x-2 pt-2">
                      <button
                        type="button"
                        onClick={handleCancelEditUser}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition"
                      >
                        Simpan Edit
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1">
                    <span className="w-1.5 h-3 bg-emerald-500 rounded-full inline-block mr-1"></span>
                    Tambah Pengguna Baru
                  </h3>

                  <form onSubmit={handleAddUser} className="space-y-3.5 text-xs">
                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-medium">NIP / Identitas</label>
                      <input
                        type="text"
                        required
                        placeholder="Masukkan NIP atau ID..."
                        value={newUserNip}
                        onChange={(e) => setNewUserNip(e.target.value)}
                        className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-medium">Nama Lengkap & Gelar</label>
                      <input
                        type="text"
                        required
                        placeholder="Nama lengkap pejabat..."
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-medium">Peran Otoritas (Role)</label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as RoleType)}
                        className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="admin_puskesmas">Admin Unit (Puskesmas)</option>
                        <option value="admin_dinkes">Admin Utama (Dikes PPKB)</option>
                      </select>
                    </div>

                    {newUserRole === 'admin_puskesmas' && (
                      <div className="space-y-1.5">
                        <label className="text-slate-400 font-medium">Penempatan Unit Kerja</label>
                        <select
                          value={newUserPuskesmasId}
                          onChange={(e) => setNewUserPuskesmasId(Number(e.target.value))}
                          className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        >
                          {puskesmasList.map(p => (
                            <option key={p.id} value={p.id}>{p.nama_puskesmas}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-medium">Username (Akses Login)</label>
                      <input
                        type="text"
                        placeholder="Masukkan username..."
                        value={newUserUsername}
                        onChange={(e) => setNewUserUsername(e.target.value)}
                        className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-medium">Password</label>
                      <input
                        type="password"
                        placeholder="Pilih password..."
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-medium">Nomor WA Aktif (+62)</label>
                      <input
                        type="text"
                        placeholder="Contoh: +628123456789"
                        value={newUserWa}
                        onChange={(e) => setNewUserWa(e.target.value)}
                        className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs font-mono"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition"
                    >
                      Daftarkan Pengguna
                    </button>
                  </form>
                </>
              )}
            </div>

            {/* List user table block */}
            <div className="lg:col-span-2 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1">
                <span className="w-1.5 h-3 bg-emerald-500 rounded-full inline-block mr-1"></span>
                Daftar Akun Terdaftar ({usersList.length})
              </h3>

              <div className="border border-white/5 rounded-xl overflow-x-auto text-xs bg-[#0f0f12]">
                <table className="w-full min-w-[600px] text-left border-collapse">
                  <thead className="bg-white/[0.02] text-slate-400 font-semibold border-b border-white/5">
                    <tr>
                      <th className="p-3">PENGGUNA</th>
                      <th className="p-3">HAK AKSES / PERAN</th>
                      <th className="p-3">UNIT PENEMPATAN</th>
                      <th className="p-3 text-right">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium text-slate-300">
                    {usersList.map((user) => {
                      const penempatan = user.role === 'admin_dinkes' 
                        ? 'Dinas Kesehatan PPKB' 
                        : (puskesmasList.find(p => p.id === user.id_puskesmas)?.nama_puskesmas || 'Puskesmas');
                      const isCurrentlyEditingThisUser = editingUserId === user.id;
                      
                      return (
                        <tr key={user.id.toString()} className={`transition ${isCurrentlyEditingThisUser ? 'bg-amber-500/10' : 'hover:bg-white/[0.01]'}`}>
                          <td className="p-3">
                            <p className="font-bold text-white">{user.nama_lengkap}</p>
                            <p className="text-[10px] text-slate-500 font-mono">NIP {user.nip}</p>
                            {user.username && (
                              <p className="text-[10px] text-teal-400 mt-1">
                                Username: <span className="font-mono font-bold text-teal-300">{user.username}</span>
                                {user.password && <span className="text-slate-500 ml-1.5">(Pass: •••••)</span>}
                              </p>
                            )}
                            {user.nomor_wa && (
                              <p className="text-[10px] text-emerald-400 font-mono">
                                WA Aktif: <span className="font-bold">{user.nomor_wa}</span>
                              </p>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${user.role === 'admin_dinkes' ? 'bg-teal-950 text-teal-400 border border-teal-850/45' : 'bg-slate-900 border border-white/10 text-slate-400'}`}>
                              {user.role === 'admin_dinkes' ? 'Admin Utama (Dikes)' : 'Admin Unit (Puskesmas)'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400">
                            {penempatan}
                          </td>
                          <td className="p-3 text-right flex items-center justify-end space-x-1.5 h-12">
                            <button
                              onClick={() => handleStartEditUser(user)}
                              className={`p-1 border rounded transition ${isCurrentlyEditingThisUser ? 'text-amber-400 border-amber-500 bg-amber-500/10' : 'text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20'}`}
                              title="Edit Pengguna"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(Number(user.id))}
                              className="text-rose-400 hover:text-rose-300 p-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded"
                              title="Hapus pengguna"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ======================= SUB-TAB: MANAJEMEN DOKUMEN & LAYANAN ======================= */}
      {activeMgtTab === 'documents' && (
        <div className="space-y-6 pt-2">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Kamus Dokumen (Left, 5 Columns) - Create/Update dynamic mode */}
            <div className="lg:col-span-5 space-y-4">
              
              <div className="bg-[#0f0f12] p-5 border border-white/5 rounded-xl space-y-3.5 animate-in fade-in duration-200">
                {editingDocId !== null ? (
                  <>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1">
                      <span className="w-1.5 h-3 bg-amber-500 rounded-full inline-block mr-1 animate-pulse"></span>
                      Edit Kamus Tipe Berkas
                    </h3>

                    <form onSubmit={handleSaveDocEdit} className="space-y-3 text-xs">
                      <div className="space-y-1.5">
                        <label className="text-slate-400 font-medium">Nama Dokumen Persyaratan</label>
                        <input
                          type="text"
                          required
                          placeholder="Nama berkas..."
                          value={editingDocName}
                          onChange={(e) => setEditingDocName(e.target.value)}
                          className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-400 font-medium">Kata Kunci Validasi OCR (Koma-Separated)</label>
                        <input
                          type="text"
                          placeholder="SERIFIED, PELATIHAN, KOMPETENSI..."
                          value={editingDocKeywords}
                          onChange={(e) => setEditingDocKeywords(e.target.value)}
                          className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>

                      <div className="flex space-x-2 pt-2">
                        <button
                          type="button"
                          onClick={handleCancelEditDoc}
                          className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition"
                        >
                          Simpan Edit
                        </button>
                      </div>
                    </form>
                  </>
                ) : (
                  <>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1">
                      <span className="w-1.5 h-3 bg-emerald-500 rounded-full inline-block mr-1"></span>
                      Tambah Kamus Tipe Berkas baru
                    </h3>

                    <form onSubmit={handleAddDocumentType} className="space-y-3 text-xs">
                      <div className="space-y-1.5">
                        <label className="text-slate-400 font-medium">Nama Dokumen Persyaratan</label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: SK Pelatihan Kompetensi..."
                          value={newDocName}
                          onChange={(e) => setNewDocName(e.target.value)}
                          className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-400 font-medium">Kata Kunci Validasi OCR (Koma-Separated)</label>
                        <input
                          type="text"
                          placeholder="SERIFIED, PELATIHAN, KOMPETENSI..."
                          value={newDocKeywords}
                          onChange={(e) => setNewDocKeywords(e.target.value)}
                          className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                        <p className="text-[10px] text-slate-500 leading-normal">
                          Digunakan oleh mesin OCR untuk memastikan berkas yang diupload adalah scan berkas asli milik PNS bersangkutan.
                        </p>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition"
                      >
                        Daftarkan Berkas
                      </button>
                    </form>
                  </>
                )}
              </div>

              {/* Document List Panel */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Master Berkas Terdaftar ({documentsList.length})</h4>
                <div className="max-h-72 overflow-y-auto space-y-1.5 border border-white/5 p-2 rounded-xl bg-black/20">
                  {documentsList.map(doc => {
                    const isCurrentlyEditingThisDoc = editingDocId === doc.id;
                    return (
                      <div key={doc.id} className={`p-2.5 border rounded-lg flex items-center justify-between text-xs text-slate-300 transition ${isCurrentlyEditingThisDoc ? 'bg-amber-500/10 border-amber-500/40' : 'bg-[#0f0f12] border-white/5'}`}>
                        <div>
                          <p className="font-bold text-white">{doc.nama_dokumen}</p>
                          <p className="text-[10px] text-teal-400 font-mono mt-0.5">OCR Key: {doc.kata_kunci_ocr}</p>
                        </div>
                        <div className="flex items-center space-x-1 text-right">
                          <button
                            onClick={() => handleStartEditDoc(doc)}
                            className={`p-1 border rounded transition ${isCurrentlyEditingThisDoc ? 'text-amber-400 border-amber-500 bg-amber-500/10' : 'text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20'}`}
                            title="Edit Tipe Berkas"
                          >
                            <Edit3 size={11} />
                          </button>
                          <button
                            onClick={() => handleDeleteDocumentType(doc.id)}
                            className="text-rose-400 hover:text-rose-300 p-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded"
                            title="Hapus Tipe Berkas"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Hubungan Berkas dan Layanan 1-9 (Right, 7 Columns) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-[#0f0f12] p-5 border border-white/5 rounded-xl space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
                  <span>Hubungkan Berkas Wajib ke Layanan 1-9</span>
                  <span className="text-[10px] bg-indigo-950 text-indigo-400 border border-indigo-800/40 px-2 py-0.5 rounded-full font-bold uppercase">Dynamic Config</span>
                </h3>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Pilih salah satu layanan kepegawaian di bawah, lalu centang berkas mana saja yang sifatnya wajib di-upload oleh admin pengusul:
                </p>

                {/* Service Selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Pilih Layanan Target</label>
                  <select
                    value={selectedFiturForDocs}
                    onChange={(e) => setSelectedFiturForDocs(e.target.value)}
                    className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg font-bold text-xs"
                  >
                    {featuresList.filter(f => f.slug !== 'keadaan-sdmk').map(f => (
                      <option key={f.id} value={f.slug}>{f.nama_fitur}</option>
                    ))}
                  </select>
                </div>

                {/* Required checklists */}
                <div className="border border-white/5 rounded-xl bg-black/40 p-3 space-y-2 mt-4 max-h-96 overflow-y-auto">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Centang Dokumen Persyaratan Wajib:</p>
                  
                  {documentsList.map(doc => {
                    const isChecked = (syaratFiturMap[selectedFiturForDocs] || []).includes(doc.id);

                    return (
                      <label 
                        key={doc.id} 
                        className={`p-2.5 rounded-lg border flex items-center justify-between transition cursor-pointer ${isChecked ? 'bg-emerald-950/20 border-emerald-500/40 text-white' : 'bg-[#16161a] border-white/5 text-slate-400 hover:text-slate-300'}`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSyaratDokumen(selectedFiturForDocs, doc.id)}
                            className="accent-emerald-500"
                          />
                          <div className="text-xs">
                            <span className="font-semibold block">{doc.nama_dokumen}</span>
                            <span className="text-[9px] opacity-70 block font-mono mt-0.5">ID: #{doc.id} • Key: {doc.kata_kunci_ocr}</span>
                          </div>
                        </div>

                        {isChecked && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold font-mono">WAJIB</span>
                        )}
                      </label>
                    );
                  })}
                </div>

              </div>
            </div>

          </div>

        </div>
      )}

      {/* ======================= SUB-TAB: MANAJEMEN FITUR ======================= */}
      {activeMgtTab === 'features' && (
        <div className="space-y-6 pt-2">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Create Feature Form (Left Column, 4 Cols) */}
            <div className="lg:col-span-4 bg-[#0f0f12] p-5 border border-white/5 rounded-xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1">
                <span className="w-1.5 h-3 bg-emerald-500 rounded-full inline-block mr-1"></span>
                Tambah Fitur Baru (Create)
              </h3>
              
              <form onSubmit={handleAddFeature} className="space-y-3.5 text-xs text-medium">
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-medium">Nama Fitur</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kenaikan Pangkat Luar Biasa..."
                    value={newFiturNama}
                    onChange={(e) => setNewFiturNama(e.target.value)}
                    className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 font-medium">Slug Fitur (Harus unik & huruf kecil)</label>
                  <input
                    type="text"
                    required
                    placeholder="contoh: kenaikan-pangkat-luar-biasa"
                    value={newFiturSlug}
                    onChange={(e) => setNewFiturSlug(e.target.value)}
                    className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                  <p className="text-[10px] text-slate-500">
                    Gunakan huruf kecil, angka, dan strip saja.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 font-medium">Threshold Peringatan Dini (Bulan)</label>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    value={newFiturThreshold}
                    onChange={(e) => setNewFiturThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                  <p className="text-[10px] text-slate-500">
                    Waktu peringatan sebelum jatuh tempo. Isi 0 jika tidak memerlukan alarm biometrik.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 font-medium block">Status Aktivasi Awal</label>
                  <select
                    value={newFiturIsActive ? "true" : "false"}
                    onChange={(e) => setNewFiturIsActive(e.target.value === "true")}
                    className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:outline-none font-semibold text-emerald-400"
                  >
                    <option value="true">Aktif (Enabled)</option>
                    <option value="false">Nonaktif (Disabled)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 font-medium block">Konfigurasi Tambahan (Form Label)</label>
                  <input
                    type="text"
                    value={newFiturKonfigurasi}
                    onChange={(e) => setNewFiturKonfigurasi(e.target.value)}
                    placeholder="Contoh: No Surat Tugas / Nama Pelatihan"
                    className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500">
                    Label form tambahan yang wajib diisi oleh pengusul dangan input custom (opsional).
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition"
                >
                  Tambahkan Fitur Baru
                </button>
              </form>
            </div>

            {/* Read/Update/Delete List (Right Column, 8 Cols) */}
            <div className="lg:col-span-8 space-y-3.5">
              <div className="bg-[#0f0f12] p-4 border border-white/5 rounded-xl text-xs space-y-1">
                <h3 className="font-bold text-white uppercase tracking-wider flex items-center">
                  <span className="w-1.5 h-3 bg-emerald-500 rounded-full inline-block mr-1"></span>
                  Katalog Layanan & Peringatan Kepegawaian ({featuresList.length})
                </h3>
                <p className="text-slate-400 leading-normal">
                  Daftar fitur SIMPEG aktif. Baris bertanda hijau dapat diedit secara penuh dan aman.
                </p>
              </div>

              <div className="border border-white/5 rounded-xl overflow-x-auto text-xs bg-[#0f0f12]">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="bg-white/[0.02] text-slate-400 font-semibold border-b border-white/5">
                    <tr>
                      <th className="p-3">ID & FITUR MODUL</th>
                      <th className="p-3">SLUG / KEY</th>
                      <th className="p-3">WARNING THRESHOLD</th>
                      <th className="p-3">STATUS AKTIF</th>
                      <th className="p-3 text-right">AKSI ADMINISTRASI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium text-slate-300">
                    {featuresList.map(fitur => {
                      const isEditing = editingFiturId === fitur.id;

                      return (
                        <tr key={fitur.id} className={`hover:bg-white/[0.01] transition ${isEditing ? 'bg-emerald-950/10' : ''}`}>
                          
                          {/* Nama Fitur / ID */}
                          <td className="p-3">
                            {isEditing ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={editingFiturNama}
                                  onChange={(e) => setEditingFiturNama(e.target.value)}
                                  className="bg-[#16161a] border border-emerald-500/30 p-1.5 text-white font-bold rounded w-full text-xs"
                                  placeholder="Nama fitur..."
                                />
                                <div>
                                  <label className="text-[9px] text-slate-500 font-bold block uppercase">Konfigurasi Tambahan (Form Label)</label>
                                  <input
                                    type="text"
                                    value={editingFiturKonfigurasi}
                                    onChange={(e) => setEditingFiturKonfigurasi(e.target.value)}
                                    placeholder="Contoh: No Surat Tugas / Nama Pelatihan"
                                    className="bg-[#16161a] border border-emerald-500/35 p-1 px-1.5 text-white font-medium rounded w-full text-[11px]"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div>
                                <p className="font-bold text-white flex items-center gap-1.5">
                                  <span className="text-[10px] px-1 bg-white/5 rounded text-slate-500 font-mono">#{fitur.id}</span>
                                  <span>{fitur.nama_fitur}</span>
                                </p>
                                {fitur.konfigurasi_tambahan && (
                                  <p className="text-[10px] text-yellow-500 mt-1 font-semibold">
                                    ⚙️ Konfigurasi: <span className="font-normal text-slate-400">{fitur.konfigurasi_tambahan}</span>
                                  </p>
                                )}
                                <p className="text-[10px] text-slate-500 mt-1">
                                  {fitur.id <= 9 ? 'Layanan Kepegawaian Core' : fitur.id === 11 ? 'Evaluasi Mandiri' : 'Modul Pendukung'}
                                </p>
                              </div>
                            )}
                          </td>

                          {/* Slug Fitur */}
                          <td className="p-3 font-mono text-[11px]">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingFiturSlug}
                                onChange={(e) => setEditingFiturSlug(e.target.value)}
                                className="bg-[#16161a] border border-emerald-500/30 p-1.5 text-white font-mono rounded w-full text-xs"
                                placeholder="slug..."
                              />
                            ) : (
                              <span className="bg-[#16161a] px-1.5 py-0.5 rounded text-slate-400">{fitur.slug}</span>
                            )}
                          </td>

                          {/* Warning Threshold */}
                          <td className="p-3 font-mono text-[11px]">
                            {isEditing ? (
                              <div className="flex items-center space-x-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  max={24}
                                  value={editingFiturThreshold}
                                  onChange={(e) => setEditingFiturThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="bg-[#16161a] border border-emerald-500/30 p-1.5 w-16 text-center text-white font-bold rounded text-xs"
                                />
                                <span className="text-[10px] text-slate-400 font-sans">Bln</span>
                              </div>
                            ) : (
                              <span className="font-bold">
                                {fitur.warning_threshold_bulan > 0 ? `${fitur.warning_threshold_bulan} Bulan` : 'Non-aktif Alarm'}
                              </span>
                            )}
                          </td>

                          {/* Status Aktif */}
                          <td className="p-3">
                            {isEditing ? (
                              <select
                                value={editingFiturIsActive ? "true" : "false"}
                                onChange={(e) => setEditingFiturIsActive(e.target.value === "true")}
                                className="bg-[#16161a] border border-emerald-500/30 p-1 rounded font-bold text-xs text-white"
                              >
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                              </select>
                            ) : (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${fitur.is_active ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40' : 'bg-rose-950/40 text-rose-400 border border-rose-500/20'}`}>
                                {fitur.is_active ? 'AKTIF' : 'NONAKTIF'}
                              </span>
                            )}
                          </td>

                          {/* Actions: Save / Edit / Delete */}
                          <td className="p-3 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleSaveFeatureEdit(fitur.id)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded flex items-center gap-1 font-bold text-[10px] uppercase cursor-pointer"
                                  title="Simpan perubahan"
                                >
                                  <Check size={11} />
                                  <span>Simpan</span>
                                </button>
                                <button
                                  onClick={() => setEditingFiturId(null)}
                                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded flex items-center gap-1 font-bold text-[10px] uppercase cursor-pointer"
                                  title="Batal"
                                >
                                  <X size={11} />
                                  <span>Batal</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                {/* Regular Toggle Active */}
                                <button
                                  onClick={() => handleToggleFeatureActive(fitur.id)}
                                  className={`text-[9px] font-bold py-1 px-2 rounded cursor-pointer ${fitur.is_active ? 'bg-rose-950/30 hover:bg-rose-900/35 text-rose-400 border border-rose-500/10' : 'bg-emerald-950/30 hover:bg-[#112d22] text-emerald-400 border border-emerald-500/15'}`}
                                >
                                  {fitur.is_active ? 'Matikan' : 'Aktifkan'}
                                </button>

                                {/* Inline Full Edit */}
                                <button
                                  onClick={() => handleStartEditFeature(fitur)}
                                  className="text-indigo-400 hover:text-indigo-300 p-1 bg-indigo-500/10 border border-indigo-500/15 rounded cursor-pointer"
                                  title="Edit Fitur Lengkap"
                                >
                                  <Edit3 size={12} />
                                </button>

                                {/* Delete Feature with protection for safety */}
                                <button
                                  onClick={() => handleDeleteFeature(fitur.id)}
                                  className="text-rose-400 hover:text-rose-300 p-1 bg-rose-500/10 border border-rose-500/15 rounded cursor-pointer"
                                  title="Hapus Fitur (Delete)"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}



      {/* ======================= SUB-TAB: MANAJEMEN UNIT KERJA (PUSKESMAS) ======================= */}
      {activeMgtTab === 'units' && (
        <div className="space-y-6 pt-2 text-slate-800">
          
          {/* Unit Kerja Induk Banner */}
          <div className="bg-gradient-to-r from-emerald-950 to-teal-900 border border-emerald-800/40 p-5 rounded-2xl text-left flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-200">
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 font-extrabold uppercase rounded text-[9px] tracking-wider border border-emerald-500/30">
                Unit Kerja Induk Utama
              </span>
              <h3 className="text-base font-extrabold text-white font-display">
                Dinas Kesehatan, Pengendalian Penduduk, dan Keluarga Berencana (Dikes PPKB)
              </h3>
              <p className="text-xs text-emerald-200/80 leading-relaxed max-w-3xl">
                Berdasarkan regulasi kepegawaian Kabupaten Lombok Barat, Dikes PPKB bertindak sebagai <strong>Unit Kerja Induk (Induk Organisasi)</strong> serta <strong>Admin Utama Sistem</strong> yang membawahi, mengkoordinir, dan memvalidasi seluruh unit organisasi kesehatan (seperti Puskesmas, Unit Kerja Pembantu, dan Fasilitas Kesehatan Terdaftar) di bawah jajarannya.
              </p>
            </div>
            <div className="shrink-0 flex items-center space-x-2">
              <span className="px-3 py-1.5 bg-white/5 border border-white/10 text-emerald-400 font-bold rounded-lg text-xs font-mono">
                ID INDUK: 100 (DIKES PPKB)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Form Column */}
            <div className="bg-white p-5 border border-slate-300 rounded-xl space-y-4 shadow-sm text-left">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5 font-display">
                <span className="w-1.5 h-3 bg-emerald-500 rounded-full inline-block"></span>
                <span>{editingUnitId !== null ? "Edit Unit Kerja" : "Tambah Unit Kerja Baru"}</span>
              </h3>
              <p className="text-[11px] text-slate-500">Mendaftarkan unit organisasi kerja atau unit kesehatan (Puskesmas/PKM) di Lombok Barat</p>

              <form onSubmit={editingUnitId !== null ? handleUpdateUnit : handleCreateUnit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 block uppercase">Kode Unit / PKM (Unor)</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PKM-LBA, PKM-GDR..."
                    value={editingUnitId !== null ? editingUnitKode : newUnitKode}
                    onChange={(e) => editingUnitId !== null ? setEditingUnitKode(e.target.value) : setNewUnitKode(e.target.value)}
                    className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 block uppercase">Nama Unit Organisasi Kerja</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Puskesmas Labuapi..."
                    value={editingUnitId !== null ? editingUnitNama : newUnitNama}
                    onChange={(e) => editingUnitId !== null ? setEditingUnitNama(e.target.value) : setNewUnitNama(e.target.value)}
                    className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg text-xs font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 block uppercase">Alamat Lengkap</label>
                  <input
                    type="text"
                    placeholder="Contoh: Jl. Raya Labuapi No. 1..."
                    value={editingUnitId !== null ? editingUnitAlamat : newUnitAlamat}
                    onChange={(e) => editingUnitId !== null ? setEditingUnitAlamat(e.target.value) : setNewUnitAlamat(e.target.value)}
                    className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg text-xs"
                  />
                </div>

                <div className="pt-2 flex space-x-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                  >
                    {editingUnitId !== null ? "Simpan Perubahan" : "Simpan Unit"}
                  </button>
                  {editingUnitId !== null && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingUnitId(null);
                        setEditingUnitKode('');
                        setEditingUnitNama('');
                        setEditingUnitAlamat('');
                      }}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* List Column */}
            <div className="lg:col-span-2 space-y-3 text-left">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Daftar Unit Kerja Lombok Barat ({puskesmasList.length})</span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white">
                <table className="w-full min-w-[650px] text-xs text-slate-700 text-left border-collapse">
                  <thead className="bg-slate-100/50 border-b border-slate-200">
                    <tr>
                      <th className="p-3 font-bold text-slate-900 w-24">KODE UNIT</th>
                      <th className="p-3 font-bold text-slate-900">NAMA UNIT ORGANISASI (UNOR)</th>
                      <th className="p-3 font-bold text-slate-900">ALAMAT</th>
                      <th className="p-3 font-bold text-right text-slate-900 w-24">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {puskesmasList.map((unit) => (
                      <tr key={unit.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-slate-900">{unit.kode_puskesmas}</td>
                        <td className="p-3 font-bold text-slate-950">{unit.nama_puskesmas}</td>
                        <td className="p-3 text-slate-600">{unit.alamat}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => {
                                setEditingUnitId(unit.id);
                                setEditingUnitKode(unit.kode_puskesmas);
                                setEditingUnitNama(unit.nama_puskesmas);
                                setEditingUnitAlamat(unit.alamat);
                              }}
                              className="p-1 hover:bg-amber-100 text-amber-700 rounded transition cursor-pointer"
                              title="Ubah Unit"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteUnit(unit.id, unit.nama_puskesmas)}
                              disabled={unit.id === 1 || unit.id === 100}
                              className={`p-1 hover:bg-rose-100 text-rose-600 rounded transition cursor-pointer ${unit.id === 1 || unit.id === 100 ? 'opacity-30 cursor-not-allowed' : ''}`}
                              title={unit.id === 100 ? "ID Induk (Dikes PPKB) terkunci" : unit.id === 1 ? "Unit default pertama terkunci" : "Hapus Unit"}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ======================= SUB-TAB: INTEGRASI SUPABASE CLOUD ======================= */}
      {activeMgtTab === 'supabase' && (
        <div className="space-y-6 pt-2 text-[#0f172a] animate-in fade-in duration-200">
          
          {/* Connection Status Panel & Actions */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 font-display flex items-center space-x-2">
                  <Database className="text-sky-500 animate-bounce" size={20} />
                  <span>Konektivitas Supabase Live Cloud</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Status sinkronisasi instansi SIMPEG Lombok Barat dengan klaster database cloud PostgreSQL
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleTestConnection}
                  disabled={supabaseLoading}
                  className="px-3.5 py-1.5 border border-slate-350 bg-slate-50 hover:bg-slate-100 active:bg-slate-150 disabled:opacity-50 text-slate-700 text-xs font-bold rounded-lg transition inline-flex items-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  <RefreshCw size={13} className={supabaseLoading ? 'animate-spin' : ''} />
                  <span>Uji Ulang Koneksi</span>
                </button>
              </div>
            </div>

            {/* Connection Indicator Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">API Endpoint URL</div>
                <div className="text-xs font-mono text-slate-700 select-all truncate mt-1 font-semibold">{SUPABASE_URL}</div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Status Konektivitas</div>
                <div className="mt-1 flex items-center">
                  {supabaseTestingOrCheckedState(supabaseLoading, supabaseTestResult)}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Mode Penyimpanan Aktif</div>
                <div className="text-xs font-bold text-slate-800 mt-1 inline-flex items-center space-x-1">
                  <span className={`h-2 w-2 rounded-full inline-block ${supabaseTestResult?.success ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`} />
                  <span>{supabaseTestResult?.success ? "Cloud Synchronized Mode" : "Local Database Mode"}</span>
                </div>
              </div>
            </div>

            {/* Alert warnings for migrations */}
            {!supabaseTestResult?.success && (
              <div className="bg-amber-50/50 border border-amber-300/60 p-4 rounded-xl mt-4 flex items-start space-x-2.5">
                <AlertCircle className="text-amber-600 mt-0.5 shrink-0" size={17} />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <span className="font-extrabold">Pemberitahuan Sistem:</span> Koneksi client Anda ditolak atau ditandai offline karena tabel-tabel database di Supabase Anda belum terbuat atau bentrok dengan skema lama. Untuk memulihkan integrasi cloud ini, ikuti petunjuk migrasi SQL di bawah, jalankan script reset, kemudian lakukan push data.
                </div>
              </div>
            )}
          </div>

          {/* Sync operations control panel */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-left">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest font-display flex items-center space-x-2 mb-4">
              <span className="w-1.5 h-3.5 bg-sky-500 rounded-full inline-block"></span>
              <span>Sinkronisasi Data Manual</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Push panel */}
              <div className="border border-slate-200 p-5 rounded-xl hover:shadow-md/50 transition">
                <h4 className="text-xs font-bold text-slate-950 uppercase tracking-wide flex items-center space-x-1.5">
                  <span className="p-1 bg-emerald-50 text-emerald-600 rounded-md"><Plus size={12} /></span>
                  <span>Push State Lokal ke Supabase (Upload)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Kirim seluruh data lokal (Puskesmas, Pegawai, Usulan, Laporan, Arsip, dll.) dari browser Anda saat ini ke cloud Supabase secara massal. Tindakan ini akan meng-overwrite data lama yang memiliki ID yang sama.
                </p>
                <button
                  type="button"
                  onClick={handleManualPush}
                  disabled={supabaseLoading}
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold transition shadow inline-flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Plus size={13} />
                  <span>Kirim Data ke Supabase Cloud</span>
                </button>
              </div>

              {/* Pull panel */}
              <div className="border border-slate-200 p-5 rounded-xl hover:shadow-md/50 transition">
                <h4 className="text-xs font-bold text-slate-950 uppercase tracking-wide flex items-center space-x-1.5">
                  <span className="p-1 bg-amber-50 text-amber-600 rounded-md"><Sliders size={12} /></span>
                  <span>Pull State dari Supabase ke Lokal (Download)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Tarik seluruh data terbaru dari cloud Supabase Anda untuk menggantikan total database lokal di browser Anda. Gunakan ini setelah Anda membersihkan atau mengisi data baru di console Supabase.
                </p>
                <button
                  type="button"
                  onClick={handleManualPull}
                  disabled={supabaseLoading || !onUpdateDbState}
                  className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg text-xs font-extrabold transition shadow inline-flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sliders size={13} />
                  <span>Unduh Data ke Browser Lokal</span>
                </button>
              </div>
            </div>
          </div>

          {/* Console / Logs Shell */}
          <div className="bg-[#0f172a] text-slate-200 p-5 rounded-2xl text-left border border-slate-800 shadow-xl font-mono text-[11px] leading-relaxed relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center space-x-2 text-slate-400">
                <Terminal size={14} className="text-sky-400" />
                <span className="font-bold font-sans">Dinkes Supabase Log Stream Terminal</span>
              </div>
              <button
                onClick={() => setSupabaseLogs(['[TERMINAL RESET] Monitor Supabase siap.'])}
                className="text-slate-500 hover:text-slate-300 hover:bg-slate-800 px-2 py-0.5 rounded text-[10px] transition cursor-pointer"
              >
                Clear Screen
              </button>
            </div>
            
            <div className="max-h-48 overflow-y-auto space-y-1 font-mono">
              {supabaseLogs.map((log, idx) => (
                <div key={idx} className={log.startsWith('❌') ? 'text-rose-450' : log.startsWith('✅') ? 'text-emerald-450 font-bold' : log.startsWith('⚠️') ? 'text-amber-450' : 'text-slate-300'}>
                  {log}
                </div>
              ))}
            </div>
          </div>

          {/* Manual Copyable SQL Deployment Instructions */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-left space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest font-display flex items-center space-x-1.5">
                  <span className="w-1.5 h-3.5 bg-sky-500 rounded-full inline-block"></span>
                  <span>Script SQL Setup & Migrasi Supabase Console</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Gunakan script di bawah untuk menghapus tabel usang (Clean Slate) dan membuat tabel baru yang mendukung penuh SIMPEG
                </p>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(DATABASE_MIGRATION_SQL_SCRIPT);
                  setCopydone(true);
                  setTimeout(() => setCopydone(false), 3000);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-sm cursor-pointer border ${copydone ? 'bg-emerald-50 text-emerald-600 border-emerald-300' : 'bg-slate-900 hover:bg-slate-850 text-white border-transparent'}`}
              >
                <Copy size={13} />
                <span>{copydone ? "Tersalin!" : "Salin Script SQL"}</span>
              </button>
            </div>

            {/* Instruction list */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="text-xs font-bold text-slate-800">Langkah-Langkah Setup Database Baru:</div>
              <ol className="list-decimal pl-4 text-xs text-slate-600 space-y-1">
                <li>Buka Dashboard akun <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline font-semibold">Supabase.com</a> dan buka Project Anda.</li>
                <li>Pilih menu <span className="font-semibold text-slate-800">SQL Editor</span> di sidebar kiri dashboard Supabase Anda.</li>
                <li>Klik tombol <span className="font-semibold text-slate-800">+ New Query</span> untuk membuka lembar kerja kosong.</li>
                <li>Klik tombol <span className="font-semibold text-sky-600">"Salin Script SQL"</span> di kanan atas panel ini.</li>
                <li>Tempel (Paste / Ctrl+V) seluruh script tersebut di dalam jendela SQL Editor Supabase Anda.</li>
                <li>Klik tombol <span className="font-semibold text-slate-800">Run (Ctrl+Enter)</span> di kanan bawah untuk mengeksekusi migrasi.</li>
                <li>Setelah berhasil, kembali ke tab ini dan klik tombol <span className="font-semibold text-emerald-600">"Kirim Data ke Supabase Cloud"</span> di atas untuk mentransfer seluruh database lokal Anda ke cloud.</li>
              </ol>
            </div>

            {/* Code Box container */}
            <div className="relative">
              <div className="absolute top-2 right-2 bg-slate-105 border border-slate-200 text-[10px] text-slate-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider pointer-events-none select-none">
                PostgreSql Script
              </div>
              <textarea
                readOnly
                value={DATABASE_MIGRATION_SQL_SCRIPT}
                className="w-full h-48 bg-[#0f172a] text-[#38bdf8] p-4 rounded-xl font-mono text-[10px] leading-relaxed border border-slate-800 shadow-inner select-all resize-none focus:outline-none"
              />
            </div>
            
          </div>

        </div>
      )}

      {/* ======================= MODAL: CUSTOM CONFIRMATION DIALOG ======================= */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 text-center font-sans">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-50 text-yellow-600 mb-4 border border-yellow-200 animate-pulse">
              <AlertCircle size={24} />
            </div>
            <h4 className="font-bold font-display text-base uppercase tracking-wide text-slate-900">{confirmDialog.title}</h4>
            
            <div className="bg-yellow-50/70 border border-yellow-200 rounded-xl p-4 my-3 text-left">
              <p className="text-xs text-slate-800 leading-relaxed font-sans">
                {confirmDialog.message}
              </p>
              {confirmDialog.warningMessage && (
                <p className="text-[10px] text-yellow-850 bg-yellow-100 p-2 rounded-lg border border-yellow-300/60 mt-2 font-semibold leading-normal font-sans">
                  {confirmDialog.warningMessage}
                </p>
              )}
            </div>

            <div className="mt-6 flex space-x-3 justify-center">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-900 rounded-lg text-xs font-bold transition cursor-pointer shadow-md"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= IN-APP SUCCESS TOAST ======================= */}
      {successToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-white border border-yellow-500/30 px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="h-2 w-2 rounded-full bg-yellow-500 animate-ping mr-1" />
          <div className="bg-yellow-50/70 border border-yellow-200/50 px-3 py-1.5 rounded-lg">
            <span className="text-xs font-medium text-slate-800">
              {successToast.split(/("[^"]*")/g).map((part, index) => {
                if (part.startsWith('"') && part.endsWith('"')) {
                  return <span key={index} className="text-yellow-600 font-bold">{part}</span>;
                }
                if (index === 0 && (part.startsWith('✓') || part.startsWith('⚠️') || part.startsWith('❌'))) {
                  const icon = part[0];
                  const rest = part.slice(1);
                  return (
                    <span key={index}>
                      <span className="text-yellow-600 font-bold mr-1">{icon}</span>
                      <span className="text-slate-800">{rest}</span>
                    </span>
                  );
                }
                return <span key={index} className="text-slate-800">{part}</span>;
              })}
            </span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-slate-400 hover:text-slate-800 text-xs font-bold pl-2 cursor-pointer">×</button>
        </div>
      )}

    </div>
  );
}

// ======================= HELPER METHODS FOR SUPABASE INTEGRATION =======================

function supabaseTestingOrCheckedState(loading: boolean, result: { success: boolean; message: string; mode: string } | null) {
  if (loading) {
    return (
      <span className="text-xs text-slate-500 inline-flex items-center space-x-1 font-sans font-medium">
        <RefreshCw className="animate-spin text-sky-500 mr-1.5" size={12} />
        <span>Menghubungkan...</span>
      </span>
    );
  }
  if (!result) {
    return (
      <span className="text-xs text-slate-400 font-sans font-medium">Belum diuji</span>
    );
  }
  if (result.success) {
    return (
      <span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-bold border border-emerald-200 inline-flex items-center space-x-1 font-sans">
        <CheckSquare size={12} className="text-emerald-600 mr-1" />
        <span>Koneksi Aktif</span>
      </span>
    );
  }
  return (
    <span className="text-xs text-rose-600 bg-rose-55 border border-rose-200 px-2.5 py-1 rounded-full font-bold inline-flex items-center space-x-1 font-sans" title={result.message}>
      <span>Akses Terblokir / Offline</span>
    </span>
  );
}

const DATABASE_MIGRATION_SQL_SCRIPT = `-- UNIFIED CLEAN RESET & INSTALLATION SCRIPT FOR SIMPEG SUPABASE LOMBOK BARAT

-- 1. DROP ALL OLD TABLES IN CORRECT FOREIGN KEY DEPENDENCY ORDER
DROP TABLE IF EXISTS usulan_dokumen_file CASCADE;
DROP TABLE IF EXISTS usulan_layanan CASCADE;
DROP TABLE IF EXISTS arsip_kepegawaian CASCADE;
DROP TABLE IF EXISTS riwayat_ak CASCADE;
DROP TABLE IF EXISTS laporan_sdmk CASCADE;
DROP TABLE IF EXISTS asn_profiles CASCADE;
DROP TABLE IF EXISTS syarat_fitur_map CASCADE;
DROP TABLE IF EXISTS dokumen CASCADE;
DROP TABLE IF EXISTS fitur CASCADE;
DROP TABLE IF EXISTS profesi_sdmk CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS puskesmas CASCADE;

-- 2. CREATE MASTER TABLES
CREATE TABLE puskesmas (
    id SERIAL PRIMARY KEY,
    kode_puskesmas VARCHAR(50) UNIQUE NOT NULL,
    nama_puskesmas VARCHAR(255) NOT NULL,
    alamat TEXT
);

CREATE TABLE profesi_sdmk (
    id SERIAL PRIMARY KEY,
    nama_profesi VARCHAR(255) NOT NULL
);

CREATE TABLE fitur (
    id SERIAL PRIMARY KEY,
    nama_fitur VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    warning_threshold_bulan INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    konfigurasi_tambahan TEXT
);

CREATE TABLE dokumen (
    id SERIAL PRIMARY KEY,
    nama_dokumen VARCHAR(255) NOT NULL,
    kata_kunci_ocr TEXT NOT NULL
);

CREATE TABLE syarat_fitur_map (
    id_fitur INT REFERENCES fitur(id) ON DELETE CASCADE,
    id_dokumen INT REFERENCES dokumen(id) ON DELETE CASCADE,
    PRIMARY KEY (id_fitur, id_dokumen)
);

CREATE TABLE asn_profiles (
    id SERIAL PRIMARY KEY,
    nip VARCHAR(55) UNIQUE NOT NULL,
    nama_lengkap VARCHAR(255) NOT NULL,
    gelar_belakang VARCHAR(50),
    id_puskesmas INT REFERENCES puskesmas(id) ON DELETE SET NULL,
    tanggal_lahir DATE NOT NULL,
    golongan_ruang VARCHAR(50) NOT NULL,
    tmt_pangkat_terakhir DATE NOT NULL,
    tmt_berkala_terakhir DATE NOT NULL,
    tmt_jabatan_terakhir DATE NOT NULL,
    jenis_pegawai VARCHAR(50) NOT NULL,
    jenjang_jafung VARCHAR(100),
    ak_integrasi_2022 NUMERIC(10, 2) DEFAULT 0,
    sisa_cuti_tahunan INT DEFAULT 12,
    status_kepegawaian VARCHAR(50) NOT NULL,
    jenis_kelamin VARCHAR(5) NOT NULL,
    status_pegawai_detail VARCHAR(100) NOT NULL,
    id_profesi INT REFERENCES profesi_sdmk(id) ON DELETE SET NULL,
    pangkat_nama VARCHAR(150),
    pns_jenis_kenaikan_pangkat VARCHAR(255),
    pns_masa_kerja_golongan VARCHAR(100),
    pns_tmt_golongan DATE,
    pns_no_pertek_bkn VARCHAR(100),
    pns_tgl_pertek_bkn DATE,
    pns_no_sk VARCHAR(100),
    pns_tgl_sk DATE,
    pns_nama_jabatan VARCHAR(255),
    pns_jenis_jabatan VARCHAR(255),
    pns_jenis_mutasi VARCHAR(255),
    pns_tmt_jabatan DATE,
    pns_instansi_kerja VARCHAR(255),
    pns_instansi_induk VARCHAR(255),
    pns_satker VARCHAR(255),
    pns_satker_induk VARCHAR(255),
    pns_unor VARCHAR(255),
    pns_unor_induk VARCHAR(255),
    pns_no_sk_jabatan VARCHAR(100),
    pns_tgl_sk_jabatan DATE,
    pns_instansi_pembina VARCHAR(255),
    pppk_ni VARCHAR(100),
    pppk_no_perjanjian VARCHAR(100),
    pppk_tgl_perjanjian DATE,
    pppk_tmt_perjanjian_mulai DATE,
    pppk_tmt_perjanjian_selesai DATE,
    pppk_tmt_golongan DATE,
    pppk_no_sk VARCHAR(100),
    pppk_tgl_sk DATE,
    pppk_instansi_kerja VARCHAR(255),
    pppk_instansi_induk VARCHAR(255),
    pppk_satker VARCHAR(255),
    pppk_unor VARCHAR(255),
    pppk_jabatan VARCHAR(255),
    pppk_golongan VARCHAR(50),
    nik VARCHAR(50),
    pkwt_tmt_sk DATE,
    pkwt_no_sk_kontrak VARCHAR(100),
    pkwt_tgl_sk_kontrak DATE,
    pkwt_masa_kerja VARCHAR(100),
    pkwt_pembiayaan VARCHAR(20),
    pkwt_jabatan VARCHAR(255),
    pppw_jumlah_jam_kerja_per_minggu INT,
    pppw_surat_kesepakatan_file TEXT,
    no_str VARCHAR(100),
    tanggal_terbit_str DATE,
    tanggal_akhir_str DATE,
    is_str_seumur_hidup BOOLEAN DEFAULT FALSE,
    no_sip VARCHAR(100),
    tanggal_terbit_sip DATE,
    tanggal_akhir_sip DATE,
    kp4_status_pernikahan VARCHAR(50),
    kp4_nik_pasangan VARCHAR(50),
    kp4_nama_pasangan VARCHAR(255),
    kp4_pasangan_asn BOOLEAN,
    kp4_pasangan_nip VARCHAR(50),
    kp4_pasangan_kerja_instansi VARCHAR(255),
    kp4_pasangan_tunjangan_diklaim BOOLEAN,
    kp4_tahun_validasi INT,
    kp4_tanggal_validasi DATE,
    kp4_berkas_file_name TEXT,
    kp4_berkas_file_path TEXT,
    kp4_daftar_anak TEXT
);

CREATE TABLE usulan_layanan (
    id SERIAL PRIMARY KEY,
    id_fitur INT REFERENCES fitur(id) ON DELETE CASCADE,
    id_asn INT REFERENCES asn_profiles(id) ON DELETE CASCADE,
    id_puskesmas_pengusul INT REFERENCES puskesmas(id) ON DELETE CASCADE,
    tanggal_pengusulan TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Draft',
    catatan_perbaikan TEXT,
    file_sk_final TEXT
);

CREATE TABLE usulan_dokumen_file (
    id SERIAL PRIMARY KEY,
    id_usulan INT REFERENCES usulan_layanan(id) ON DELETE CASCADE,
    id_dokumen INT REFERENCES dokumen(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ocr_status VARCHAR(30) DEFAULT 'GENERIC_PASS',
    ocr_feedback_message TEXT,
    data_url TEXT,
    text_ocr_result TEXT
);

CREATE TABLE riwayat_ak (
    id SERIAL PRIMARY KEY,
    id_asn INT REFERENCES asn_profiles(id) ON DELETE CASCADE,
    tahun_skp INT NOT NULL,
    predikat_skp VARCHAR(50) NOT NULL,
    ak_diperoleh NUMERIC(10, 2) NOT NULL
);

CREATE TABLE laporan_sdmk (
    id SERIAL PRIMARY KEY,
    id_puskesmas INT REFERENCES puskesmas(id) ON DELETE CASCADE,
    periode_bulan INT NOT NULL CHECK(periode_bulan BETWEEN 1 AND 12),
    periode_tahun INT NOT NULL,
    id_profesi INT REFERENCES profesi_sdmk(id) ON DELETE CASCADE,
    pns_l INT DEFAULT 0,
    pns_p INT DEFAULT 0,
    p3k_pn_l INT DEFAULT 0,
    p3k_pn_p INT DEFAULT 0,
    p3k_pw_l INT DEFAULT 0,
    p3k_pw_p INT DEFAULT 0,
    non_asn_l INT DEFAULT 0,
    non_asn_p INT DEFAULT 0
);

CREATE TABLE arsip_kepegawaian (
    id SERIAL PRIMARY KEY,
    id_asn INT REFERENCES asn_profiles(id) ON DELETE CASCADE,
    nama_berkas VARCHAR(255) NOT NULL,
    kategori_kelompok VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(50) DEFAULT 'Upload Kerja',
    notes TEXT,
    str_expired_date DATE,
    pkwt_tahun INT
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    nip VARCHAR(55) UNIQUE NOT NULL,
    nama_lengkap VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin_puskesmas',
    id_puskesmas INT REFERENCES puskesmas(id) ON DELETE SET NULL
);

-- 3. DISABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES & CREATE PERMISSIVE PUBLIC ACCESS POLICIES
ALTER TABLE puskesmas DISABLE ROW LEVEL SECURITY;
ALTER TABLE profesi_sdmk DISABLE ROW LEVEL SECURITY;
ALTER TABLE fitur DISABLE ROW LEVEL SECURITY;
ALTER TABLE dokumen DISABLE ROW LEVEL SECURITY;
ALTER TABLE syarat_fitur_map DISABLE ROW LEVEL SECURITY;
ALTER TABLE asn_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE usulan_layanan DISABLE ROW LEVEL SECURITY;
ALTER TABLE usulan_dokumen_file DISABLE ROW LEVEL SECURITY;
ALTER TABLE riwayat_ak DISABLE ROW LEVEL SECURITY;
ALTER TABLE laporan_sdmk DISABLE ROW LEVEL SECURITY;
ALTER TABLE arsip_kepegawaian DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Create Open Fallback Policies (in case RLS remains active)
DROP POLICY IF EXISTS public_puskesmas ON puskesmas;
CREATE POLICY public_puskesmas ON puskesmas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS public_profesi_sdmk ON profesi_sdmk;
CREATE POLICY public_profesi_sdmk ON profesi_sdmk FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS public_fitur ON fitur;
CREATE POLICY public_fitur ON fitur FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS public_dokumen ON dokumen;
CREATE POLICY public_dokumen ON dokumen FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS public_syarat_fitur_map ON syarat_fitur_map;
CREATE POLICY public_syarat_fitur_map ON syarat_fitur_map FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS public_asn_profiles ON asn_profiles;
CREATE POLICY public_asn_profiles ON asn_profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS public_usulan_layanan ON usulan_layanan;
CREATE POLICY public_usulan_layanan ON usulan_layanan FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS public_usulan_dokumen_file ON usulan_dokumen_file;
CREATE POLICY public_usulan_dokumen_file ON usulan_dokumen_file FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS public_riwayat_ak ON riwayat_ak;
CREATE POLICY public_riwayat_ak ON riwayat_ak FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS public_laporan_sdmk ON laporan_sdmk;
CREATE POLICY public_laporan_sdmk ON laporan_sdmk FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS public_arsip_kepegawaian ON arsip_kepegawaian;
CREATE POLICY public_arsip_kepegawaian ON arsip_kepegawaian FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS public_users ON users;
CREATE POLICY public_users ON users FOR ALL USING (true) WITH CHECK (true);

-- 4. SEED DATA WITH MASTER STATICS FOR INTEGRATED SYSTEM APP
INSERT INTO puskesmas (id, kode_puskesmas, nama_puskesmas, alamat) VALUES
(100, 'D520100', 'Dinas Kesehatan PPKB', 'Jl. Giri Menang Raya No. 1, Gerung, Lombok Barat'),
(1, 'P520101', 'Puskesmas Gerung', 'Jl. Ki Hajar Dewantara No. 12, Gerung, Lombok Barat'),
(2, 'P520102', 'Puskesmas Narmada', 'Jl. Raya Narmada No. 45, Narmada, Lombok Barat'),
(3, 'P520103', 'Puskesmas Kediri', 'Jl. TGH Abdul Karim, Kediri, Lombok Barat'),
(4, 'P520104', 'Puskesmas Gunungsari', 'Jl. Raya Gunungsari No. 8, Gunungsari, Lombok Barat'),
(5, 'P520105', 'Puskesmas Lingsar', 'Jl. Raya Lingsar, Lingsar, Lombok Barat')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profesi_sdmk (id, nama_profesi) VALUES
(1, 'Perawat'),
(2, 'Dokter'),
(3, 'Dokter Gigi'),
(4, 'Bidan'),
(5, 'Apoteker'),
(6, 'Tenaga Teknik Kefarmasian'),
(7, 'Tenaga Promosi Kesehatan & Ilmu Perilaku'),
(8, 'Sanitarian (Kesehatan Lingkungan)'),
(9, 'Nutrisionis (Tenaga Gizi)'),
(10, 'Ahli Teknologi Laboratorium Medik'),
(11, 'Tenaga Rekam Medis & Informasi Kes.'),
(12, 'Terapis Gigi & Mulut'),
(13, 'Administrasi Umum & Kepegawaian'),
(14, 'Tenaga Adm. Keuangan'),
(15, 'Tenaga Sistem Informasi Kesehatan')
ON CONFLICT (id) DO NOTHING;

INSERT INTO fitur (id, nama_fitur, slug, warning_threshold_bulan, is_active, konfigurasi_tambahan) VALUES
(1, 'Kenaikan Pangkat', 'kenaikan-pangkat', 4, true, 'Kenaikan Golongan Ruang PNS Berdasar Masa Kerja dan Kinerja'),
(2, 'Pensiun', 'pensiun', 6, true, 'Usulan Pensiun Pegawai Negeri Sipil'),
(3, 'Usul Gaji Berkala', 'gaji-berkala', 2, true, 'Kenaikan Gaji Berkala Periodik (Setiap 2 Tahun sekali)'),
(4, 'Cuti Kepegawaian', 'cuti', 0, true, 'Pengurangan Sisa Hari Hak Cuti Tahunan Pegawai'),
(5, 'Izin Belajar', 'izin-belajar', 0, true, 'Persetujuan Melanjutkan Pendidikan Formal bagi PNS/TKN'),
(6, 'Mutasi Internal', 'mutasi', 0, true, 'Alih Tugas Penempatan Pelayanan Puskesmas Lombok Barat'),
(7, 'Pencantuman Gelar', 'pencantuman-gelar', 0, true, 'Penyetaraan Ijazah Pendidikan Formal Tenaga Kesehatan di SIMPEG'),
(8, 'Uji Kompetensi', 'uji-kompetensi', 0, true, 'Sertifikasi Jenjang Tingkat Karir ASN'),
(9, 'Usulan Jafung & Angka Kredit', 'usulan-jafung', 0, true, 'Sertifikasi Jenjang Fungsional Baru (Uji Kompetensi BKN)'),
(11, 'Pelaporan Keadaan SDMK Bulanan', 'keadaan-sdmk', 0, true, 'Rekapitulasi SDMK Bulanan')
ON CONFLICT (id) DO NOTHING;

INSERT INTO dokumen (id, nama_dokumen, kata_kunci_ocr) VALUES
(1, 'Surat Pengantar Kepsek Puskesmas', 'SURAT PENGANTAR, KEPALA PUSKESMAS, DINKES'),
(2, 'SK Pangkat Terakhir', 'KEPUTUSAN BUPATI, KENAIKAN PANGKAT, GOLONGAN'),
(3, 'PAK (Penetapan Angka Kredit)', 'ANGKA KREDIT, KOMULATIF, JAFUNG, JABATAN'),
(4, 'Penilaian Prestasi Kerja (SKP) 2 Tahun', 'SASARAN KINERJA PEGAWAI, PRESTASI KERJA, BAIK'),
(5, 'Surat Permohonan Pensiun', 'PERMOHONAN PENSIUN, APS, BUP, KELUARGA'),
(6, 'Data Riwayat Hidup / Buku Nikah', 'DAFTAR RIWAYAT HIDUP, NIKAH, KELUARGA, ANAK'),
(7, 'SK Kenaikan Gaji Berkala Terakhir', 'GAJI BERKALA, GAJI POKOK, TMT BERKALA'),
(8, 'Surat Permohonan Cuti', 'PERMOHONAN CUTI, TAHUNAN, SAKIT, ALASAN PENTING'),
(9, 'Rekomendasi Mutasi', 'REKOMENDASI MUTASI, PERSETUJUAN KEPALA, PINDAH'),
(10, 'Ijazah Baru / Transkrip Nilai', 'IJAZAH, GELAR AKADEMIK, SARJANA, DIPLOMA'),
(11, 'Sertifikat Kelulusan Uji Kompetensi', 'SERTIFIKAT KELULUSAN, UJI KOMPETENSI, UKOM, JAFUNG')
ON CONFLICT (id) DO NOTHING;

INSERT INTO syarat_fitur_map (id_fitur, id_dokumen) VALUES
(1, 1), (1, 2), (1, 3), (1, 4),
(2, 1), (2, 5), (2, 6),
(3, 1), (3, 7),
(4, 1), (4, 8),
(5, 1), (5, 10),
(6, 1), (6, 9),
(7, 1), (7, 10),
(8, 1), (8, 11),
(9, 1), (9, 3), (9, 4), (9, 11)
ON CONFLICT DO NOTHING;
`;
