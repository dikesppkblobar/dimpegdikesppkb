/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  Layers, 
  FileText, 
  Users, 
  Sliders, 
  ShieldAlert, 
  RefreshCw,
  Search,
  CheckCircle,
  Database,
  Shield,
  Plus,
  Table,
  Upload,
  UserCheck,
  AlertCircle,
  FolderCheck,
  AlertTriangle,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { getDB, saveDB, initializeDB } from './mockData';
import { 
  Puskesmas, 
  ASNProfile, 
  MasterFitur, 
  MasterDokumen, 
  UsulanLayanan, 
  RiwayatAngkaKredit, 
  MasterProfesiSDMK,
  StatusPegawaiDetail,
  JenisPegawai,
  JenisKelamin
} from './types';

// Importing Custom Component Views
import DashboardOverview from './components/DashboardOverview';
import LayananKepegawaian from './components/LayananKepegawaian';
import LaporanSDMK from './components/LaporanSDMK';
import DinkesManagement from './components/DinkesManagement';
import ArsipKepegawaianView from './components/ArsipKepegawaianView';
import { pushClientDataToSupabase, pullCloudDataFromSupabase, testSupabaseConnection } from './lib/supabase';
import { formatDate, addYearsToDateString } from './utils';

const GOLONGAN_TO_PANGKAT: Record<string, string> = {
  "I/a": "Juru Muda",
  "I/b": "Juru Muda Tk. I",
  "I/c": "Juru",
  "I/d": "Juru Tk. I",
  "II/a": "Pengatur Muda",
  "II/b": "Pengatur Muda Tk. I",
  "II/c": "Pengatur",
  "II/d": "Pengatur Tk. I",
  "III/a": "Penata Muda",
  "III/b": "Penata Muda Tk. I",
  "III/c": "Penata",
  "III/d": "Penata Tk. I",
  "IV/a": "Pembina",
  "IV/b": "Pembina Tk. I",
  "IV/c": "Pembina Utama Muda",
  "IV/d": "Pembina Utama Madya",
  "IV/e": "Pembina Utama"
};

const LIST_GOLONGAN_PNS = [
  "I/a", "I/b", "I/c", "I/d",
  "II/a", "II/b", "II/c", "II/d",
  "III/a", "III/b", "III/c", "III/d",
  "IV/a", "IV/b", "IV/c", "IV/d", "IV/e"
];

const getNextGolonganDescription = (golongan: string) => {
  const index = LIST_GOLONGAN_PNS.indexOf(golongan);
  if (index !== -1 && index < LIST_GOLONGAN_PNS.length - 1) {
    const nextGol = LIST_GOLONGAN_PNS[index + 1];
    const nextPangkat = GOLONGAN_TO_PANGKAT[nextGol];
    return `Kenaikan Pangkat ke ${nextGol} (${nextPangkat})`;
  }
  return '-';
};

export default function App() {
  const [dbState, setDbState] = useState(() => getDB());
  const [isLoadingSupabase, setIsLoadingSupabase] = useState(true);
  const [supabaseStatus, setSupabaseStatus] = useState<string>('Memulai Sistem...');
  const [isPullingRef] = useState({ current: false });

  // Initial local initialization
  useEffect(() => {
    initializeDB();
  }, []);

  // Direct Startup fetching from Supabase without local savings
  useEffect(() => {
    const fetchDirectlyOnStartup = async () => {
      try {
        setIsLoadingSupabase(true);
        setSupabaseStatus('Mengecek konektivitas database Supabase Lombok Barat...');
        const conn = await testSupabaseConnection();
        if (!conn.success) {
          console.warn("Koneksi Supabase belum siap, menggunakan database lokal.");
          setSupabaseStatus('Database Supabase belum terkonfigurasi. Menggunakan Offline Mode...');
          setIsLoadingSupabase(false);
          return;
        }

        setSupabaseStatus('Menarik data langsung dari tabel cloud Supabase...');
        const res = await pullCloudDataFromSupabase();
        if (res.success && res.data) {
          const hasProfiles = res.data.asnProfiles && res.data.asnProfiles.length > 0;
          
          if (!hasProfiles) {
            setSupabaseStatus('Tabel Supabase kosong. Melakukan inisialisasi seeding data awal...');
            const defaultData = getDB();
            await pushClientDataToSupabase(defaultData);
            
            const refetch = await pullCloudDataFromSupabase();
            if (refetch.success && refetch.data) {
              setDbState(refetch.data);
            } else {
              setDbState(defaultData);
            }
          } else {
            setDbState(res.data);
          }
          setSuccessToast("⚡ Terkoneksi Supabase: Seluruh data live ditarik langsung dari cloud!");
        } else {
          setSupabaseStatus('Gagal mengambil data dari Supabase. Menggunakan data lokal...');
        }
      } catch (err: any) {
        console.error("Gagal memuat database Supabase pada startup:", err);
        setSupabaseStatus('Terjadi kesalahan memuat database dari Supabase. Menggunakan data lokal...');
      } finally {
        setIsLoadingSupabase(false);
      }
    };
    fetchDirectlyOnStartup();
  }, []);

  // Custom unified save and sync mechanism that updates memory and pushes directly to Supabase
  const saveAndSync = async (changedState: Partial<typeof dbState> & Record<string, any>) => {
    // 1. Persist locally to localStorage immediately (safety offline backup)
    saveDB(changedState);

    // 2. Update React component state atomically using a functional state updater to prevent race conditions & stale state overwrites
    setDbState(prev => {
      return { 
        ...prev, 
        ...changedState 
      };
    });

    // 3. Directly push ONLY updated records to Supabase in the background (reading synchronously from the updated localStorage)
    const keysToSync = Object.keys(changedState);
    pushClientDataToSupabase(null, keysToSync).catch(e => {
      console.error("Kesalahan sinkronisasi data ke Supabase:", e);
    });
  };

  const [activeTab, setActiveTab] = useState<string>('dasbor');

  // Multi-Tenant Acting User states
  const [currentRole, setCurrentRole] = useState<'admin_dinkes' | 'admin_puskesmas'>('admin_dinkes');
  const [selectedPuskesmasId, setSelectedPuskesmasId] = useState<number>(1); // e.g. Gerung

  // Renbut State
  const [renbutList, setRenbutList] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('renbut_data_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      }
    } catch {}

    const startYear = 2023;
    const currentYearVal = new Date().getFullYear();
    const makeProj = (keb: number) => {
      const proj: Record<number, number> = {};
      for (let yr = startYear; yr <= currentYearVal; yr++) {
        const delta = yr - 2026;
        proj[yr] = Math.max(1, keb + Math.round(delta * 0.4));
      }
      return proj;
    };

    return [
      { id: '1', id_puskesmas: 1, jab_fungsional: 'PERAWAT', jenjang: 'Terampil', asn: 4, nonAsn: 3, kebutuhan: 9, kesenjangan: -2, keterangan: 'K', standarMinimal: 9, abkKebutuhan: 8.5, projection: makeProj(9) },
      { id: '2', id_puskesmas: 1, jab_fungsional: 'BIDAN', jenjang: 'Terampil', asn: 3, nonAsn: 2, kebutuhan: 6, kesenjangan: -1, keterangan: 'K', standarMinimal: 6, abkKebutuhan: 5.4, projection: makeProj(6) },
      { id: '3', id_puskesmas: 1, jab_fungsional: 'DOKTER', jenjang: 'Ahli Pertama', asn: 2, nonAsn: 1, kebutuhan: 3, kesenjangan: 0, keterangan: 'S', standarMinimal: 3, abkKebutuhan: 2.8, projection: makeProj(3) },
      
      { id: '4', id_puskesmas: 2, jab_fungsional: 'PERAWAT', jenjang: 'Terampil', asn: 5, nonAsn: 4, kebutuhan: 10, kesenjangan: -1, keterangan: 'K', standarMinimal: 10, abkKebutuhan: 9.5, projection: makeProj(10) },
      { id: '5', id_puskesmas: 2, jab_fungsional: 'BIDAN', jenjang: 'Terampil', asn: 4, nonAsn: 3, kebutuhan: 8, kesenjangan: -1, keterangan: 'K', standarMinimal: 8, abkKebutuhan: 7.6, projection: makeProj(8) },
      
      { id: '6', id_puskesmas: 3, jab_fungsional: 'PERAWAT', jenjang: 'Terampil', asn: 3, nonAsn: 2, kebutuhan: 7, kesenjangan: -2, keterangan: 'K', standarMinimal: 7, abkKebutuhan: 6.6, projection: makeProj(7) },
      { id: '7', id_puskesmas: 3, jab_fungsional: 'DOKTER', jenjang: 'Ahli Pertama', asn: 1, nonAsn: 1, kebutuhan: 2, kesenjangan: 0, keterangan: 'S', standarMinimal: 2, abkKebutuhan: 1.9, projection: makeProj(2) },
      
      { id: '8', id_puskesmas: 4, jab_fungsional: 'BIDAN', jenjang: 'Terampil', asn: 2, nonAsn: 2, kebutuhan: 5, kesenjangan: -1, keterangan: 'K', standarMinimal: 5, abkKebutuhan: 4.7, projection: makeProj(5) },
      { id: '9', id_puskesmas: 4, jab_fungsional: 'NUTRISIONIS', jenjang: 'Ahli Pertama', asn: 1, nonAsn: 0, kebutuhan: 2, kesenjangan: -1, keterangan: 'K', standarMinimal: 2, abkKebutuhan: 1.8, projection: makeProj(2) },
      
      { id: '10', id_puskesmas: 5, jab_fungsional: 'PERAWAT', jenjang: 'Terampil', asn: 2, nonAsn: 3, kebutuhan: 6, kesenjangan: -1, keterangan: 'K', standarMinimal: 6, abkKebutuhan: 5.7, projection: makeProj(6) },
      { id: '11', id_puskesmas: 5, jab_fungsional: 'BIDAN', jenjang: 'Terampil', asn: 3, nonAsn: 1, kebutuhan: 4, kesenjangan: 0, keterangan: 'S', standarMinimal: 4, abkKebutuhan: 3.8, projection: makeProj(4) },
    ];
  });

  const updateRenbutList = (newList: any[]) => {
    setRenbutList(newList);
    localStorage.setItem('renbut_data_list', JSON.stringify(newList));
  };
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState<boolean>(false);

  // PWA & Notification API State & Logic
  const [notifPermission, setNotifPermission] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  // 1. Register Service Worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          console.log('⚡ SIMPEG PWA Service Worker Registered:', reg.scope);
        })
        .catch(err => {
          console.warn('❌ SIMPEG PWA Service Worker failure:', err);
        });
    }
  }, []);

  // 2. Trigger native hardware/OS level notifications securely
  const triggerNativeNotification = (title: string, body: string) => {
    if (!('Notification' in window)) {
      console.warn("Device tidak mendukung Notification API.");
      return;
    }

    const showNotification = () => {
      // Android / iOS standalone PWA require notifications through the registered service worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
          if (reg.active) {
            reg.active.postMessage({
              type: 'SHOW_NATIVE_NOTIFICATION',
              payload: {
                title,
                body,
                icon: '/icon.svg',
                badge: '/icon.svg'
              }
            });
          } else {
            new Notification(title, { body, icon: '/icon.svg' });
          }
        }).catch(() => {
          new Notification(title, { body, icon: '/icon.svg' });
        });
      } else {
        new Notification(title, { body, icon: '/icon.svg' });
      }
    };

    if (Notification.permission === 'granted') {
      showNotification();
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        setNotifPermission(permission);
        if (permission === 'granted') {
          showNotification();
        }
      });
    }
  };

  // 3. User permission requester
  const requestNotificationPermission = () => {
    if (!('Notification' in window)) {
      alert("Browser atau perangkat Anda tidak mendukung notifikasi sistem.");
      return;
    }
    Notification.requestPermission().then(permission => {
      setNotifPermission(permission);
      if (permission === 'granted') {
        triggerNativeNotification(
          "🔔 Notifikasi Sistem Aktif", 
          "Terima kasih! Anda sekarang akan menerima peringatan dinas dan usulan layanan SIMPEG secara real-time di perangkat ini."
        );
      } else if (permission === 'denied') {
        alert("Notifikasi telah diblokir. Harap aktifkan izin notifikasi pada pengaturan browser Anda.");
      }
    });
  };

  // 4. Watch for hot new incoming notifications securely
  const prevNotificationsCountRef = useRef<number>((dbState.notifications || []).length);
  const initialLoadRef = useRef<boolean>(true);

  useEffect(() => {
    const rawNotifs = dbState.notifications || [];
    
    if (initialLoadRef.current) {
      prevNotificationsCountRef.current = rawNotifs.length;
      initialLoadRef.current = false;
      return;
    }

    const prevCount = prevNotificationsCountRef.current;
    prevNotificationsCountRef.current = rawNotifs.length;

    // Trigger only when new items are added to the list
    if (rawNotifs.length > prevCount) {
      const newest = rawNotifs[0]; // because unshifted
      if (newest && !newest.isRead) {
        const isMatch = newest.targetRole === currentRole && 
          (currentRole === 'admin_dinkes' || newest.targetPuskesmasId === selectedPuskesmasId);

        if (isMatch) {
          triggerNativeNotification(newest.title, newest.message);
        }
      }
    }
  }, [dbState.notifications, currentRole, selectedPuskesmasId]);

  // Filter queries for Pegawai roster table
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterUnitFilter, setRosterUnitFilter] = useState<number | string>('ALL'); // 'ALL' or specific ID
  const [rosterStatusFilter, setRosterStatusFilter] = useState<string>('ALL'); // 'ALL', 'PNS', etc.

  // Navigation parameters for deep links
  const [navAsnId, setNavAsnId] = useState<number | null>(null);
  const [navSlug, setNavSlug] = useState<string | null>(null);

  // Active editing employee state
  const [editingAsn, setEditingAsn] = useState<ASNProfile | null>(null);
  const [selectedProfileForDetail, setSelectedProfileForDetail] = useState<ASNProfile | null>(null);
  const [asnToDelete, setAsnToDelete] = useState<{ id: number; name: string } | null>(null);
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

  // Toggle state for Adding employee modes in the Roster view
  const [showAddForm, setShowAddForm] = useState(false);
  const [addMode, setAddMode] = useState<'single' | 'excel'>('single');

  // Single Pegawai Input Fields state
  const [newNip, setNewNip] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newGelar, setNewGelar] = useState('');
  const [newGender, setNewGender] = useState<JenisKelamin>('L');
  const [newStatusDetail, setNewStatusDetail] = useState<StatusPegawaiDetail>('PNS');
  const [newJenisPegawai, setNewJenisPegawai] = useState<JenisPegawai>('Jafung_Kesehatan');
  const [newProfesiId, setNewProfesiId] = useState<number>(1);
  const [newGolongan, setNewGolongan] = useState('III/a');
  const [newTanggalLahir, setNewTanggalLahir] = useState('1990-01-01');
  const [newUnitId, setNewUnitId] = useState<number>(1);

  // === Detail Inputs for PNS ===
  const [newPangkatNama, setNewPangkatNama] = useState('Penata Muda');
  const [newPnsJenisKenaikanPangkat, setNewPnsJenisKenaikanPangkat] = useState('Pilihan (Jabatan Fungsional Tertentu)');
  const [newPnsMasaKerjaGolongan, setNewPnsMasaKerjaGolongan] = useState('04 tahun 02 bulan');
  const [newPnsTmtGolongan, setNewPnsTmtGolongan] = useState('2025-04-01');
  const [newPnsNoPertekBkn, setNewPnsNoPertekBkn] = useState('');
  const [newPnsTglPertekBkn, setNewPnsTglPertekBkn] = useState('');
  const [newPnsNoSk, setNewPnsNoSk] = useState('');
  const [newPnsTglSk, setNewPnsTglSk] = useState('');
  const [newPnsNamaJabatan, setNewPnsNamaJabatan] = useState('');
  const [newPnsJenisJabatan, setNewPnsJenisJabatan] = useState('Jabatan Fungsional');
  const [newPnsJenisMutasi, setNewPnsJenisMutasi] = useState('Mutasi Jabatan');
  const [newPnsTmtJabatan, setNewPnsTmtJabatan] = useState('');
  const [newPnsInstansiKerja, setNewPnsInstansiKerja] = useState('Pemerintah Kab. Lombok Barat');
  const [newPnsInstansiInduk, setNewPnsInstansiInduk] = useState('Pemerintah Kab. Lombok Barat');
  const [newPnsSatker, setNewPnsSatker] = useState('Dinas Kesehatan, Pengendalian Penduduk, dan Keluarga Berencana');
  const [newPnsSatkerInduk, setNewPnsSatkerInduk] = useState('Dinas Kesehatan, Pengendalian Penduduk, dan Keluarga Berencana');
  const [newPnsUnor, setNewPnsUnor] = useState('UPT Puskesmas Sedau');
  const [newPnsUnorInduk, setNewPnsUnorInduk] = useState('UPT Puskesmas Sedau');
  const [newPnsNoSkJabatan, setNewPnsNoSkJabatan] = useState('');
  const [newPnsTglSkJabatan, setNewPnsTglSkJabatan] = useState('');
  const [newTmtBerkalaTerakhir, setNewTmtBerkalaTerakhir] = useState('2025-01-01');

  // === Detail Inputs for PPPK (Penuh / Paruh Waktu) ===
  const [newPppkNi, setNewPppkNi] = useState('');
  const [newPppkNoPerjanjian, setNewPppkNoPerjanjian] = useState('');
  const [newPppkTglPerjanjian, setNewPppkTglPerjanjian] = useState('');
  const [newPppkTmtPerjanjianMulai, setNewPppkTmtPerjanjianMulai] = useState('25-Jan-2025');
  const [newPppkTmtPerjanjianSelesai, setNewPppkTmtPerjanjianSelesai] = useState('25-Jan-2030');
  const [newPppkTmtGolongan, setNewPppkTmtGolongan] = useState('');
  const [newPppkNoSk, setNewPppkNoSk] = useState('');
  const [newPppkTglSk, setNewPppkTglSk] = useState('');
  const [newPppkInstansiKerja, setNewPppkInstansiKerja] = useState('Pemerintah Kab. Lombok Barat');
  const [newPppkInstansiInduk, setNewPppkInstansiInduk] = useState('Pemerintah Kab. Lombok Barat');
  const [newPppkSatker, setNewPppkSatker] = useState('Dinas Kesehatan, Pengendalian Penduduk, dan Keluarga Berencana');
  const [newPppkUnor, setNewPppkUnor] = useState('UPT Puskesmas Sedau');
  const [newPppkBknJabatan, setNewPppkBknJabatan] = useState('');
  const [newPppkBknGolongan, setNewPppkBknGolongan] = useState('IX');

  // === Detail Inputs for PKWT / Non-ASN ===
  const [newNik, setNewNik] = useState('');
  const [newPkwtTmtSk, setNewPkwtTmtSk] = useState('');
  const [newPkwtNoSkKontrak, setNewPkwtNoSkKontrak] = useState('');
  const [newPkwtTglSkKontrak, setNewPkwtTglSkKontrak] = useState('');
  const [newPkwtMasaKerja, setNewPkwtMasaKerja] = useState('');
  const [newPkwtPembiayaan, setNewPkwtPembiayaan] = useState<'APBD' | 'BLUD' | 'APBN'>('BLUD');
  const [newPkwtJabatan, setNewPkwtJabatan] = useState('');
  const [newSisaCuti, setNewSisaCuti] = useState(12);

  // === STR & SIP Fields ===
  const [newNoStr, setNewNoStr] = useState('');
  const [newTanggalTerbitStr, setNewTanggalTerbitStr] = useState('');
  const [newTanggalAkhirStr, setNewTanggalAkhirStr] = useState('');
  const [newIsStrSeumurHidup, setNewIsStrSeumurHidup] = useState(false);
  const [newNoSip, setNewNoSip] = useState('');
  const [newTanggalTerbitSip, setNewTanggalTerbitSip] = useState('');
  const [newTanggalAkhirSip, setNewTanggalAkhirSip] = useState('');

  // Auto-update Pangkat Nama & Jenis Kenaikan Pangkat for PNS when Golongan changes
  useEffect(() => {
    if (newStatusDetail === 'PNS') {
      const mappedPangkat = GOLONGAN_TO_PANGKAT[newGolongan];
      if (mappedPangkat) {
        setNewPangkatNama(mappedPangkat);
      }
      
      const golIndex = LIST_GOLONGAN_PNS.indexOf(newGolongan);
      const nextGolonganIdx = golIndex !== -1 && golIndex < LIST_GOLONGAN_PNS.length - 1 ? golIndex + 1 : -1;
      if (nextGolonganIdx !== -1) {
        const nextGolongan = LIST_GOLONGAN_PNS[nextGolonganIdx];
        const nextPangkat = GOLONGAN_TO_PANGKAT[nextGolongan];
        setNewPnsJenisKenaikanPangkat(`Kenaikan Pangkat ke ${nextGolongan} (${nextPangkat})`);
      } else {
        setNewPnsJenisKenaikanPangkat('-');
      }
    }
  }, [newGolongan, newStatusDetail]);

  const resetAddEmployeeForm = () => {
    setNewNip('');
    setNewNama('');
    setNewGelar('');
    setNewGender('L');
    setNewStatusDetail('PNS');
    setNewJenisPegawai('Jafung_Kesehatan');
    setNewProfesiId(1);
    setNewGolongan('III/a');
    setNewTanggalLahir('1990-01-01');
    setNewUnitId(currentRole === 'admin_puskesmas' ? (selectedPuskesmasId || 1) : 100);
    
    setNewPangkatNama('Penata Muda');
    setNewPnsJenisKenaikanPangkat('Pilihan (Jabatan Fungsional Tertentu)');
    setNewPnsMasaKerjaGolongan('04 tahun 02 bulan');
    setNewPnsTmtGolongan('2025-04-01');
    setNewPnsNoPertekBkn('');
    setNewPnsTglPertekBkn('');
    setNewPnsNoSk('');
    setNewPnsTglSk('');
    setNewPnsNamaJabatan('');
    setNewPnsJenisJabatan('Jabatan Fungsional');
    setNewPnsJenisMutasi('Mutasi Jabatan');
    setNewPnsTmtJabatan('');
    setNewPnsInstansiKerja('Pemerintah Kab. Lombok Barat');
    setNewPnsInstansiInduk('Pemerintah Kab. Lombok Barat');
    setNewPnsSatker('Dinas Kesehatan, Pengendalian Penduduk, dan Keluarga Berencana');
    setNewPnsSatkerInduk('Dinas Kesehatan, Pengendalian Penduduk, dan Keluarga Berencana');
    setNewPnsUnor('UPT Puskesmas Sedau');
    setNewPnsUnorInduk('UPT Puskesmas Sedau');
    setNewPnsNoSkJabatan('');
    setNewPnsTglSkJabatan('');
    setNewTmtBerkalaTerakhir('2025-01-01');

    setNewPppkNi('');
    setNewPppkNoPerjanjian('');
    setNewPppkTglPerjanjian('');
    setNewPppkTmtPerjanjianMulai('25-Jan-2025');
    setNewPppkTmtPerjanjianSelesai('25-Jan-2030');
    setNewPppkTmtGolongan('');
    setNewPppkNoSk('');
    setNewPppkTglSk('');
    setNewPppkInstansiKerja('Pemerintah Kab. Lombok Barat');
    setNewPppkInstansiInduk('Pemerintah Kab. Lombok Barat');
    setNewPppkSatker('Dinas Kesehatan, Pengendalian Penduduk, dan Keluarga Berencana');
    setNewPppkUnor('UPT Puskesmas Sedau');
    setNewPppkBknJabatan('');
    setNewPppkBknGolongan('IX');

    setNewNik('');
    setNewPkwtTmtSk('');
    setNewPkwtNoSkKontrak('');
    setNewPkwtTglSkKontrak('');
    setNewPkwtMasaKerja('');
    setNewPkwtPembiayaan('BLUD');
    setNewPkwtJabatan('');
    setNewSisaCuti(12);

    setNewNoStr('');
    setNewTanggalTerbitStr('');
    setNewTanggalAkhirStr('');
    setNewIsStrSeumurHidup(false);
    setNewNoSip('');
    setNewTanggalTerbitSip('');
    setNewTanggalAkhirSip('');

    setExcelPasteText('');
    setExcelParsedPreview([]);
    setExcelImportMessage('');
    setShowAddForm(false);
  };

  // Automatically reset the add employee form on account/role/unit switch
  useEffect(() => {
    resetAddEmployeeForm();
  }, [currentRole, selectedPuskesmasId]);

  // Excel Paste state
  const [excelPasteText, setExcelPasteText] = useState('');
  const [excelParsedPreview, setExcelParsedPreview] = useState<ASNProfile[]>([]);
  const [excelImportMessage, setExcelImportMessage] = useState('');

  // Dynamic role-based branding configurations
  const activeLogoUrl = currentRole === 'admin_dinkes'
    ? '/logo_lombok_barat.png'
    : 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhI2_4JTuV0cBDUDNkV-yt2ya_CWY-c3E9FfqlPWwJ0wtVq6mW2vDTtspPFY86kk2GCjWPjitjQzf1KFnt4pAI5nuEvePYAEqYA0BW_N4mq07nYiP1T1cyzdJFancz8puIMzq7ZBs9UArM/s1600/Logo+Puskesmas+Tanpa+Background.png';

  const activeFaviconUrl = currentRole === 'admin_dinkes'
    ? '/logo_lombok_barat.png'
    : 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhI2_4JTuV0cBDUDNkV-yt2ya_CWY-c3E9FfqlPWwJ0wtVq6mW2vDTtspPFY86kk2GCjWPjitjQzf1KFnt4pAI5nuEvePYAEqYA0BW_N4mq07nYiP1T1cyzdJFancz8puIMzq7ZBs9UArM/s1600/Logo+Puskesmas+Tanpa+Background.png';

  // Dynamically synchronize favicon url on body changes
  useEffect(() => {
    if (activeFaviconUrl) {
      try {
        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (!link) {
          link = document.createElement('link');
          link.type = 'image/x-icon';
          link.rel = 'shortcut icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = activeFaviconUrl;
      } catch (err) {
        console.log("No favicon bypass", err);
      }
    }
  }, [activeFaviconUrl]);

  // Helpers to persist modified local DB segments
  const updateProfiles = (updated: ASNProfile[]) => {
    saveAndSync({ asnProfiles: updated });
  };

  const handleDeleteEmployee = (id: number, name: string) => {
    setAsnToDelete({ id, name });
  };

  const handleUpdateEmployee = (updatedProfile: ASNProfile) => {
    const updated = dbState.asnProfiles.map(p => p.id === updatedProfile.id ? updatedProfile : p);
    updateProfiles(updated);
    setEditingAsn(null);
    setSuccessToast(`✓ Data pegawai "${updatedProfile.nama_lengkap}" berhasil diperbarui.`);
  };

  const updateUsulanLayanan = (updated: UsulanLayanan[]) => {
    // 1-Time Upload Copier System Framework: copy approved usulan files to main archival repository
    const previousUsulanList = dbState.usulanLayanan || [];
    const newlyCompletedUsulans = (updated || []).filter(u => {
      const prev = previousUsulanList.find(p => p.id === u.id);
      return u.status === 'Selesai' && (!prev || prev.status !== 'Selesai');
    });

    let currentArsip = [...(dbState.arsipKepegawaian || [])];
    let hasNewCopy = false;

    if (newlyCompletedUsulans.length > 0) {
      newlyCompletedUsulans.forEach(usulan => {
        const asn = dbState.asnProfiles.find(a => a.id === usulan.id_asn);
        if (!asn) return;

        const nextId = currentArsip.length > 0 ? Math.max(...currentArsip.map(a => a.id)) + 1 : 1;
        const feature = dbState.fitur.find(f => f.id === usulan.id_fitur);
        const featureName = feature ? feature.nama_fitur : "Layanan SIMPEG";

        let targetCategory: 'Dasar' | 'Mutasi' | 'Pendidikan' | 'Personal' | 'Kinerja' | 'PPPK_Khusus' | 'PKWT_Khusus' = 'Mutasi';
        if (feature?.slug === 'pencantuman-gelar' || feature?.slug === 'izin-belajar') {
          targetCategory = 'Pendidikan';
        } else if (feature?.slug === 'pensiun' || feature?.slug === 'cuti') {
          targetCategory = 'Personal';
        }

        // Auto-Copy SK file itself
        const isDuplicateSK = currentArsip.some(
          a => a.id_asn === usulan.id_asn && a.nama_berkas === `Surat Keputusan (SK) Final ${featureName}`
        );

        if (!isDuplicateSK) {
          currentArsip.push({
            id: nextId,
            id_asn: usulan.id_asn,
            nama_berkas: `Surat Keputusan (SK) Final ${featureName}`,
            kategori_kelompok: targetCategory,
            file_name: usulan.file_sk_final || `SK_${featureName.replace(/\s+/g, '_')}_Approved.pdf`,
            file_path: "AUTOCRAFT-SYSTEM-APPROVED-SK",
            uploaded_at: new Date().toISOString(),
            source: "Auto-Copy Usulan",
            notes: `Salinan Digital SK Pendukung keluaran Dinas Kesehatan PPKB atas usulan #${usulan.id}.`
          });
          hasNewCopy = true;
        }

        // Copy matching documents
        const attachments = dbState.usulanDokumenFile.filter(f => f.id_usulan === usulan.id);
        attachments.forEach((attach) => {
          const matchedDocObj = dbState.dokumen.find(d => d.id === attach.id_dokumen);
          const docName = matchedDocObj ? matchedDocObj.nama_dokumen : "Dokumen Pendukung Usulan";
          
          const isDuplicateAttach = currentArsip.some(
            a => a.id_asn === usulan.id_asn && a.file_name === attach.file_name
          );

          if (!isDuplicateAttach) {
            const nextAttachId = currentArsip.length > 0 ? Math.max(...currentArsip.map(a => a.id)) + 1 : 1;
            
            let attachCat: 'Dasar' | 'Mutasi' | 'Pendidikan' | 'Personal' | 'Kinerja' | 'PPPK_Khusus' | 'PKWT_Khusus' = 'Dasar';
            const normDocName = docName.toLowerCase();
            if (normDocName.includes('skp') || normDocName.includes('prestasi')) {
              attachCat = 'Kinerja';
            } else if (normDocName.includes('pak') || normDocName.includes('angka kredit')) {
              attachCat = 'Kinerja';
            } else if (normDocName.includes('pangkat') || normDocName.includes('riwayat') || normDocName.includes('sk cpns') || normDocName.includes('sk pns')) {
              attachCat = 'Mutasi';
            } else if (normDocName.includes('ijazah') || normDocName.includes('str') || normDocName.includes('sertifikat')) {
              attachCat = 'Pendidikan';
            } else if (normDocName.includes('nikah') || normDocName.includes('keluarga') || normDocName.includes('ktp')) {
              attachCat = 'Personal';
            }

            currentArsip.push({
              id: nextAttachId,
              id_asn: usulan.id_asn,
              nama_berkas: `${docName} (Verifikasi Digital)`,
              kategori_kelompok: attachCat,
              file_name: attach.file_name,
              file_path: attach.file_path,
              uploaded_at: attach.uploaded_at || new Date().toISOString(),
              source: "Auto-Copy Usulan",
              notes: `Dokumen berkas usulan #${usulan.id} terpilih secara otomatis.`
            });
            hasNewCopy = true;
          }
        });
      });
    }

    // --- INTEGRATED IN-APP NOTIFICATION GENERATORS ---
    const newlySubmittedUsulans = (updated || []).filter(u => {
      const prev = previousUsulanList.find(p => p.id === u.id);
      return u.status === 'Menunggu Validasi' && (!prev || prev.status !== 'Menunggu Validasi');
    });

    let currentNotifications = [...(dbState.notifications || [])];
    let hasNewNotification = false;

    if (newlySubmittedUsulans.length > 0) {
      newlySubmittedUsulans.forEach(usulan => {
        const asn = dbState.asnProfiles.find(a => a.id === usulan.id_asn);
        const feature = dbState.fitur.find(f => f.id === usulan.id_fitur);
        const puskesmas = dbState.puskesmas.find(p => p.id === usulan.id_puskesmas_pengusul);

        const asnName = asn ? asn.nama_lengkap : "Pegawai";
        const featName = feature ? feature.nama_fitur : "Layanan";
        const puskesmasName = puskesmas ? puskesmas.nama_puskesmas : "Puskesmas Pengusul";

        const nextNotifId = currentNotifications.length > 0 ? Math.max(...currentNotifications.map(n => n.id)) + 1 : 1;
        currentNotifications.unshift({
          id: nextNotifId,
          sender: puskesmasName,
          time: new Date().toISOString(),
          title: "📥 Usulan Layanan Baru Masuk",
          message: `Usulan dari ${puskesmasName} untuk ${asnName} - Fitur: ${featName} berhasil diajukan dan sedang menunggu validasi Anda.`,
          targetRole: "admin_dinkes",
          targetPuskesmasId: null,
          isRead: false
        });
        hasNewNotification = true;
      });
    }

    // Listen for 'Perbaikan Berkas' changes
    const newlyRejectedUsulans = (updated || []).filter(u => {
      const prev = previousUsulanList.find(p => p.id === u.id);
      return u.status === 'Perbaikan Berkas' && (!prev || prev.status !== 'Perbaikan Berkas');
    });

    if (newlyRejectedUsulans.length > 0) {
      newlyRejectedUsulans.forEach(usulan => {
        const asn = dbState.asnProfiles.find(a => a.id === usulan.id_asn);
        const feature = dbState.fitur.find(f => f.id === usulan.id_fitur);
        
        const asnName = asn ? asn.nama_lengkap : "Pegawai";
        const featName = feature ? feature.nama_fitur : "Layanan";

        const nextNotifId = currentNotifications.length > 0 ? Math.max(...currentNotifications.map(n => n.id)) + 1 : 1;
        currentNotifications.unshift({
          id: nextNotifId,
          sender: "Dinas Kesehatan PPKB",
          time: new Date().toISOString(),
          title: `⚠️ Perbaikan Berkas: ${featName}`,
          message: `Berkas usulan untuk ${asnName} dikembalikan oleh Dinkes untuk diperbaiki. Catatan: "${usulan.catatan_perbaikan || 'Periksa kelengkapan dokumen yang diunggah.'}"`,
          targetRole: "admin_puskesmas",
          targetPuskesmasId: usulan.id_puskesmas_pengusul,
          isRead: false
        });
        hasNewNotification = true;
      });
    }

    // Listen for completion (Selesai status)
    if (newlyCompletedUsulans.length > 0) {
      newlyCompletedUsulans.forEach(usulan => {
        const asn = dbState.asnProfiles.find(a => a.id === usulan.id_asn);
        const feature = dbState.fitur.find(f => f.id === usulan.id_fitur);
        
        const asnName = asn ? asn.nama_lengkap : "Pegawai";
        const featName = feature ? feature.nama_fitur : "Layanan";

        const nextNotifId = currentNotifications.length > 0 ? Math.max(...currentNotifications.map(n => n.id)) + 1 : 1;
        currentNotifications.unshift({
          id: nextNotifId,
          sender: "Dinas Kesehatan PPKB",
          time: new Date().toISOString(),
          title: `✅ Usulan Layanan Selesai: ${featName}`,
          message: `Berkas usulan ${featName} atas nama ${asnName} telah berhasil diproses oleh Dinkes dan Surat Keputusan (SK) digital siap diunduh.`,
          targetRole: "admin_puskesmas",
          targetPuskesmasId: usulan.id_puskesmas_pengusul,
          isRead: false
        });
        hasNewNotification = true;
      });
    }

    const nextStateParts: any = { 
      usulanLayanan: updated,
      ...(hasNewCopy ? { arsipKepegawaian: currentArsip } : {}),
      ...(hasNewNotification ? { notifications: currentNotifications } : {})
    };

    saveAndSync(nextStateParts);
  };

  const updateArsipKepegawaian = (updated: any[]) => {
    saveAndSync({ arsipKepegawaian: updated });
  };

  const updateNotifications = (updated: any[]) => {
    saveAndSync({ notifications: updated });
  };

  const updateUsulanDokumenFile = (updated: any[]) => {
    saveAndSync({ usulanDokumenFile: updated });
  };

  const updateRiwayatAk = (updated: RiwayatAngkaKredit[]) => {
    saveAndSync({ riwayatAk: updated });
  };

  const updateLaporanSdmk = (updated: any[]) => {
    saveAndSync({ laporanSdmk: updated });
  };

  const updateProfesiSdmk = (updated: any[]) => {
    saveAndSync({ profesiSdmk: updated });
  };

  // Reset database state back to original initial seeds helper
  const handleResetDatabase = () => {
    if (confirm("⚠️ Apakah Anda yakin ingin menyetel ulang database SIMPEG ke data bawaan awal? Seluruh riwayat usulan baru, user kustom, dan perubahan branding visual akan dikembalikan.")) {
      localStorage.clear();
      initializeDB();
      const fresh = getDB();
      setDbState(fresh);
      setActiveTab('dasbor');
      setSelectedPuskesmasId(1);
      setCurrentRole('admin_dinkes');
      alert("✓ Database berhasil disetel ulang!");
    }
  };

  const handleNavigateToServiceDirectly = (asnId: number, fiturslug: string) => {
    setNavAsnId(asnId);
    setNavSlug(fiturslug);
    setActiveTab('layanan-kepegawaian');
  };

  const getPuskesmasName = (id: number) => {
    return dbState.puskesmas.find(p => p.id === id)?.nama_puskesmas || `Unit #${id}`;
  };

  // Visibility filters for ASNs (Multi-Tenant boundary enforcement)
  const visibleAsnRoster = currentRole === 'admin_dinkes'
    ? dbState.asnProfiles // Dinkes sees EVERYTHING real-time across all clinics & dinkes itself
    : dbState.asnProfiles.filter(p => p.id_puskesmas === selectedPuskesmasId); // Puskesmas sees only their own!

  const filteredRoster = visibleAsnRoster.filter(p => {
    // 1) Search filter
    const term = rosterSearch.toLowerCase();
    const matchesSearch = p.nama_lengkap.toLowerCase().includes(term) || p.nip.includes(term) || (p.jenjang_jafung && p.jenjang_jafung.toLowerCase().includes(term));
    if (!matchesSearch) return false;

    // 2) Unit filter (only applicable for Dinkes Admin who sees multiple)
    if (currentRole === 'admin_dinkes' && rosterUnitFilter !== 'ALL') {
      if (p.id_puskesmas !== Number(rosterUnitFilter)) return false;
    }

    // 3) Employee Status filter
    if (rosterStatusFilter !== 'ALL') {
      if (p.status_pegawai_detail !== rosterStatusFilter) return false;
    }

    return true;
  });

  // Handle adding employee manual form submission (Puskesmas or Dinkes)
  const handleAddEmployeeManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStatusDetail === 'Non_ASN') {
      if (!newNik || !newNama) {
        alert("Harap lengkapi nama dan NIK pegawai!");
        return;
      }
    } else {
      if (!newNip || !newNama) {
        alert("Harap lengkapi nama dan NIP pegawai!");
        return;
      }
    }

    // Assign unit kerja automatically depending on acting role tenancy
    const finalUnitId = currentRole === 'admin_puskesmas' ? (selectedPuskesmasId || 1) : newUnitId;

    const nextId = dbState.asnProfiles.length > 0 ? Math.max(...dbState.asnProfiles.map(u => u.id)) + 1 : 1;
    const newPegawai: ASNProfile = {
      id: nextId,
      nip: newStatusDetail === 'Non_ASN' ? newNik : newNip,
      nama_lengkap: newNama,
      gelar_belakang: newGelar || null,
      id_puskesmas: finalUnitId,
      tanggal_lahir: newTanggalLahir,
      golongan_ruang: newStatusDetail === 'Non_ASN' ? '-' : newGolongan,
      tmt_pangkat_terakhir: newStatusDetail === 'PNS' ? newPnsTmtGolongan : '2025-01-01',
      tmt_berkala_terakhir: newStatusDetail === 'PNS' ? newTmtBerkalaTerakhir : '2025-01-01',
      tmt_jabatan_terakhir: newStatusDetail === 'PNS' ? newPnsTmtJabatan : '2025-01-01',
      jenis_pegawai: newJenisPegawai,
      id_profesi: newProfesiId,
      jenjang_jafung: newJenisPegawai === 'Jafung_Kesehatan' ? 'Ahli Pertama' : null,
      ak_integrasi_2022: 0,
      sisa_cuti_tahunan: newStatusDetail === 'Non_ASN' ? 0 : newSisaCuti,
      status_kepegawaian: 'Aktif',
      jenis_kelamin: newGender,
      status_pegawai_detail: newStatusDetail,

      // PNS Detailed Values
      pangkat_nama: newStatusDetail === 'PNS' ? newPangkatNama : undefined,
      pns_jenis_kenaikan_pangkat: newStatusDetail === 'PNS' ? newPnsJenisKenaikanPangkat : undefined,
      pns_masa_kerja_golongan: newStatusDetail === 'PNS' ? newPnsMasaKerjaGolongan : undefined,
      pns_tmt_golongan: newStatusDetail === 'PNS' ? newPnsTmtGolongan : undefined,
      pns_no_pertek_bkn: newStatusDetail === 'PNS' ? newPnsNoPertekBkn : undefined,
      pns_tgl_pertek_bkn: newStatusDetail === 'PNS' ? newPnsTglPertekBkn : undefined,
      pns_no_sk: newStatusDetail === 'PNS' ? newPnsNoSk : undefined,
      pns_tgl_sk: newStatusDetail === 'PNS' ? newPnsTglSk : undefined,
      pns_nama_jabatan: newStatusDetail === 'PNS' ? (newPnsNamaJabatan || newPnsNamaJabatan) : undefined,
      pns_jenis_jabatan: newStatusDetail === 'PNS' ? newPnsJenisJabatan : undefined,
      pns_jenis_mutasi: newStatusDetail === 'PNS' ? newPnsJenisMutasi : undefined,
      pns_tmt_jabatan: newStatusDetail === 'PNS' ? newPnsTmtJabatan : undefined,
      pns_instansi_kerja: newStatusDetail === 'PNS' ? newPnsInstansiKerja : undefined,
      pns_instansi_induk: newStatusDetail === 'PNS' ? newPnsInstansiInduk : undefined,
      pns_satker: newStatusDetail === 'PNS' ? newPnsSatker : undefined,
      pns_satker_induk: newStatusDetail === 'PNS' ? newPnsSatkerInduk : undefined,
      pns_unor: newStatusDetail === 'PNS' ? getPuskesmasName(finalUnitId) : undefined,
      pns_unor_induk: newStatusDetail === 'PNS' ? getPuskesmasName(finalUnitId) : undefined,
      pns_no_sk_jabatan: newStatusDetail === 'PNS' ? newPnsNoSkJabatan : undefined,
      pns_tgl_sk_jabatan: newStatusDetail === 'PNS' ? newPnsTglSkJabatan : undefined,
 
      // PPPK Detailed Values (Penuh / Paruh)
      pppk_ni: (newStatusDetail === 'PPPK_Penuh_Waktu' || newStatusDetail === 'PPPK_Paruh_Waktu') ? newNip : undefined,
      pppk_no_perjanjian: (newStatusDetail === 'PPPK_Penuh_Waktu' || newStatusDetail === 'PPPK_Paruh_Waktu') ? newPppkNoPerjanjian : undefined,
      pppk_tgl_perjanjian: (newStatusDetail === 'PPPK_Penuh_Waktu' || newStatusDetail === 'PPPK_Paruh_Waktu') ? newPppkTglPerjanjian : undefined,
      pppk_tmt_perjanjian_mulai: (newStatusDetail === 'PPPK_Penuh_Waktu' || newStatusDetail === 'PPPK_Paruh_Waktu') ? newPppkTmtPerjanjianMulai : undefined,
      pppk_tmt_perjanjian_selesai: (newStatusDetail === 'PPPK_Penuh_Waktu' || newStatusDetail === 'PPPK_Paruh_Waktu') ? newPppkTmtPerjanjianSelesai : undefined,
      pppk_tmt_golongan: (newStatusDetail === 'PPPK_Penuh_Waktu' || newStatusDetail === 'PPPK_Paruh_Waktu') ? newPppkTmtGolongan : undefined,
      pppk_no_sk: (newStatusDetail === 'PPPK_Penuh_Waktu' || newStatusDetail === 'PPPK_Paruh_Waktu') ? newPppkNoSk : undefined,
      pppk_tgl_sk: (newStatusDetail === 'PPPK_Penuh_Waktu' || newStatusDetail === 'PPPK_Paruh_Waktu') ? newPppkTglSk : undefined,
      pppk_instansi_kerja: (newStatusDetail === 'PPPK_Penuh_Waktu' || newStatusDetail === 'PPPK_Paruh_Waktu') ? newPppkInstansiKerja : undefined,
      pppk_instansi_induk: (newStatusDetail === 'PPPK_Penuh_Waktu' || newStatusDetail === 'PPPK_Paruh_Waktu') ? newPppkInstansiInduk : undefined,
      pppk_satker: (newStatusDetail === 'PPPK_Penuh_Waktu' || newStatusDetail === 'PPPK_Paruh_Waktu') ? newPppkSatker : undefined,
      pppk_unor: (newStatusDetail === 'PPPK_Penuh_Waktu' || newStatusDetail === 'PPPK_Paruh_Waktu') ? getPuskesmasName(finalUnitId) : undefined,
      pppk_jabatan: (newStatusDetail === 'PPPK_Penuh_Waktu' || newStatusDetail === 'PPPK_Paruh_Waktu') ? newPppkBknJabatan : undefined,
      pppk_golongan: (newStatusDetail === 'PPPK_Penuh_Waktu' || newStatusDetail === 'PPPK_Paruh_Waktu') ? newPppkBknGolongan : undefined,
 
      // PKWT Detailed Values
      nik: newStatusDetail === 'Non_ASN' ? newNik : undefined,
      pkwt_tmt_sk: newStatusDetail === 'Non_ASN' ? newPkwtTmtSk : undefined,
      pkwt_no_sk_kontrak: newStatusDetail === 'Non_ASN' ? newPkwtNoSkKontrak : undefined,
      pkwt_tgl_sk_kontrak: newStatusDetail === 'Non_ASN' ? newPkwtTglSkKontrak : undefined,
      pkwt_masa_kerja: newStatusDetail === 'Non_ASN' ? newPkwtMasaKerja : undefined,
      pkwt_pembiayaan: newStatusDetail === 'Non_ASN' ? newPkwtPembiayaan : undefined,
      pkwt_jabatan: newStatusDetail === 'Non_ASN' ? newPkwtJabatan : undefined,
 
      // STR & SIP Fields
      no_str: newJenisPegawai === 'Jafung_Kesehatan' ? (newNoStr || undefined) : undefined,
      tanggal_terbit_str: newJenisPegawai === 'Jafung_Kesehatan' ? (newTanggalTerbitStr || undefined) : undefined,
      tanggal_akhir_str: newJenisPegawai === 'Jafung_Kesehatan' ? (newIsStrSeumurHidup ? 'Seumur Hidup' : (newTanggalAkhirStr || undefined)) : undefined,
      is_str_seumur_hidup: newJenisPegawai === 'Jafung_Kesehatan' ? newIsStrSeumurHidup : false,
      no_sip: newJenisPegawai === 'Jafung_Kesehatan' ? (newNoSip || undefined) : undefined,
      tanggal_terbit_sip: newJenisPegawai === 'Jafung_Kesehatan' ? (newTanggalTerbitSip || undefined) : undefined,
      tanggal_akhir_sip: newJenisPegawai === 'Jafung_Kesehatan' ? (newTanggalAkhirSip || undefined) : undefined
    };
 
    const nextList = [...dbState.asnProfiles, newPegawai];
    updateProfiles(nextList);
 
    // reset forms
    resetAddEmployeeForm();
    setShowAddForm(false);
    alert(`✓ Pegawai "${newNama}" (${newStatusDetail}) berhasil disimpan ke database unit ${getPuskesmasName(finalUnitId)}`);
  };

  // Trigger on-the-fly binary XLSX generation
  const downloadExcelTemplate = () => {
    try {
      const headers = [
        "NIP / Identitas (NIP Resmi / NIK KTP)",
        "Nama Lengkap (Tanpa Gelar)",
        "Gelar Belakang (Misalnya: amd.kep, s.kep, dr)",
        "Jenis Kelamin (L/P)",
        "Status Pegawai (PNS / PPPK Penuh Waktu / PPPK Paruh Waktu / Non ASN)",
        "Rumpun Jabatan (Struktural / Jafung Kesehatan / Staf Umum)",
        "Golongan Ruang (contoh: III/a, Golongan IX, dll)",
        "Tanggal Lahir (Format: YYYY-MM-DD)",
        "Sisa Cuti Tahunan (contoh: 12)",
        "Nomor STR (Optional untuk Jafung Kesehatan)",
        "Nomor SIP (Optional untuk Jafung Kesehatan)"
      ];
      
      const sampleRows = [
        [
          "199005122020121004",
          "dr. Wahyu Darizki",
          "M.Kes",
          "L",
          "PNS",
          "Jafung Kesehatan",
          "III/b",
          "1990-05-12",
          "12",
          "STR-123456",
          "SIP-654321"
        ],
        [
          "199508152023212009",
          "Siti Aminah",
          "Amd.Kep",
          "P",
          "PPPK Penuh Waktu",
          "Jafung Kesehatan",
          "Golongan IX",
          "1995-08-15",
          "12",
          "",
          ""
        ],
        [
          "5201020412990001",
          "Slamet Mulyadi",
          "",
          "L",
          "Non ASN",
          "Staf Umum",
          "-",
          "1999-12-04",
          "0",
          "",
          ""
        ]
      ];

      const sheetData = [headers, ...sampleRows];
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      
      // Auto-fit column widths
      const wscols = headers.map(h => ({ wch: Math.max(h.length + 3, 14) }));
      ws['!cols'] = wscols;

      // Panduan Pengisian Sheet
      const guideHeaders = ["KANDUNGAN KOLOM", "ATURAN FORMAT / PILIHAN", "CONTOH VALID"];
      const guideRows = [
        ["NIP / Identitas", "Masukkan NIP 18 Digit untuk PNS/PPPK atau NIK KTP (16 Digit) untuk Non-ASN.", "199005122020121004"],
        ["Nama Lengkap", "Tulis nama lengkap karyawan tanpa gelar belakang.", "Romi Hidayat"],
        ["Gelar Belakang", "Tulis gelar akademik / profesi, dipisahkan koma jika lebih dari satu (tanpa spasi di awal).", "S.Kep, Ners"],
        ["Jenis Kelamin", "Isi dengan huruf 'L' untuk Laki-Laki, atau 'P' untuk Perempuan.", "L"],
        ["Status Pegawai", "PILIHAN VALID: PNS / PPPK Penuh Waktu / PPPK Paruh Waktu / Non ASN", "PNS / PPPK Penuh Waktu"],
        ["Rumpun Jabatan", "PILIHAN VALID: Struktural / Jafung Kesehatan / Staf Umum", "Jafung Kesehatan"],
        ["Golongan Ruang", "PNS: III/a, III/b, IV/a. PPPK: Golongan IX, Golongan VII. Non-ASN: isi '-' saja.", "III/b"],
        ["Tanggal Lahir", "Harus berformat YYYY-MM-DD (Tahun-Bulan-Tanggal) sesuai standar.", "1992-06-25"],
        ["Sisa Cuti Tahunan", "Isi angka sisa cuti (0 s/d 30). Pegawai Non ASN wajib diisi 0.", "12"],
        ["Nomor STR", "Nomor Registrasi Surat Tanda Registrasi jika ada (Opsional).", "STR-987654"],
        ["Nomor SIP", "Nomor Surat Izin Praktik dari Dinas Kesehatan setempat jika ada (Opsional).", "SIP-123/2026"]
      ];

      const wsGuide = XLSX.utils.aoa_to_sheet([["PANDUAN ALUR IMPORT DATA PEGAWAI - SIMPEG LOMBOK BARAT"], [], ...[guideHeaders, ...guideRows]]);
      wsGuide['!cols'] = [{ wch: 25 }, { wch: 65 }, { wch: 25 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet Template Pegawai");
      XLSX.utils.book_append_sheet(wb, wsGuide, "Petunjuk Pengisian");

      XLSX.writeFile(wb, "Template_SIMPEG_Lombok_Barat.xlsx");
      alert("✓ Template Excel (.xlsx) sukses diunduh! Silakan isi lalu unggah kembali.");
    } catch (err: any) {
      console.error(err);
      alert("Terjadi kesalahan meluncurkan unduhan: " + err.message);
    }
  };

  // Parses an uploaded XLSX file using library
  const handleExcelFileSelectXlsx = (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) return;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
          
          if (rawRows.length > 1) {
            // Filter header row (usually contains headers)
            const firstCol = String(rawRows[0]?.[0] || "").toLowerCase();
            const startIdx = (firstCol.includes("nip") || firstCol.includes("identitas") || firstCol.includes("nama")) ? 1 : 0;
            
            const dataRows = rawRows.slice(startIdx).filter(r => r && r.length > 0 && r[0] !== undefined && String(r[0]).trim() !== "");
            
            const targetUnit = currentRole === 'admin_puskesmas' ? (selectedPuskesmasId || 1) : newUnitId;
            const parsed: ASNProfile[] = [];
            
            dataRows.forEach((row, index) => {
              const nip = String(row[0] || "").trim() || `GEN-${Date.now()}-${index}`;
              const nama_lengkap = String(row[1] || "").trim() || `Staf Excel ${index + 1}`;
              const gelar_belakang = row[2] ? String(row[2]).trim() : null;
              
              const sexValue = String(row[3] || "").trim().toUpperCase();
              const jenis_kelamin = (sexValue.startsWith('L') || sexValue.includes('LAKI')) ? 'L' : 'P';
              
              const statusVal = String(row[4] || "").trim().toUpperCase();
              let status_pegawai_detail: StatusPegawaiDetail = 'PNS';
              if (statusVal.includes('PENUH') || statusVal.includes('P3K_PN') || statusVal.includes('PPPK PENUH')) {
                status_pegawai_detail = 'PPPK_Penuh_Waktu';
              } else if (statusVal.includes('PARUH') || statusVal.includes('P3K_PW') || statusVal.includes('PPPK PARUH')) {
                status_pegawai_detail = 'PPPK_Paruh_Waktu';
              } else if (statusVal.includes('NON') || statusVal.includes('PKWT') || statusVal.includes('KONTRAK') || statusVal.includes('NON ASN')) {
                status_pegawai_detail = 'Non_ASN';
              }
              
              const rumpunVal = String(row[5] || "").trim().toUpperCase();
              let jenis_pegawai: JenisPegawai = 'Jafung_Kesehatan';
              if (rumpunVal.includes('STRUK')) {
                jenis_pegawai = 'Struktural';
              } else if (rumpunVal.includes('UMUM') || rumpunVal.includes('STAF')) {
                jenis_pegawai = 'Staf_Umum';
              }
              
              const golongan_ruang = status_pegawai_detail === 'Non_ASN' ? '-' : (row[6] ? String(row[6]).trim() : 'III/a');
              const tanggal_lahir = row[7] ? String(row[7]).trim() : '1991-05-15';
              const sisa_cuti_tahunan = status_pegawai_detail === 'Non_ASN' ? 0 : (row[8] !== undefined ? Math.max(0, parseInt(row[8]) || 0) : 12);
              
              parsed.push({
                id: Date.now() + index,
                nip,
                nama_lengkap,
                gelar_belakang,
                id_puskesmas: targetUnit,
                tanggal_lahir,
                golongan_ruang,
                tmt_pangkat_terakhir: '2025-01-01',
                tmt_berkala_terakhir: '2025-01-01',
                tmt_jabatan_terakhir: '2025-01-01',
                jenis_pegawai,
                jenjang_jafung: jenis_pegawai === 'Jafung_Kesehatan' ? 'Ahli Pertama' : null,
                ak_integrasi_2022: 0,
                sisa_cuti_tahunan,
                status_kepegawaian: 'Aktif',
                jenis_kelamin,
                status_pegawai_detail,
                pppk_ni: status_pegawai_detail.startsWith('PPPK') ? nip : undefined,
                nik: status_pegawai_detail === 'Non_ASN' ? nip : undefined,
              });
            });
            
            setExcelParsedPreview(parsed);
            setExcelImportMessage(`✓ Berhasil mendeteksi ${parsed.length} baris data dari file Excel (.xlsx) siap diimpor.`);
          } else {
            alert("Format baris data Excel kosong!");
          }
        } catch (err: any) {
          alert("Error membaca spreadsheet: " + err.message);
        }
      };
      reader.readAsBinaryString(file);
    } catch (err: any) {
      alert("Gagal membaca file: " + err.message);
    }
  };

  // Parse Excel Clipboard text on value entry
  const handleExcelPasteChange = (text: string) => {
    setExcelPasteText(text);
    if (!text.trim()) {
      setExcelParsedPreview([]);
      setExcelImportMessage('');
      return;
    }

    const rows = text.split('\n').map(row => row.trim()).filter(row => row.length > 0);
    const parsed: ASNProfile[] = [];
    
    // Auto-detect the unit penempatan target
    const targetUnit = currentRole === 'admin_puskesmas' ? (selectedPuskesmasId || 1) : newUnitId;

    rows.forEach((row, index) => {
      // Split by tab (Excel standard paste format) or separators
      let cols = row.split('\t');
      if (cols.length < 3) cols = row.split(';');
      if (cols.length < 3) cols = row.split(',');

      // If this is the header row, skip it
      if (cols[0] && (cols[0].toLowerCase().includes('nip') || cols[0].toLowerCase().includes('identitas') || cols[1]?.toLowerCase().includes('nama lengkap'))) {
        return;
      }

      if (cols.length >= 2) {
        const nip = cols[0]?.trim() || `GEN-${Date.now()}-${index}`;
        const nama_lengkap = cols[1]?.trim() || `Staf Excel ${index + 1}`;
        const gelar_belakang = cols[2]?.trim() || null;
        
        let genCol = cols[3]?.trim()?.toUpperCase() || 'L';
        const jenis_kelamin = (genCol.startsWith('L') || genCol.includes('LAKI')) ? 'L' : 'P';
        
        let statusCol = cols[4]?.trim() || 'PNS';
        let status_pegawai_detail: StatusPegawaiDetail = 'PNS';
        if (statusCol.toLowerCase().includes('penuh') || statusCol.toUpperCase().includes('PPPK_PENUH') || statusCol.toUpperCase().includes('PPPK PENUH')) {
          status_pegawai_detail = 'PPPK_Penuh_Waktu';
        } else if (statusCol.toLowerCase().includes('paruh') || statusCol.toUpperCase().includes('PPPK_PARUH') || statusCol.toUpperCase().includes('PPPK PARUH')) {
          status_pegawai_detail = 'PPPK_Paruh_Waktu';
        } else if (statusCol.toLowerCase().includes('non') || statusCol.toLowerCase().includes('pkwt') || statusCol.toLowerCase().includes('kontrak') || statusCol.toLowerCase().includes('non asn')) {
          status_pegawai_detail = 'Non_ASN';
        }

        let jenisCol = cols[5]?.trim() || 'Jafung_Kesehatan';
        let jenis_pegawai: JenisPegawai = 'Jafung_Kesehatan';
        if (jenisCol.toLowerCase().includes('struk')) {
          jenis_pegawai = 'Struktural';
        } else if (jenisCol.toLowerCase().includes('umum') || jenisCol.toLowerCase().includes('staf')) {
          jenis_pegawai = 'Staf_Umum';
        }

        const golongan_ruang = status_pegawai_detail === 'Non_ASN' ? '-' : (cols[6]?.trim() || 'III/a');
        const tanggal_lahir = cols[7]?.trim() || '1991-05-15';
        const sisa_cuti_tahunan = status_pegawai_detail === 'Non_ASN' ? 0 : (parseInt(cols[8]?.trim() || '12') || 12);

        parsed.push({
          id: Date.now() + index, // temporary id
          nip,
          nama_lengkap,
          gelar_belakang,
          id_puskesmas: targetUnit,
          tanggal_lahir,
          golongan_ruang,
          tmt_pangkat_terakhir: '2025-01-01',
          tmt_berkala_terakhir: '2025-01-01',
          tmt_jabatan_terakhir: '2025-01-01',
          jenis_pegawai,
          jenjang_jafung: jenis_pegawai === 'Jafung_Kesehatan' ? 'Ahli Pertama' : null,
          ak_integrasi_2022: 0,
          sisa_cuti_tahunan,
          status_kepegawaian: 'Aktif',
          jenis_kelamin,
          status_pegawai_detail,
          pppk_ni: status_pegawai_detail.startsWith('PPPK') ? nip : undefined,
          nik: status_pegawai_detail === 'Non_ASN' ? nip : undefined,
        });
      }
    });

    setExcelParsedPreview(parsed);
    setExcelImportMessage(`✓ Berhasil mendeteksi ${parsed.length} baris data clipboard Excel siap diimpor.`);
  };

  // Perform bulk merge action
  const handleSaveBulkExcelImport = () => {
    if (excelParsedPreview.length === 0) return;

    // Allocate valid sequential IDs
    let currentMaxId = dbState.asnProfiles.length > 0 ? Math.max(...dbState.asnProfiles.map(u => u.id)) : 10;
    const finalAsns = excelParsedPreview.map((item, idx) => ({
      ...item,
      id: currentMaxId + 1 + idx
    }));

    const nextList = [...dbState.asnProfiles, ...finalAsns];
    updateProfiles(nextList);

    setExcelPasteText('');
    setExcelParsedPreview([]);
    setExcelImportMessage('');
    setShowAddForm(false);
    alert(`✨ Sukses! ${finalAsns.length} data pegawai baru berhasil diimpor & disimpan ke database SIMPEG.`);
  };

  // --- IN-APP NOTIFICATION CENTER CONTROL LOGIC ---
  const actingNotifications = (dbState.notifications || []).filter(n => {
    if (currentRole === 'admin_dinkes') {
      return n.targetRole === 'admin_dinkes';
    } else {
      return n.targetRole === 'admin_puskesmas' && n.targetPuskesmasId === selectedPuskesmasId;
    }
  });

  const unreadCount = actingNotifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = (id: number) => {
    const updated = (dbState.notifications || []).map(n => {
      if (n.id === id) {
        return { ...n, isRead: true };
      }
      return n;
    });
    updateNotifications(updated);
  };

  const handleMarkAllAsRead = () => {
    const updated = (dbState.notifications || []).map(n => {
      const matchRole = currentRole === 'admin_dinkes' 
        ? n.targetRole === 'admin_dinkes' 
        : (n.targetRole === 'admin_puskesmas' && n.targetPuskesmasId === selectedPuskesmasId);
      if (matchRole) {
        return { ...n, isRead: true };
      }
      return n;
    });
    updateNotifications(updated);
    alert("✓ Semua notifikasi instan bertanda telah dibaca!");
  };

  if (isLoadingSupabase) {
    return (
      <div id="loading-supabase-view" className="min-h-screen bg-[#0f1115] flex flex-col items-center justify-center text-white font-sans p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="relative flex justify-center">
            <div className="h-16 w-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <Database size={24} className="text-emerald-400 absolute top-5 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold font-display tracking-wide uppercase">Sistem SIMPEG Lombok Barat</h3>
            <p className="text-xs text-slate-400 font-mono">{supabaseStatus}</p>
          </div>
          <div className="p-4 bg-slate-950/80 border border-white/5 rounded-2xl">
            <p className="text-[10px] text-slate-500 font-mono text-center">Menghubungkan langsung ke cloud database Supabase...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="simpeg-rootbox" className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* Top Professional Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Logo Brand with custom dynamic logo config */}
          <div className="flex items-center space-x-3">
            <div className="p-1 bg-slate-50 rounded-xl border border-slate-200/80 shrink-0 shadow-xs">
              <img 
                src={activeLogoUrl} 
                alt="Brand logo" 
                className="h-10 w-10 object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null; // Prevent infinite error handler loops
                  target.src = '/logo_lombok_barat.png';
                }}
              />
            </div>
            <div>
              <h1 className="text-sm font-display font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>SIMPEG Dinkes PPKB</span>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full uppercase">Lobar</span>
              </h1>
              <p className="text-[9.5px] text-slate-500 font-medium">
                Sistem Layanan Kepegawaian & Penataan SDMK Terintegrasi
              </p>
            </div>
          </div>

          {/* Right Header Panel with integrated Multi-Tenant Switcher and In-App Notifications Center */}
          <div className="flex items-center gap-3 self-end md:self-center relative">
            
            {/* Role Switching Simulator Board (Multi-Tenant simulator) */}
            <div className="bg-[#16161a] border border-white/5 p-2 rounded-xl flex flex-wrap items-center gap-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sliders size={13} className="text-emerald-400" />
                <span>Otoritas Sesi:</span>
              </span>

              {/* Select Role Type */}
              <div className="flex bg-slate-900 border border-white/5 p-0.5 rounded-lg text-xs">
                <button
                  onClick={() => {
                    setCurrentRole('admin_dinkes');
                    setActiveTab('dasbor');
                    setShowNotificationsDropdown(false);
                  }}
                  className={`px-3 py-1 font-semibold rounded-md transition ${currentRole === 'admin_dinkes' ? 'bg-teal-700 text-white shadow-xs' : 'text-slate-500 hover:text-slate-400'}`}
                >
                  Admin Utama (Dikes PPKB)
                </button>
                <button
                  onClick={() => {
                    setCurrentRole('admin_puskesmas');
                    setActiveTab('dasbor');
                    setShowNotificationsDropdown(false);
                  }}
                  className={`px-3 py-1 font-semibold rounded-md transition ${currentRole === 'admin_puskesmas' ? 'bg-teal-700 text-white shadow-xs' : 'text-slate-500 hover:text-slate-400'}`}
                >
                  Admin Unit (Puskesmas)
                </button>
              </div>

              {/* Tenancy selection helper */}
              {currentRole === 'admin_puskesmas' && (
                <select
                  value={selectedPuskesmasId}
                  onChange={(e) => {
                    setSelectedPuskesmasId(parseInt(e.target.value));
                    setActiveTab('dasbor');
                    setShowNotificationsDropdown(false);
                  }}
                  className="p-1 border border-white/10 rounded font-bold text-xs bg-[#0f0f12] text-emerald-400 focus:outline-none"
                >
                  {/* Exclude Dinkes (id 100) from puskesmas list for Puskesmas tenant picker */}
                  {dbState.puskesmas.filter(pk => pk.id !== 100).map(pk => (
                    <option key={pk.id} value={pk.id} className="bg-[#16161a] text-slate-300">{pk.nama_puskesmas}</option>
                  ))}
                </select>
              )}
              
              {/* Database Reset Action */}
              <button
                onClick={handleResetDatabase}
                title="Reset Database ke seeds"
                className="p-1.5 bg-rose-950/40 text-rose-400 hover:bg-rose-900/40 rounded-lg text-[10px] font-bold transition flex items-center space-x-1 border border-rose-500/25 cursor-pointer"
              >
                <RefreshCw size={11} />
                <span className="hidden sm:inline">Reset DB</span>
              </button>
            </div>

            {/* In-App Notification Center Icon & dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                className={`relative p-2.5 rounded-xl border transition flex items-center justify-center cursor-pointer ${showNotificationsDropdown ? 'bg-teal-50 text-teal-600 border-teal-200 shadow-xs animate-pulse' : 'bg-[#16161a] border-white/5 text-slate-300 hover:text-white hover:bg-slate-900'}`}
                title="Pusat Notifikasi SIMPEG"
                id="header-notification-bell-btn"
              >
                <Bell size={15} />
                {unreadCount > 0 && (
                  <span id="unread-count-badge" className="absolute -top-1.5 -right-1.5 h-4.5 w-4.5 bg-rose-500 font-extrabold text-[9px] text-white flex items-center justify-center rounded-full animate-bounce shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotificationsDropdown && (
                <div id="notification-center-dropdown" className="absolute right-0 mt-3.5 w-80 sm:w-[360px] bg-white border border-slate-200 rounded-2xl shadow-xl z-55 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        <Bell size={13} className="text-teal-600" />
                        <span>Pusat Notifikasi ({unreadCount} baru)</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium">Acting: {currentRole === 'admin_dinkes' ? 'Dinkes PPKB' : `Puskesmas #${selectedPuskesmasId}`}</p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer opacity-80"
                      >
                        Tandai Semua Dibaca
                      </button>
                    )}
                  </div>

                  {/* Dynamic PWA Notification Permission Controller Panel */}
                  <div className="px-4 py-2.5 bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-teal-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className="flex h-2 w-2 relative">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${notifPermission === 'granted' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${notifPermission === 'granted' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                      </span>
                      <span className="text-[10px] font-semibold text-slate-700">
                        {notifPermission === 'granted' ? 'Notifikasi HP & Desktop: Aktif' : 'Notifikasi HP & Desktop: Nonaktif'}
                      </span>
                    </div>
                    {notifPermission !== 'granted' ? (
                      <button
                        onClick={requestNotificationPermission}
                        className="px-2 py-1 bg-teal-700 hover:bg-teal-800 text-white font-extrabold rounded text-[9px] uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                      >
                        Aktifkan Sekarang 🔔
                      </button>
                    ) : (
                      <button
                        onClick={() => triggerNativeNotification("🎉 Tes Notifikasi Berhasil!", "Ini adalah tes simulasi notifikasi PWA langsung di perangkat mobile dan desktop Anda.")}
                        className="px-2 py-1 bg-[#16161a] hover:bg-black text-slate-300 hover:text-white font-bold rounded text-[9px] transition-all cursor-pointer border border-white/5"
                      >
                        Uji Notifikasi ⚡
                      </button>
                    )}
                  </div>

                  <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100">
                    {actingNotifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        <Bell size={20} className="mx-auto mb-2 opacity-25 text-slate-500 animate-pulse" />
                        <p className="text-xs">Belum ada notifikasi baru untuk unit Anda.</p>
                      </div>
                    ) : (
                      actingNotifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3.5 text-xs transition duration-150 flex gap-2.5 ${n.isRead ? 'bg-white hover:bg-slate-50' : 'bg-teal-50/40 hover:bg-teal-100/30'}`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {n.title.includes('Selesai') || n.title.includes('✅') ? (
                              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block block mt-1 animate-ping" />
                            ) : n.title.includes('⚠️') || n.title.includes('Perbaikan') ? (
                              <span className="h-2 w-2 rounded-full bg-amber-500 inline-block block mt-1 animate-pulse" />
                            ) : (
                              <span className="h-2 w-2 rounded-full bg-indigo-500 inline-block block mt-1" />
                            )}
                          </div>
                          
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-[#0f172a] text-[11px] leading-tight block">{n.title}</span>
                              <span className="text-[9px] text-slate-400 font-medium font-mono">
                                {new Date(n.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11.5px] text-slate-500 leading-normal font-medium">{n.message}</p>
                            
                            <div className="flex items-center justify-between pt-1 text-[9px] text-slate-400">
                              <span>Pengirim: <b className="text-slate-600">{n.sender}</b></span>
                              {!n.isRead && (
                                <button
                                  onClick={() => handleMarkAsRead(n.id)}
                                  className="font-bold text-teal-600 hover:text-teal-800 hover:underline cursor-pointer"
                                >
                                  Tandai Dibaca
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </header>

      {/* Primary Workspace Interface Partition */}
      <div className="flex-1 flex flex-col lg:flex-row bg-[#f8fafc]">
        
        {/* Sticky Left Dark Sidebar Panel */}
        <aside className="w-full lg:w-72 bg-slate-900 border-r border-slate-800 p-5 flex flex-col space-y-6 lg:sticky lg:top-[65px] lg:h-[calc(100vh-65px)] overflow-y-auto shrink-0 shadow-lg">
          <div className="space-y-1.5 pb-2 border-b border-white/5">
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Menu Utama</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              SIMPEG Lombok Barat terintegrasi Dashboard alerts & penataan fasyankes
            </p>
          </div>

          <div className="space-y-1.5 font-medium flex-grow">
            <button
              onClick={() => {
                setActiveTab('dasbor');
                setNavAsnId(null);
                setNavSlug(null);
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs flex items-center space-x-3 transition duration-150 ${activeTab === 'dasbor' ? 'bg-white/10 text-white border border-white/5 shadow-xs' : 'hover:bg-white/[0.03] text-slate-400 hover:text-white'}`}
            >
              <Bell size={15} />
              <span>Dashboard & Peringatan Dini</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('layanan-kepegawaian');
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs flex items-center space-x-3 transition duration-150 ${activeTab === 'layanan-kepegawaian' ? 'bg-white/10 text-white border border-white/5 shadow-xs' : 'hover:bg-white/[0.03] text-slate-400 hover:text-white'}`}
            >
              <FileText size={15} />
              <div className="flex-1 flex justify-between items-center">
                <span>Layanan Kepegawaian</span>
                {dbState.usulanLayanan.filter(u => u.status === 'Menunggu Validasi').length > 0 && (
                  <span className="bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {dbState.usulanLayanan.filter(u => u.status === 'Menunggu Validasi').length}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => {
                setActiveTab('keadaan-sdmk');
                setNavAsnId(null);
                setNavSlug(null);
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs flex items-center space-x-3 transition duration-150 ${activeTab === 'keadaan-sdmk' ? 'bg-white/10 text-white border border-white/5 shadow-xs' : 'hover:bg-white/[0.03] text-slate-400 hover:text-white'}`}
            >
              <Layers size={15} />
              <span>Laporan SDMK</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('roster-asn');
                setNavAsnId(null);
                setNavSlug(null);
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs flex items-center space-x-3 transition duration-150 ${activeTab === 'roster-asn' ? 'bg-white/10 text-white border border-white/5 shadow-xs' : 'hover:bg-white/[0.03] text-slate-400 hover:text-white'}`}
            >
              <Database size={15} />
              <span>Direktori Pegawai</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('arsip-kepegawaian');
              }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs flex items-center space-x-3 transition duration-150 ${activeTab === 'arsip-kepegawaian' ? 'bg-white/10 text-white border border-white/5 shadow-xs' : 'hover:bg-white/[0.03] text-slate-400 hover:text-white'}`}
            >
              <FolderCheck size={15} />
              <div className="flex-1 flex justify-between items-center">
                <span>Arsip Digital Pegawai</span>
                {(() => {
                  const expiringCount = (dbState.arsipKepegawaian || []).filter(file => {
                    if (file.str_expired_date) {
                      const expDate = new Date(file.str_expired_date);
                      const today = new Date();
                      const timeDiff = expDate.getTime() - today.getTime();
                      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                      return daysDiff <= 60;
                    }
                    return false;
                  }).length;
                  return expiringCount > 0 ? (
                    <span className="bg-amber-500/10 text-amber-500 text-[10px] px-1.5 py-0.5 rounded-full font-bold border border-amber-500/20 animate-pulse" title="STR Pegawai segera kadaluarsa & butuh perpanjangan">
                      {expiringCount} STR
                    </span>
                  ) : null;
                })()}
              </div>
            </button>

            {/* Dinkes Central Security/Administration panel tab */}
            {currentRole === 'admin_dinkes' && (
              <button
                onClick={() => {
                  setActiveTab('manajemen-dinkes');
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs flex items-center space-x-3 transition duration-150 ${activeTab === 'manajemen-dinkes' ? 'bg-white/10 text-white border border-white/5 shadow-xs' : 'hover:bg-[#16161a] text-slate-400 hover:text-white'}`}
              >
                <Shield size={15} className="text-emerald-400" />
                <span className="text-emerald-400 font-bold">Administrasi & Branding</span>
              </button>
            )}
          </div>

          {/* Tenants Info Summary Block */}
          <div className="pt-4 border-t border-white/5 text-[11px] text-slate-400 leading-normal space-y-2">
            <span className="font-bold text-slate-300 uppercase tracking-widest block">Informasi Multi-Tenant</span>
            <div className="p-3 bg-slate-950 rounded-xl border border-white/5 space-y-1">
              <p><strong>Akses Lingkup:</strong> {currentRole === 'admin_dinkes' ? 'Admin Utama (Dikes PPKB - Induk)' : 'Lokal Puskesmas (Binaan Dikes)'}</p>
              <p><strong>Tenant Aktif:</strong> <span className="underline text-emerald-400 font-extrabold">{currentRole === 'admin_dinkes' ? 'Dikes PPKB (Induk Organisasi)' : getPuskesmasName(selectedPuskesmasId)}</span></p>
            </div>
            <p className="text-[10px] text-slate-500 italic">
              *Dikes PPKB adalah unit kerja induk utama yang membawahi dan mengkoordinasikan semua puskesmas terdaftar di Lombok Barat.
            </p>
          </div>
        </aside>

        {/* Dynamic Display Panel / Light Contrasting Body Area */}
        <main className="flex-grow p-6 lg:p-8 space-y-6 overflow-y-auto bg-[#f8fafc]">
          
          {/* Active View Router Switchboard */}
          {activeTab === 'dasbor' && (
            <DashboardOverview
              currentRole={currentRole}
              selectedPuskesmasId={selectedPuskesmasId}
              puskesmasList={dbState.puskesmas}
              asnProfiles={dbState.asnProfiles}
              usulanLayanan={dbState.usulanLayanan}
              arsipList={dbState.arsipKepegawaian || []}
              onNavigateToService={handleNavigateToServiceDirectly}
              onNavigateToTab={(tab) => setActiveTab(tab)}
              notifications={dbState.notifications || []}
              onUpdateNotifications={updateNotifications}
              onSaveAndSync={saveAndSync}
              renbutList={renbutList}
              onUpdateRenbutList={updateRenbutList}
            />
          )}

          {activeTab === 'layanan-kepegawaian' && (
            <LayananKepegawaian
              currentRole={currentRole}
              selectedPuskesmasId={selectedPuskesmasId}
              puskesmasList={dbState.puskesmas}
              asnProfiles={dbState.asnProfiles}
              usulanLayanan={dbState.usulanLayanan}
              masterFitur={dbState.fitur}
              masterDokumen={dbState.dokumen}
              syaratFiturMap={dbState.syaratFiturMap}
              usulanDokumenFile={dbState.usulanDokumenFile}
              riwayatAk={dbState.riwayatAk}
              onUpdateAsnProfiles={updateProfiles}
              onUpdateUsulanLayanan={updateUsulanLayanan}
              onUpdateUsulanDokumenFile={updateUsulanDokumenFile}
              onUpdateRiwayatAk={updateRiwayatAk}
              initiallySelectedAsnId={navAsnId}
              initiallySelectedSlug={navSlug}
            />
          )}

          {activeTab === 'keadaan-sdmk' && (
            <LaporanSDMK
              currentRole={currentRole}
              selectedPuskesmasId={selectedPuskesmasId}
              puskesmasList={dbState.puskesmas}
              asnProfiles={dbState.asnProfiles}
              profesiSdmk={dbState.profesiSdmk}
              laporanSdmk={dbState.laporanSdmk}
              onUpdateLaporanSdmk={updateLaporanSdmk}
              onUpdateProfesiSdmk={updateProfesiSdmk}
              onUpdateAsnProfiles={updateProfiles}
              renbutList={renbutList}
              onUpdateRenbutList={updateRenbutList}
            />
          )}

          {activeTab === 'arsip-kepegawaian' && (
            <ArsipKepegawaianView
              currentRole={currentRole}
              selectedPuskesmasId={selectedPuskesmasId}
              puskesmasList={dbState.puskesmas}
              asnProfiles={dbState.asnProfiles}
              arsipList={dbState.arsipKepegawaian || []}
              onUpdateArsipList={updateArsipKepegawaian}
              onUpdateAsnProfiles={updateProfiles}
            />
          )}

          {activeTab === 'manajemen-dinkes' && currentRole === 'admin_dinkes' && (
            <DinkesManagement
              puskesmasList={dbState.puskesmas}
              featuresList={dbState.fitur}
              documentsList={dbState.dokumen}
              syaratFiturMap={dbState.syaratFiturMap}
              usersList={dbState.users}
              logoUrl={activeLogoUrl}
              faviconUrl={activeFaviconUrl}
              onUpdateFeaturesList={(updated) => {
                saveAndSync({ fitur: updated });
              }}
              onUpdateDocumentsList={(updated) => {
                saveAndSync({ dokumen: updated });
              }}
              onUpdateSyaratFiturMap={(updated) => {
                saveAndSync({ syaratFiturMap: updated });
              }}
              onUpdateUsersList={(updated) => {
                saveAndSync({ users: updated });
              }}
              onUpdateBranding={(logo, favicon) => {
                saveAndSync({ logoUrl: logo, faviconUrl: favicon });
              }}
              onUpdatePuskesmasList={(updated) => {
                saveAndSync({ puskesmas: updated });
              }}
              dbState={dbState}
              onUpdateDbState={(updatedState) => setDbState(updatedState)}
            />
          )}

          {/* ======================= VIEW: DIREKTORI PEGAWAI (RENAMED PASN) ======================= */}
          {activeTab === 'roster-asn' && (
            <div className="bg-[#16161a] border border-white/5 p-6 rounded-xl space-y-4 animate-in fade-in duration-200">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div>
                  <h2 className="text-xl font-display font-bold text-white">
                    Direktori Pegawai
                  </h2>
                  <p className="text-xs text-slate-400">
                    Pegawai (ASN (PNS, PPPK Penuh Waktu, PPPK Paruh Waktu), PKWT/Non-ASN) Lombok Barat
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Both roles can add, but Puskesmas is highlighted to submit pegawai database */}
                  <button
                    onClick={() => {
                      setShowAddForm(!showAddForm);
                      setNewUnitId(currentRole === 'admin_puskesmas' ? (selectedPuskesmasId || 1) : 100);
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
                  >
                    <Plus size={14} />
                    <span>{showAddForm ? 'Tutup Form' : 'Tambah Pegawai'}</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Employee Registration Form (Manual Single or Excel Smart Copy Paste) */}
              {showAddForm && (
                <div className="bg-[#0f0f12] p-5 border border-white/5 rounded-2xl space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                      <Plus className="text-emerald-500" size={15} />
                      <span>Form Pendaftaran Pegawai Baru</span>
                    </h3>

                    {/* Choose Add Method */}
                    <div className="flex bg-slate-900 p-0.5 rounded-lg text-[10px] font-bold border border-white/5">
                      <button 
                        onClick={() => setAddMode('single')} 
                        className={`px-2.5 py-1 rounded transition ${addMode === 'single' ? 'bg-[#16161a] text-white' : 'text-slate-500'}`}
                      >
                        Input Manual
                      </button>
                      <button 
                        onClick={() => setAddMode('excel')} 
                        className={`px-2.5 py-1 rounded transition ${addMode === 'excel' ? 'bg-[#16161a] text-white' : 'text-slate-500'}`}
                      >
                        Salin dari Excel
                      </button>
                    </div>
                  </div>

                  {/* FORM OPTION 1: SINGLE DATA ENTRY */}
                  {addMode === 'single' && (
                    <form onSubmit={handleAddEmployeeManual} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium">
                      
                      <div className="space-y-1.5 font-semibold">
                        <label className="text-slate-400">
                          {newStatusDetail === 'Non_ASN' ? 'Nomor Induk Pegawai (NIP - TERKUNCI UNTUK NON-ASN)' : 'Nomor Induk Pegawai (NIP)'}
                        </label>
                        <input
                          type="text"
                          required={newStatusDetail !== 'Non_ASN'}
                          disabled={newStatusDetail === 'Non_ASN'}
                          placeholder={newStatusDetail === 'Non_ASN' ? "Non-ASN Tidak Memiliki NIP (Gunakan NIK)" : "Contoh: 19900215..."}
                          value={newStatusDetail === 'Non_ASN' ? '' : newNip}
                          onChange={(e) => {
                            if (newStatusDetail !== 'Non_ASN') {
                              setNewNip(e.target.value);
                              setNewPppkNi(e.target.value);
                            }
                          }}
                          className={`w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500 ${newStatusDetail === 'Non_ASN' ? 'opacity-50 cursor-not-allowed bg-[#16161a]/60 text-slate-500' : ''}`}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-400">Nama Lengkap</label>
                        <input
                          type="text"
                          required
                          placeholder="Nama lengkap..."
                          value={newNama}
                          onChange={(e) => setNewNama(e.target.value)}
                          className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-400">Gelar Belakang (Opsional)</label>
                        <input
                          type="text"
                          placeholder="A.Md.Kep, S.Tr.Keb, dsb..."
                          value={newGelar}
                          onChange={(e) => setNewGelar(e.target.value)}
                          className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-400">Jenis Golongan & ASN status</label>
                        <select
                          value={newStatusDetail}
                          onChange={(e) => setNewStatusDetail(e.target.value as StatusPegawaiDetail)}
                          className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="PNS">Pegawai Negeri Sipil (PNS)</option>
                          <option value="PPPK_Penuh_Waktu">PPPK Penuh Waktu</option>
                          <option value="PPPK_Paruh_Waktu">PPPK Paruh Waktu</option>
                          <option value="Non_ASN">PKWT / Non-ASN</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-400">Kategori Jabatan (Rumpun)</label>
                        <select
                          value={newJenisPegawai}
                          onChange={(e) => setNewJenisPegawai(e.target.value as JenisPegawai)}
                          className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="Jafung_Kesehatan">Pejabat Fungsional Kesehatan (Jafung)</option>
                          <option value="Struktural">Pejabat Struktural</option>
                          <option value="Staf_Umum">Staf Umum / Administrasi</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-emerald-400 font-bold">Rumpun Profesi Kesehatan (SDMK)</label>
                        <select
                          value={newProfesiId}
                          onChange={(e) => setNewProfesiId(parseInt(e.target.value))}
                          className="w-full p-2 border border-emerald-500/30 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500 font-bold"
                        >
                          {dbState.profesiSdmk.map(p => (
                            <option key={p.id} value={p.id}>{p.nama_profesi}</option>
                          ))}
                        </select>
                      </div>

                      {newStatusDetail !== 'Non_ASN' && (
                        <div className="space-y-1.5 animate-in fade-in duration-200">
                          <label className="text-slate-400">Golongan Ruang <span className="text-[10px] text-teal-400 font-normal block mt-0.5">(bisa lebih cepat apabila AK tercukupi)</span></label>
                          <select
                            value={newGolongan}
                            onChange={(e) => setNewGolongan(e.target.value)}
                            className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500"
                          >
                            <optgroup label="Golongan PNS">
                              <option value="I/a">I/a - Juru Muda</option>
                              <option value="I/b">I/b - Juru Muda Tk. I</option>
                              <option value="I/c">I/c - Juru</option>
                              <option value="I/d">I/d - Juru Tk. I</option>
                              <option value="II/a">II/a - Pengatur Muda</option>
                              <option value="II/b">II/b - Pengatur Muda Tk. I</option>
                              <option value="II/c">II/c - Pengatur</option>
                              <option value="II/d">II/d - Pengatur Tk. I</option>
                              <option value="III/a">III/a - Penata Muda</option>
                              <option value="III/b">III/b - Penata Muda Tk. I</option>
                              <option value="III/c">III/c - Penata</option>
                              <option value="III/d">III/d - Penata Tk. I</option>
                              <option value="IV/a">IV/a - Pembina</option>
                              <option value="IV/b">IV/b - Pembina Tk. I</option>
                              <option value="IV/c">IV/c - Pembina Utama Muda</option>
                              <option value="IV/d">IV/d - Pembina Utama Madya</option>
                              <option value="IV/e">IV/e - Pembina Utama</option>
                            </optgroup>
                            <optgroup label="Golongan PPPK">
                              <option value="Golongan I">Golongan I</option>
                              <option value="Golongan II">Golongan II</option>
                              <option value="Golongan III">Golongan III</option>
                              <option value="Golongan IV">Golongan IV</option>
                              <option value="Golongan V">Golongan V</option>
                              <option value="Golongan VI">Golongan VI</option>
                              <option value="Golongan VII">Golongan VII</option>
                              <option value="Golongan VIII">Golongan VIII</option>
                              <option value="Golongan IX">Golongan IX</option>
                              <option value="Golongan X">Golongan X</option>
                              <option value="Golongan XI">Golongan XI</option>
                              <option value="Golongan XII">Golongan XII</option>
                              <option value="Golongan XIII">Golongan XIII</option>
                              <option value="Golongan XIV">Golongan XIV</option>
                              <option value="Golongan XV">Golongan XV</option>
                              <option value="Golongan XVI">Golongan XVI</option>
                              <option value="Golongan XVII">Golongan XVII</option>
                            </optgroup>
                          </select>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-slate-400">Jenis Kelamin</label>
                        <select
                          value={newGender}
                          onChange={(e) => setNewGender(e.target.value as JenisKelamin)}
                          className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="L">Laki-Laki (L)</option>
                          <option value="P">Perempuan (P)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-400">Tanggal Lahir</label>
                        <input
                          type="date"
                          required
                          value={newTanggalLahir}
                          onChange={(e) => setNewTanggalLahir(e.target.value)}
                          className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                        />
                      </div>

                      {newStatusDetail !== 'Non_ASN' && (
                        <div className="space-y-1.5 animate-in fade-in duration-200">
                          <label className="text-slate-400">Sisa Cuti Tahunan (Hari)</label>
                          <input
                            type="number"
                            required
                            min={0}
                            max={30}
                            value={newSisaCuti}
                            onChange={(e) => setNewSisaCuti(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500"
                            placeholder="contoh: 12"
                          />
                        </div>
                      )}

                      {/* Display Unit placement selector only if Admin Dinkes is adding, as Puskesmas maps to active tenant */}
                      <div className="space-y-1.5">
                        <label className="text-slate-400">Unit Penempatan Kerja</label>
                        {currentRole === 'admin_dinkes' ? (
                          <select
                            value={newUnitId}
                            onChange={(e) => {
                              const uid = Number(e.target.value);
                              setNewUnitId(uid);
                              const psk = dbState.puskesmas.find(p => p.id === uid);
                              if (psk) {
                                setNewPnsUnor(psk.nama_puskesmas);
                                setNewPnsUnorInduk(psk.nama_puskesmas);
                                setNewPppkUnor(psk.nama_puskesmas);
                              }
                            }}
                            className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg text-emerald-400 font-semibold"
                          >
                            {dbState.puskesmas.map(p => (
                              <option key={p.id} value={p.id}>{p.nama_puskesmas}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="w-full p-2 bg-emerald-950/20 border border-emerald-500/20 rounded-lg text-slate-300 font-bold">
                            {getPuskesmasName(selectedPuskesmasId)} (Terkunci Otomatis)
                          </div>
                        )}
                      </div>

                      {/* ================= STR & SIP PROFILE FIELDS ================= */}
                      {newJenisPegawai === 'Jafung_Kesehatan' && (
                        <div className="md:col-span-3 border-t border-white/5 pt-4 mt-2 space-y-4">
                          <div className="bg-emerald-950/20 border border-emerald-500/10 p-3 rounded-lg">
                            <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                              Informasi STR &amp; SIP (Surat Tanda Registrasi &amp; Surat Izin Praktik)
                            </span>
                            <p className="text-[10.5px] text-slate-400 mt-1 leading-relaxed">
                              Lengkapi data nomor registrasi, tanggal terbit, dan tanggal kadaluarsa STR serta SIP tenaga kesehatan bersangkutan.
                            </p>
                          </div>
  
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* STR Fields Card */}
                            <div className="p-4 bg-slate-900/45 border border-white/5 rounded-xl space-y-3">
                              <h4 className="text-xs font-bold text-emerald-400">Arsip STR (Surat Tanda Registrasi)</h4>
                              
                              <div className="space-y-1.5">
                                <label className="text-slate-400 font-semibold block">Nomor STR</label>
                                <input
                                  type="text"
                                  placeholder="Contoh: STR-1234567-89"
                                  value={newNoStr}
                                  onChange={(e) => setNewNoStr(e.target.value)}
                                  className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>
  
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1.5">
                                  <label className="text-slate-400 font-semibold block">Tanggal Terbit STR</label>
                                  <input
                                    type="date"
                                    value={newTanggalTerbitStr}
                                    onChange={(e) => setNewTanggalTerbitStr(e.target.value)}
                                    className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg text-xs"
                                  />
                                </div>
  
                                <div className="space-y-1.5">
                                  <div className="flex justify-between items-center mb-0.5">
                                    <label className="text-slate-400 font-semibold text-[11px]">Tanggal Akhir STR</label>
                                    <label className="flex items-center space-x-1 cursor-pointer text-emerald-400 select-none">
                                      <input
                                        type="checkbox"
                                        checked={newIsStrSeumurHidup}
                                        onChange={(e) => {
                                          setNewIsStrSeumurHidup(e.target.checked);
                                          if (e.target.checked) setNewTanggalAkhirStr('');
                                        }}
                                        className="accent-emerald-500 rounded scale-90"
                                      />
                                      <span className="text-[10px] font-bold">Seumur Hidup</span>
                                    </label>
                                  </div>
                                  <input
                                    type="date"
                                    disabled={newIsStrSeumurHidup}
                                    value={newTanggalAkhirStr}
                                    onChange={(e) => setNewTanggalAkhirStr(e.target.value)}
                                    className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg disabled:opacity-40 text-xs"
                                  />
                                </div>
                              </div>
                            </div>
  
                            {/* SIP Fields Card */}
                            <div className="p-4 bg-slate-900/45 border border-white/5 rounded-xl space-y-3">
                              <h4 className="text-xs font-bold text-teal-400">Arsip SIP (Surat Izin Praktik)</h4>
                              
                              <div className="space-y-1.5">
                                <label className="text-slate-400 font-semibold block">Nomor SIP</label>
                                <input
                                  type="text"
                                  placeholder="Contoh: SIP/503/452/DKS/2026"
                                  value={newNoSip}
                                  onChange={(e) => setNewNoSip(e.target.value)}
                                  className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>
  
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1.5">
                                  <label className="text-slate-400 font-semibold block">Tanggal Terbit SIP</label>
                                  <input
                                    type="date"
                                    value={newTanggalTerbitSip}
                                    onChange={(e) => setNewTanggalTerbitSip(e.target.value)}
                                    className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg text-xs"
                                  />
                                </div>
  
                                <div className="space-y-1.5">
                                  <label className="text-slate-400 font-semibold block">Tanggal Akhir SIP</label>
                                  <input
                                    type="date"
                                    value={newTanggalAkhirSip}
                                    onChange={(e) => setNewTanggalAkhirSip(e.target.value)}
                                    className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg text-xs"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ================= CONDITION 1: PNS PROFILE FIELDS ================= */}
                      {newStatusDetail === 'PNS' && (
                        <div className="md:col-span-3 border-t border-white/5 pt-4 mt-2 space-y-4">
                          <div className="bg-emerald-950/20 border border-emerald-500/10 p-3 rounded-lg">
                            <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                              Bidang Informasi Kepegawaian PNS (Regulasi BKN)
                            </span>
                            <p className="text-[10.5px] text-slate-400 mt-1 leading-relaxed">
                              Sesuai regulasi Badan Kepegawaian Negara, lengkapilah status kenaikan pangkat, TMT, pertek, dan nomenklatur instansi pembina pegawai di bawah ini.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-slate-400">Pangkat Nama (e.g. Pembina Tkt. I) <span className="text-[10px] text-teal-400 font-normal block mt-0.5">(bisa lebih cepat apabila AK tercukupi)</span></label>
                              <input
                                type="text"
                                value={newPangkatNama}
                                onChange={(e) => setNewPangkatNama(e.target.value)}
                                disabled={true}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500 disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-[#16161a]/50 text-emerald-400 font-semibold"
                                placeholder="Pembina Tingkat I"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Jenis Kenaikan Pangkat <span className="text-[10px] text-teal-400 font-normal block mt-0.5">(Otomatis 1 Tingkat Lebih Tinggi)</span></label>
                              <input
                                type="text"
                                value={newPnsJenisKenaikanPangkat}
                                onChange={(e) => setNewPnsJenisKenaikanPangkat(e.target.value)}
                                disabled={true}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500 disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-[#16161a]/50 text-emerald-400 font-semibold"
                                placeholder="Pilihan (Fungsional Tertentu)"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Masa Kerja Golongan</label>
                              <input
                                type="text"
                                value={newPnsMasaKerjaGolongan}
                                onChange={(e) => setNewPnsMasaKerjaGolongan(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500"
                                placeholder="Contoh: 28 tahun 1 bulan"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">TMT Golongan</label>
                              <input
                                type="date"
                                value={newPnsTmtGolongan}
                                onChange={(e) => setNewPnsTmtGolongan(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">No. Pertimbangan Teknis BKN</label>
                              <input
                                type="text"
                                value={newPnsNoPertekBkn}
                                onChange={(e) => setNewPnsNoPertekBkn(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg font-mono focus:ring-1 focus:ring-emerald-500"
                                placeholder="KG-25201000113"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Tgl. Pertimbangan Teknis BKN</label>
                              <input
                                type="date"
                                value={newPnsTglPertekBkn}
                                onChange={(e) => setNewPnsTglPertekBkn(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Nomor SK Pangkat</label>
                              <input
                                type="text"
                                value={newPnsNoSk}
                                onChange={(e) => setNewPnsNoSk(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg font-mono focus:ring-1 focus:ring-emerald-500"
                                placeholder="800.1.3.2/1246/BKD/2025"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Tanggal SK Pangkat</label>
                              <input
                                type="date"
                                value={newPnsTglSk}
                                onChange={(e) => setNewPnsTglSk(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Nama Jabatan Penuh</label>
                              <input
                                type="text"
                                value={newPnsNamaJabatan}
                                onChange={(e) => setNewPnsNamaJabatan(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500"
                                placeholder="Perawat Ahli Madya, Bidan Utama, dsb..."
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Jenis Jabatan</label>
                              <select
                                value={newPnsJenisJabatan}
                                onChange={(e) => setNewPnsJenisJabatan(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                              >
                                <option value="Jabatan Fungsional">Jabatan Fungsional</option>
                                <option value="Jabatan Struktural">Jabatan Struktural</option>
                                <option value="Fungsional Umum">Fungsional Umum</option>
                              </select>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">TMT Jabatan</label>
                              <input
                                type="date"
                                value={newPnsTmtJabatan}
                                onChange={(e) => setNewPnsTmtJabatan(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Nomor SK Jabatan</label>
                              <input
                                type="text"
                                value={newPnsNoSkJabatan}
                                onChange={(e) => setNewPnsNoSkJabatan(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg font-mono"
                                placeholder="821.16/264/BKD-PSDM/2022"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Tanggal SK Jabatan</label>
                              <input
                                type="date"
                                value={newPnsTglSkJabatan}
                                onChange={(e) => setNewPnsTglSkJabatan(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">TMT Gaji Berkala (Berikutnya/Terakhir)</label>
                              <input
                                type="date"
                                value={newTmtBerkalaTerakhir}
                                onChange={(e) => setNewTmtBerkalaTerakhir(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg text-amber-400 font-semibold"
                              />
                            </div>

                             <div className="space-y-1.5">
                              <label className="text-slate-400">Instansi Kerja <span className="text-[9px] text-emerald-500 font-mono font-bold">(KUNCI REGULASI)</span></label>
                              <input
                                type="text"
                                value={newPnsInstansiKerja}
                                onChange={(e) => setNewPnsInstansiKerja(e.target.value)}
                                disabled={true}
                                title="Instansi Kerja dikunci otomatis (Pemerintah Kab. Lombok Barat)"
                                className="w-full p-2 border border-white/5 bg-[#16161a]/60 text-slate-400 rounded-lg cursor-not-allowed opacity-75 font-medium"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Satuan Kerja (Satker) Induk <span className="text-[9px] text-emerald-500 font-mono font-bold">(KUNCI REGULASI)</span></label>
                              <input
                                type="text"
                                value={newPnsSatkerInduk}
                                onChange={(e) => setNewPnsSatkerInduk(e.target.value)}
                                disabled={true}
                                title="Satuan Kerja Induk dikunci otomatis (Dinas Kesehatan, Pengendalian Penduduk, dan Keluarga Berencana)"
                                className="w-full p-2 border border-white/5 bg-[#16161a]/60 text-slate-400 rounded-lg cursor-not-allowed opacity-75 font-medium"
                              />
                            </div>

                            <div className="space-y-1.5 font-semibold">
                              <label className="text-slate-400">
                                Unit Organisasi Kerja (Unor)
                                <span className="text-[9px] text-teal-400 font-mono font-bold ml-1.5">(OTOMATIS SESUAI UNIT TERPILIH)</span>
                              </label>
                              <input
                                type="text"
                                value={getPuskesmasName(currentRole === 'admin_dinkes' ? newUnitId : (selectedPuskesmasId || 1))}
                                disabled={true}
                                className="w-full p-2 border border-white/5 bg-[#16161a]/60 text-slate-400 rounded-lg cursor-not-allowed opacity-75 font-semibold"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ================= CONDITION 2: PPPK PROFILE FIELDS ================= */}
                      {(newStatusDetail === 'PPPK_Penuh_Waktu' || newStatusDetail === 'PPPK_Paruh_Waktu') && (
                        <div className="md:col-span-3 border-t border-white/5 pt-4 mt-2 space-y-4">
                          <div className="bg-emerald-950/20 border border-emerald-500/10 p-3 rounded-lg">
                            <span className="text-[10px] uppercase font-bold text-teal-400 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-teal-400 inline-block"></span>
                              Bidang Informasi PPPK {newStatusDetail === 'PPPK_Penuh_Waktu' ? 'Penuh Waktu' : 'Paruh Waktu'}
                            </span>
                            <p className="text-[10.5px] text-slate-400 mt-1 leading-relaxed">
                              Lengkapi data kepegawaian PPPK sesuai dengan kontrak BKN terdaftar (Nomor Induk PPPK, tanggal mulai-selesai perjanjian kerja).
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5 font-semibold">
                              <label className="text-slate-400">Nomor Induk PPPK (NI PPPK) <span className="text-[10px] text-teal-400 font-normal block mt-0.5">(Sesuai NIP di atas - Terkunci Otomatis)</span></label>
                              <input
                                type="text"
                                disabled={true}
                                value={newNip}
                                className="w-full p-2 border border-white/5 bg-[#16161a]/60 text-slate-400 rounded-lg font-mono cursor-not-allowed opacity-75"
                                placeholder="Diambil otomatis dari NIP di atas..."
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Nomor SK Perjanjian Kerja</label>
                              <input
                                type="text"
                                value={newPppkNoPerjanjian}
                                onChange={(e) => setNewPppkNoPerjanjian(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg font-mono"
                                placeholder="800.1/1412/BKD-PPPK/2024"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Tanggal Perjanjian Kerja</label>
                              <input
                                type="date"
                                value={newPppkTglPerjanjian}
                                onChange={(e) => setNewPppkTglPerjanjian(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Tanggal Mulai Perjanjian (Kontrak)</label>
                              <input
                                type="date"
                                value={newPppkTmtPerjanjianMulai}
                                onChange={(e) => setNewPppkTmtPerjanjianMulai(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Tanggal Selesai Perjanjian (Kontrak)</label>
                              <input
                                type="date"
                                value={newPppkTmtPerjanjianSelesai}
                                onChange={(e) => setNewPppkTmtPerjanjianSelesai(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg text-rose-400 font-semibold"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">TMT Golongan PPPK</label>
                              <input
                                type="date"
                                value={newPppkTmtGolongan}
                                onChange={(e) => setNewPppkTmtGolongan(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Nomor SK PPPK</label>
                              <input
                                type="text"
                                value={newPppkNoSk}
                                onChange={(e) => setNewPppkNoSk(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg font-mono"
                                placeholder="800/125/BKD/2024"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Tanggal SK PPPK</label>
                              <input
                                type="date"
                                value={newPppkTglSk}
                                onChange={(e) => setNewPppkTglSk(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Jabatan PPPK Terdaftar</label>
                              <input
                                type="text"
                                value={newPppkBknJabatan}
                                onChange={(e) => setNewPppkBknJabatan(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                                placeholder="e.g. Ahli Pratama - Bidan"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Golongan PPPK (e.g. IX, VII)</label>
                              <input
                                type="text"
                                value={newPppkBknGolongan}
                                onChange={(e) => setNewPppkBknGolongan(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg text-center"
                                placeholder="IX"
                              />
                            </div>

                            <div className="space-y-1.5 font-semibold">
                              <label className="text-slate-400">
                                Unit Organisasi Terdaftar
                                <span className="text-[9px] text-teal-400 font-mono font-bold ml-1.5">(OTOMATIS SESUAI UNIT TERPILIH)</span>
                              </label>
                              <input
                                type="text"
                                value={getPuskesmasName(currentRole === 'admin_dinkes' ? newUnitId : (selectedPuskesmasId || 1))}
                                disabled={true}
                                className="w-full p-2 border border-white/5 bg-[#16161a]/60 text-slate-400 rounded-lg cursor-not-allowed opacity-75 font-semibold"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ================= CONDITION 3: PKWT / NON-ASN FIELDS ================= */}
                      {newStatusDetail === 'Non_ASN' && (
                        <div className="md:col-span-3 border-t border-white/5 pt-4 mt-2 space-y-4">
                          <div className="bg-amber-950/20 border border-amber-500/10 p-3 rounded-lg">
                            <span className="text-[10px] uppercase font-bold text-amber-450 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                              Bidang Informasi PKWT & Non-ASN (Kontrak Kerja/Jasa Pelayanan)
                            </span>
                            <p className="text-[10.5px] text-slate-400 mt-1 leading-relaxed">
                              Lengkapi NIK Kependudukan, masa kerja aktif, no SK penugasan dinkes / puskesmas, serta sumber pembiayaan bulanan tenaga kerja.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-slate-400">Nomor Induk Kependudukan (NIK)</label>
                              <input
                                type="text"
                                required
                                maxLength={16}
                                value={newNik}
                                onChange={(e) => setNewNik(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg font-mono focus:ring-1 focus:ring-amber-500"
                                placeholder="520102..."
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Nomor SK Kontrak PKWT</label>
                              <input
                                type="text"
                                value={newPkwtNoSkKontrak}
                                onChange={(e) => setNewPkwtNoSkKontrak(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg font-mono"
                                placeholder="SK-KONTRAK/902/DINKES/2024"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Tanggal SK Kontrak</label>
                              <input
                                type="date"
                                value={newPkwtTglSkKontrak}
                                onChange={(e) => setNewPkwtTglSkKontrak(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">TMT Mulai Kontrak (TMT SK)</label>
                              <input
                                type="date"
                                value={newPkwtTmtSk}
                                onChange={(e) => setNewPkwtTmtSk(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Masa Kerja Penugasan</label>
                              <input
                                type="text"
                                value={newPkwtMasaKerja}
                                onChange={(e) => setNewPkwtMasaKerja(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                                placeholder="e.g. 2 Tahun 4 Bulan"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Sumber Pembiayaan Jasa</label>
                              <select
                                value={newPkwtPembiayaan}
                                onChange={(e) => setNewPkwtPembiayaan(e.target.value as any)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg text-amber-400 font-bold"
                              >
                                <option value="APBD">Anggaran Pendapatan Belanja Daerah (APBD)</option>
                                <option value="BLUD">Dana Operasional Puskesmas (BLUD)</option>
                                <option value="APBN">Dana Alokasi Khusus (APBN / BOK)</option>
                              </select>
                            </div>

                            <div className="space-y-1.5 md:col-span-2">
                              <label className="text-slate-400">Jabatan Penugasan / Jasa Pelayanan</label>
                              <input
                                type="text"
                                value={newPkwtJabatan}
                                onChange={(e) => setNewPkwtJabatan(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                                placeholder="Contoh: Tenaga Promosi Kesehatan / Driver Ambulance Kontrak..."
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="md:col-span-3 pt-3 flex justify-end">
                        <button
                          type="submit"
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition"
                        >
                          Simpan Pegawai Ke Database
                        </button>
                      </div>

                    </form>
                  )}

                  {/* FORM OPTION 2: BULK EXCEL SMART PASTE */}
                    {addMode === 'excel' && (
                     <div className="space-y-4">
                       {/* Tutorial & Download Section */}
                       <div className="bg-[#16161a] border border-emerald-500/10 p-5 rounded-2xl space-y-4">
                         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-3">
                           <div>
                             <h4 className="font-bold text-white text-sm flex items-center gap-2">
                               <Table className="text-emerald-400" size={18} />
                               Layanan Impor Pintar Excel (.xlsx) / Salin-Tempel
                             </h4>
                             <p className="text-xs text-slate-400 mt-0.5">
                               Unduh template resmi kami, lengkapi data Anda, lalu unggah kembali file Excel atau salin datanya langsung ke sistem.
                             </p>
                           </div>
                           <button
                             type="button"
                             onClick={downloadExcelTemplate}
                             className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition flex items-center gap-1.5 cursor-pointer self-start sm:self-center shrink-0"
                           >
                             📥 Unduh Template Excel (.xlsx)
                           </button>
                         </div>

                         {/* Step-by-step Tutorial */}
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                           <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-1.5">
                             <div className="w-5 h-5 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center font-bold font-mono text-[10px]">
                               1
                             </div>
                             <p className="font-bold text-white">Unduh &amp; Buka Template</p>
                             <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                               Klik tombol hijau di atas untuk mengunduh berkas <code className="text-emerald-400">Template_SIMPEG_Lombok_Barat.xlsx</code>. Buka menggunakan Excel atau WPS.
                             </p>
                           </div>

                           <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-1.5">
                             <div className="w-5 h-5 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center font-bold font-mono text-[10px]">
                               2
                             </div>
                             <p className="font-bold text-white">Isi Sesuai Format Aplikasi</p>
                             <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                               Masukkan data pegawai sesuai tutorial di lembar kedua Excel. Pastikan <strong>Status Pegawai</strong> dan <strong>Rumpun Jabatan</strong> sesuai pilihan valid di aplikasi.
                             </p>
                           </div>

                           <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-1.5">
                             <div className="w-5 h-5 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center font-bold font-mono text-[10px]">
                               3
                             </div>
                             <p className="font-bold text-white">Upload atau Tempel Data</p>
                             <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                               Seret berkas <code className="text-emerald-400">.xlsx</code> Anda ke area dropzone di bawah, ATAU salin baris data di Excel lalu tempelkan di kotak teks yang disediakan.
                             </p>
                           </div>
                         </div>

                         {/* Column Rules Guideline Alert Banner */}
                         <div className="bg-emerald-950/20 border border-emerald-500/20 p-3 rounded-lg text-[11px] space-y-1">
                           <p className="font-bold text-emerald-400 flex items-center gap-1">
                             <AlertCircle size={12} />
                             Ketentuan Penting Agar Data Terbaca Sistem Silakan Diperhatikan:
                           </p>
                           <ul className="list-disc pl-4 text-slate-300 space-y-1 leading-relaxed font-sans">
                             <li><strong>NIP / Identitas</strong>: Harus diisi NIP 18 digit untuk PNS/PPPK atau nomor KTP (NIK) untuk Pegawai Non ASN.</li>
                             <li><strong>Status Pegawai</strong>: Hanya isi dengan <code className="bg-black/30 px-1 py-0.5 rounded text-teal-400">PNS</code>, <code className="bg-black/30 px-1 py-0.5 rounded text-teal-400">PPPK Penuh Waktu</code>, <code className="bg-black/30 px-1 py-0.5 rounded text-teal-400">PPPK Paruh Waktu</code>, atau <code className="bg-black/30 px-1 py-0.5 rounded text-teal-400">Non ASN</code>.</li>
                             <li><strong>Rumpun Jabatan</strong>: Hanya isi dengan <code className="bg-black/30 px-1 py-0.5 rounded text-teal-400">Struktural</code>, <code className="bg-black/30 px-1 py-0.5 rounded text-teal-400">Jafung Kesehatan</code>, atau <code className="bg-black/30 px-1 py-0.5 rounded text-teal-400">Staf Umum</code>.</li>
                             <li><strong>Format Tanggal Lahir</strong>: Wajib berformat <code className="bg-black/30 px-1 py-0.5 rounded text-amber-400 font-mono">YYYY-MM-DD</code> (contoh: 1993-04-20).</li>
                           </ul>
                         </div>
                       </div>

                       {/* Target Unit Organization display/locking */}
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-[#16161a] border border-white/5 rounded-xl gap-2 text-xs">
                         <div className="space-y-0.5">
                           <p className="font-bold text-slate-300">Unit Penempatan Kerja</p>
                           <p className="text-[10px] text-slate-500">Mendistribusikan / memasangkan direktori pegawai hasil impor secara murni.</p>
                         </div>
                         {currentRole === 'admin_dinkes' ? (
                           <select
                             value={newUnitId}
                             onChange={(e) => {
                               const nextUnitId = Number(e.target.value);
                               setNewUnitId(nextUnitId);
                               handleExcelPasteChange(excelPasteText);
                             }}
                             className="p-1 px-3.5 border border-white/10 rounded-lg font-bold text-xs bg-black/40 text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                           >
                             {dbState.puskesmas.map(p => (
                               <option key={p.id} value={p.id}>{p.nama_puskesmas}</option>
                             ))}
                           </select>
                         ) : (
                           <div className="px-3 py-1.5 bg-emerald-950/40 border border-emerald-500/20 rounded-lg text-emerald-400 font-bold text-[11px]">
                             {getPuskesmasName(selectedPuskesmasId || 1)} (Mengikat Sesuai Akun Unit Anda)
                           </div>
                         )}
                       </div>

                       {/* Excel File Upload Drag-and-Drop Area */}
                       <div className="p-5 border-2 border-dashed border-white/10 hover:border-emerald-500/50 rounded-xl bg-[#16161a]/40 text-center space-y-2 group transition-all duration-200">
                         <input
                           type="file"
                           id="excel-file-upload-picker"
                           accept=".xlsx,.xls,.csv"
                           className="hidden"
                           onChange={(e) => {
                             const file = e.target.files?.[0];
                             if (file) {
                               handleExcelFileSelectXlsx(file);
                             }
                           }}
                         />
                         <label htmlFor="excel-file-upload-picker" className="cursor-pointer block space-y-1.5">
                           <div className="mx-auto w-10 h-10 rounded-full bg-emerald-950/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                             📊
                           </div>
                           <p className="text-xs text-slate-300 font-medium group-hover:text-emerald-400 transition-colors">
                             Seret &amp; Letakkan berkas template di sini, atau <strong className="text-emerald-400 underline">Pilih Berkas Excel (.xlsx, .xls)</strong>
                           </p>
                           <p className="text-[10px] text-slate-500">Aplikasi akan mengurai kolom spreadsheet secara otomatis dan instan</p>
                         </label>
                       </div>

                       {/* Copy-Paste area */}
                       <div className="space-y-1.5 font-sans">
                         <div className="flex justify-between items-center text-xs">
                           <label className="font-bold text-slate-400">Atau Tempel Baris Spreadsheet Excel Di Sini:</label>
                           <span className="text-[10px] text-slate-500">Mendeteksi format salin sel excel otomatis</span>
                         </div>
                         <textarea
                           rows={5}
                           value={excelPasteText}
                           onChange={(e) => handleExcelPasteChange(e.target.value)}
                           placeholder="NIP / Identitas [Tab] Nama Lengkap [Tab] Gelar Belakang [Tab] Jenis Kelamin [Tab] Status Pegawai [Tab] Rumpun Jabatan [Tab] Golongan Ruang [Tab] Tanggal Lahir [Tab] Sisa Cuti"
                           className="w-full p-2.5 bg-black/30 text-white border border-white/5 rounded-xl font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                         />
                         {excelImportMessage && (
                           <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg mt-1 font-sans">
                             {excelImportMessage}
                           </div>
                         )}
                       </div>

                       {/* Render Parsed list preview */}
                       {excelParsedPreview.length > 0 && (
                         <div className="space-y-2">
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Pratinjau Hasil Pembacaan ({excelParsedPreview.length} baris):</p>
                           <div className="max-h-52 overflow-y-auto border border-white/5 rounded-xl text-[11px]">
                             <table className="w-full text-left">
                               <thead className="bg-[#16161a] text-slate-400 font-sans">
                                 <tr>
                                   <th className="p-2">NIP / Identitas</th>
                                   <th className="p-2">Nama Lengkap &amp; Gelar</th>
                                   <th className="p-2">Gender</th>
                                   <th className="p-2">Status &amp; Rumpun</th>
                                   <th className="p-2">Golongan</th>
                                   <th className="p-2">Lahir</th>
                                   <th className="p-2">Unit Penempatan</th>
                                 </tr>
                               </thead>
                               <tbody className="divide-y divide-white/5 bg-black/20 text-slate-300">
                                 {excelParsedPreview.map((x, i) => (
                                   <tr key={i} className="hover:bg-white/[0.02]">
                                     <td className="p-2 font-mono text-[10px] text-slate-400">{x.nip}</td>
                                     <td className="p-2 font-bold text-white">
                                       {x.nama_lengkap}{x.gelar_belakang ? `, ${x.gelar_belakang}` : ''}
                                     </td>
                                     <td className="p-2">{x.jenis_kelamin === 'L' ? 'L' : 'P'}</td>
                                     <td className="p-2">
                                       <div className="flex flex-col gap-0.5">
                                         <span className="px-1.5 py-0.5 rounded text-[9px] bg-teal-950/45 text-teal-400 font-mono w-max">
                                           {x.status_pegawai_detail}
                                         </span>
                                         <span className="text-[9px] text-slate-400">
                                           {x.jenis_pegawai}
                                         </span>
                                       </div>
                                     </td>
                                     <td className="p-2 font-mono font-bold text-teal-400">{x.golongan_ruang}</td>
                                     <td className="p-2 font-mono text-slate-400">{x.tanggal_lahir}</td>
                                     <td className="p-2 font-medium text-slate-300">{getPuskesmasName(x.id_puskesmas)}</td>
                                   </tr>
                                 ))}
                               </tbody>
                             </table>
                           </div>

                           <div className="flex justify-end pt-2">
                             <button
                               onClick={handleSaveBulkExcelImport}
                               className="px-6 py-2 bg-emerald-650 hover:bg-emerald-700 text-white font-bold rounded-lg transition text-xs font-sans shadow-lg shadow-emerald-950/50"
                             >
                               Selesaikan &amp; Simpan {excelParsedPreview.length} Pegawai
                             </button>
                           </div>
                         </div>
                       )}
                     </div>
                   )}

                </div>
              )}

              {/* Roster Table Filter Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0f0f12] p-4 border border-white/5 rounded-xl text-xs">
                
                <div className="flex flex-wrap items-center gap-3">
                  
                  {/* Select Status filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold block">Status Kepegawaian</label>
                    <select
                      value={rosterStatusFilter}
                      onChange={(e) => setRosterStatusFilter(e.target.value)}
                      className="p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:outline-none"
                    >
                      <option value="ALL">Semua Jenis Status</option>
                      <option value="PNS">Pegawai Negeri Sipil (PNS)</option>
                      <option value="PPPK_Penuh_Waktu">PPPK Penuh Waktu</option>
                      <option value="PPPK_Paruh_Waktu">PPPK Paruh Waktu</option>
                      <option value="Non_ASN">PKWT / Non-ASN</option>
                    </select>
                  </div>

                  {/* Dinkes Center only - Filter Unit Kerja */}
                  {currentRole === 'admin_dinkes' && (
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-bold block">Pilih Unit Kerja</label>
                      <select
                        value={rosterUnitFilter}
                        onChange={(e) => setRosterUnitFilter(e.target.value)}
                        className="p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:outline-none text-emerald-400 font-bold"
                      >
                        <option value="ALL">Semua Unit Kerja Dinas (Milik Dikes PPKB)</option>
                        {dbState.puskesmas.map(pk => (
                          <option key={pk.id} value={pk.id}>{pk.nama_puskesmas}</option>
                        ))}
                      </select>
                    </div>
                  )}

                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase font-bold block">Cari Pegawai (NIP/Nama)</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Cari nama, NIP, jafung..."
                      value={rosterSearch}
                      onChange={(e) => setRosterSearch(e.target.value)}
                      className="pl-8 pr-4 py-1.5 border border-white/5 bg-[#16161a] text-white rounded-xl text-xs w-60 focus:ring-1 focus:ring-emerald-500 focus:outline-none block"
                    />
                  </div>
                </div>

              </div>

              {/* Pegawai Database Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
                <table className="w-full text-left text-xs text-slate-800 border-collapse min-w-[1200px] bg-white">
                  <thead className="bg-slate-50 text-[10px] text-slate-600 uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3 text-slate-700 w-12 text-center">NO</th>
                      <th className="p-3 text-slate-700">NAMA PEGAWAI / IDENTITAS</th>
                      <th className="p-3 font-bold text-slate-700">GOLONGAN STATUS</th>
                      <th className="p-3 text-slate-700">GENDER</th>
                      <th className="p-3 text-slate-700">JABATAN RUMPUN</th>
                      <th className="p-3 text-slate-700">UNIT PENEMPATAN</th>
                      <th className="p-3 text-emerald-800 font-bold">TMT GOLONGAN / PANGKAT</th>
                      <th className="p-3 text-cyan-800 font-bold">TMT JABATAN (JAFUNG)</th>
                      <th className="p-3 text-amber-800 font-bold">TMT GAJI BERKALA (KGB)</th>
                      <th className="p-3 border-r border-slate-200 text-slate-700">SISA CUTI TAHUNAN</th>
                      <th className="p-3 text-center text-slate-700">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredRoster.map((asn, idx) => {
                      const displayStatus = asn.status_pegawai_detail === 'PNS' 
                        ? 'PNS' 
                        : asn.status_pegawai_detail === 'PPPK_Penuh_Waktu' 
                          ? 'PPPK Penuh Waktu' 
                          : asn.status_pegawai_detail === 'PPPK_Paruh_Waktu' 
                            ? 'PPPK Paruh Waktu' 
                            : 'PKWT / Non-ASN';

                      // TMT calculations
                      const tmtPangkatLama = asn.status_pegawai_detail === 'PNS' 
                        ? (asn.pns_tmt_golongan || asn.tmt_pangkat_terakhir) 
                        : asn.status_pegawai_detail.startsWith('PPPK')
                          ? (asn.pppk_tmt_golongan || asn.tmt_pangkat_terakhir)
                          : (asn.pkwt_tmt_sk || asn.tmt_pangkat_terakhir || '-');
                      
                      const tmtPangkatBaru = (tmtPangkatLama && tmtPangkatLama !== '-') 
                        ? addYearsToDateString(tmtPangkatLama, 4) 
                        : '-';

                      const isJafung = asn.jenis_pegawai === 'Jafung_Kesehatan';
                      const tmtJafungTerakhir = asn.status_pegawai_detail === 'PNS' 
                        ? (asn.pns_tmt_jabatan || asn.tmt_jabatan_terakhir) 
                        : asn.tmt_jabatan_terakhir || '-';

                      // Under Permenpan RB 1/2023, promotion minimum tenure is 3 years
                      const tmtJafungSelanjutnya = (isJafung && tmtJafungTerakhir && tmtJafungTerakhir !== '-') 
                        ? addYearsToDateString(tmtJafungTerakhir, 3) 
                        : '-';

                      const tmtBerkalaTerakhir = asn.tmt_berkala_terakhir || '-';
                      const tmtBerkalaSelanjutnya = (tmtBerkalaTerakhir && tmtBerkalaTerakhir !== '-') 
                        ? addYearsToDateString(tmtBerkalaTerakhir, 2) 
                        : '-';

                      return (
                        <tr key={asn.id} className="hover:bg-slate-50/80 transition text-slate-900 border-b border-slate-100">
                          <td className="p-3 text-center text-slate-400 font-mono font-bold w-12 border-r border-slate-100">
                            {idx + 1}
                          </td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => setSelectedProfileForDetail(asn)}
                              className="text-left font-extrabold text-[#1e293b] hover:text-indigo-600 hover:underline text-[12px] cursor-pointer transition focus:outline-none block"
                              title="Klik untuk melihat detail profil lengkap pegawai"
                            >
                              {asn.nama_lengkap}{asn.gelar_belakang ? `, ${asn.gelar_belakang}` : ''}
                            </button>
                            <div className="text-[10.5px] text-black font-mono mt-0.5 font-bold">NIP {asn.nip}</div>
                            {(asn.no_str || asn.no_sip) && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {asn.no_str && (
                                  <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-200 rounded px-1.5 py-0.5 font-bold block" title={`STR Expiry: ${asn.tanggal_akhir_str}`}>
                                    STR: {asn.no_str} {asn.tanggal_akhir_str === 'Seumur Hidup' ? '♾️ Seumur Hidup' : `(s.d. ${formatDate(asn.tanggal_akhir_str || '')})`}
                                  </span>
                                )}
                                {asn.no_sip && (
                                  <span className="text-[9px] bg-teal-50 text-teal-800 border border-teal-200 rounded px-1.5 py-0.5 font-bold block" title={`SIP Expiry: ${asn.tanggal_akhir_sip}`}>
                                    SIP: {asn.no_sip} (s.d. {formatDate(asn.tanggal_akhir_sip || '')})
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col space-y-1">
                              <span className="w-fit bg-slate-100 text-slate-900 border border-slate-250 px-2 py-0.5 rounded font-mono font-black text-[10px]">
                                {asn.golongan_ruang}
                              </span>
                              <span className={`w-fit text-[9.5px] font-black ${asn.status_pegawai_detail === 'PNS' ? 'text-indigo-850' : 'text-teal-850'}`}>
                                {displayStatus}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 font-extrabold text-slate-900">
                            {asn.jenis_kelamin === 'L' ? 'Laki-Laki' : 'Perempuan'}
                          </td>
                          <td className="p-3 text-slate-800">
                            <div className="font-extrabold text-slate-950">{asn.jenis_pegawai.replace("_", " ")}</div>
                            <p className="text-[10px] text-slate-800 mt-0.5 font-bold">{asn.jenjang_jafung || 'Struktural/Staf'}</p>
                          </td>
                          <td className="p-3 font-black text-emerald-800">
                            {getPuskesmasName(asn.id_puskesmas)}
                          </td>
                          
                          {/* 1. TMT GOLONGAN / PANGKAT LAMA & BARU */}
                          <td className="p-3">
                            {asn.status_pegawai_detail !== 'Non_ASN' && tmtPangkatLama && tmtPangkatLama !== '-' ? (
                              <div className="flex flex-col space-y-0.5 text-[11px] leading-tight text-black">
                                <span className="text-black text-[10px] font-bold">Lama: <strong className="text-black font-black font-mono">{formatDate(tmtPangkatLama)}</strong></span>
                                <span className="text-black text-[10px] font-bold">Baru: <strong className="text-black font-black font-mono inline-block" title="Otomatis +4 Tahun">{formatDate(tmtPangkatBaru)}</strong></span>
                              </div>
                            ) : (
                              <span className="text-black font-mono">-</span>
                            )}
                          </td>

                          {/* 2. TMT JABATAN (JAFUNG) TERAKHIR & SELANJUTNYA */}
                          <td className="p-3">
                            {asn.status_pegawai_detail !== 'Non_ASN' && isJafung && tmtJafungTerakhir && tmtJafungTerakhir !== '-' ? (
                              <div className="flex flex-col space-y-0.5 text-[11px] leading-tight text-black">
                                <span className="text-black text-[10px] font-bold">Terakhir: <strong className="text-black font-black font-mono">{formatDate(tmtJafungTerakhir)}</strong></span>
                                <span className="text-black text-[10px] font-bold" title="Min. Syarat Tenure Promosi PermenpanRB 1/2023 (+3 Tahun)">Berikutnya: <strong className="text-black font-black font-mono">{formatDate(tmtJafungSelanjutnya)}</strong></span>
                              </div>
                            ) : (
                              <span className="text-black font-mono" title="Bukan Pejabat Fungsional Kesehatan">-</span>
                            )}
                          </td>

                          {/* 3. TMT BERKALA (KGB) TERAKHIR & SELANJUTNYA */}
                          <td className="p-3">
                            {asn.status_pegawai_detail !== 'Non_ASN' && tmtBerkalaTerakhir && tmtBerkalaTerakhir !== '-' ? (
                              <div className="flex flex-col space-y-0.5 text-[11px] leading-tight text-black">
                                <span className="text-black text-[10px] font-bold">Lama: <strong className="text-black font-black font-mono">{formatDate(tmtBerkalaTerakhir)}</strong></span>
                                <span className="text-black text-[10px] font-bold">Baru: <strong className="text-black font-black font-mono" title="Otomatis KGB +2 Tahun">{formatDate(tmtBerkalaSelanjutnya)}</strong></span>
                              </div>
                            ) : (
                              <span className="text-black font-mono">-</span>
                            )}
                          </td>

                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${asn.sisa_cuti_tahunan > 4 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-805 border border-amber-200'}`}>
                              {asn.sisa_cuti_tahunan} Hari
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {(currentRole === 'admin_dinkes' || asn.id_puskesmas === selectedPuskesmasId) ? (
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingAsn(asn)}
                                  className="px-2 py-0.5 bg-teal-905 hover:bg-teal-900 border border-teal-700/50 text-teal-200 rounded text-[9.5px] font-bold transition cursor-pointer"
                                  title="Edit data profil pegawai"
                                >
                                  Ubah
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEmployee(asn.id, asn.nama_lengkap)}
                                  className="px-2 py-0.5 bg-rose-950 hover:bg-rose-900 border border-rose-800/50 text-rose-300 rounded text-[9.5px] font-bold transition cursor-pointer"
                                  title="Hapus pegawai dari unit"
                                >
                                  Hapus
                                </button>
                              </div>
                            ) : (
                              <span className="text-[9px] text-slate-600 block italic">Terbatas</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredRoster.length === 0 && (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-500 italic">Data Roster Pegawai tidak ditemukan. Silakan tambahkan baru di atas atau ubah filter pencarian.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>

       {/* ======================= MODAL: EDIT EMPLOYEE PROFILE (CRUD) ======================= */}
      {editingAsn && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl max-w-4xl w-full p-6 animate-in fade-in zoom-in-95 duration-200 my-4 flex flex-col max-h-[92vh]">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4 shrink-0">
              <div className="text-left">
                <h4 className="font-bold text-slate-900 font-display text-sm uppercase tracking-wide text-left">Edit Data Pegawai Lombok Barat</h4>
                <p className="text-xs text-slate-500 text-left">Silakan mutakhirkan records kepegawaian bagi #{editingAsn.id}</p>
              </div>
              <button 
                type="button"
                onClick={() => setEditingAsn(null)} 
                className="text-slate-400 hover:text-slate-800 p-1.5 hover:bg-slate-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                let finalAsn = { ...editingAsn };
                if (finalAsn.status_pegawai_detail === 'PNS') {
                  finalAsn.pangkat_nama = GOLONGAN_TO_PANGKAT[finalAsn.golongan_ruang] || finalAsn.pangkat_nama;
                  finalAsn.pns_jenis_kenaikan_pangkat = getNextGolonganDescription(finalAsn.golongan_ruang);
                  finalAsn.pns_tmt_golongan = finalAsn.tmt_pangkat_terakhir;
                  finalAsn.pns_tmt_jabatan = finalAsn.tmt_jabatan_terakhir;
                }
                handleUpdateEmployee(finalAsn);
              }}
              className="text-xs text-slate-700 text-left flex flex-col overflow-hidden"
            >
              <div className="overflow-y-auto pr-2 space-y-6 max-h-[65vh] md:max-h-[70vh]">
                
                {/* I. DATA DASAR PEGAWAI */}
                <div>
                  <h5 className="font-bold text-emerald-800 text-[10.5px] uppercase tracking-wider mb-3 border-b border-slate-150 pb-1">I. Data Dasar Pegawai</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-slate-600 font-semibold block mb-1">Nama Lengkap</label>
                      <input
                        type="text" required
                        value={editingAsn.nama_lengkap}
                        onChange={(e) => setEditingAsn({ ...editingAsn, nama_lengkap: e.target.value })}
                        className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-600 font-semibold block mb-1">NIP (Nomor Induk Pegawai)</label>
                      <input
                        type="text" required
                        value={editingAsn.nip}
                        onChange={(e) => setEditingAsn({ ...editingAsn, nip: e.target.value })}
                        className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-600 font-semibold block mb-1">Gelar Belakang (Optional)</label>
                      <input
                        type="text"
                        value={editingAsn.gelar_belakang || ''}
                        onChange={(e) => setEditingAsn({ ...editingAsn, gelar_belakang: e.target.value || null })}
                        className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-600 font-semibold block mb-1">Jenis Kelamin</label>
                      <select
                        value={editingAsn.jenis_kelamin}
                        onChange={(e) => setEditingAsn({ ...editingAsn, jenis_kelamin: e.target.value as JenisKelamin })}
                        className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                      >
                        <option value="L">Laki-Laki</option>
                        <option value="P">Perempuan</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-600 font-semibold block mb-1">Tanggal Lahir</label>
                      <input
                        type="date" required
                        value={editingAsn.tanggal_lahir}
                        onChange={(e) => setEditingAsn({ ...editingAsn, tanggal_lahir: e.target.value })}
                        className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-600 font-semibold block mb-1">Status Detail Kepegawaian</label>
                      <select
                        value={editingAsn.status_pegawai_detail}
                        onChange={(e) => setEditingAsn({ ...editingAsn, status_pegawai_detail: e.target.value as StatusPegawaiDetail })}
                        className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                      >
                        <option value="PNS">PNS (Pegawai Negeri Sipil)</option>
                        <option value="PPPK_Penuh_Waktu">PPPK Penuh Waktu</option>
                        <option value="PPPK_Paruh_Waktu">PPPK Paruh Waktu</option>
                        <option value="Non_ASN">Non-ASN / PKWT</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-600 font-semibold block mb-1">Unit Kerja Penempatan</label>
                      <select
                        value={editingAsn.id_puskesmas}
                        onChange={(e) => setEditingAsn({ ...editingAsn, id_puskesmas: parseInt(e.target.value) })}
                        disabled={currentRole === 'admin_puskesmas'}
                        className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                      >
                        {dbState.puskesmas.map(pk => (
                          <option key={pk.id} value={pk.id}>{pk.nama_puskesmas}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-600 font-semibold block mb-1">Rumpun Jabatan</label>
                      <select
                        value={editingAsn.jenis_pegawai}
                        onChange={(e) => setEditingAsn({ ...editingAsn, jenis_pegawai: e.target.value as JenisPegawai })}
                        className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                      >
                        <option value="Jafung_Kesehatan">Jabatan Fungsional (Jafung Kesehatan)</option>
                        <option value="Struktural">Pejabat Struktural</option>
                        <option value="Staf_Umum">Staf Administrasi / Umum</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-emerald-800 font-semibold block mb-1">Profesi Kesehatan (SDMK)</label>
                      <select
                        value={editingAsn.id_profesi || 1}
                        onChange={(e) => setEditingAsn({ ...editingAsn, id_profesi: parseInt(e.target.value) })}
                        className="w-full p-2 border border-emerald-300 bg-emerald-50/30 text-emerald-950 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition font-bold shadow-xs"
                      >
                        {dbState.profesiSdmk.map(p => (
                          <option key={p.id} value={p.id}>{p.nama_profesi}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-600 font-semibold block mb-1">Jenjang Jafung <span className="text-[10px] text-teal-600 font-normal block mt-0.5">(bisa lebih cepat apabila AK tercukupi)</span></label>
                      <select
                        value={editingAsn.jenjang_jafung || 'Ahli Pertama'}
                        onChange={(e) => setEditingAsn({ ...editingAsn, jenjang_jafung: e.target.value })}
                        className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                      >
                        <option value="Terampil">Terampil</option>
                        <option value="Mahir">Mahir</option>
                        <option value="Penyelia">Penyelia</option>
                        <option value="Ahli Pertama">Ahli Pertama</option>
                        <option value="Ahli Muda">Ahli Muda</option>
                        <option value="Ahli Madya">Ahli Madya</option>
                      </select>
                    </div>

                    {editingAsn.status_pegawai_detail !== 'Non_ASN' && (
                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Golongan Ruang <span className="text-[10px] text-teal-600 font-normal block mt-0.5">(bisa lebih cepat apabila AK tercukupi)</span></label>
                        <select
                          value={editingAsn.golongan_ruang}
                          onChange={(e) => setEditingAsn({ ...editingAsn, golongan_ruang: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        >
                          <optgroup label="Golongan PNS">
                            {LIST_GOLONGAN_PNS.map(g => (
                              <option key={g} value={g}>{g} - {GOLONGAN_TO_PANGKAT[g]}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Golongan PPPK">
                            {Array.from({ length: 17 }, (_, i) => `Golongan ${i + 1}`).map(g => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-slate-600 font-semibold block mb-1">Sisa Cuti Tahunan (Hari)</label>
                      <input
                        type="number" required
                        value={editingAsn.sisa_cuti_tahunan}
                        onChange={(e) => setEditingAsn({ ...editingAsn, sisa_cuti_tahunan: parseInt(e.target.value) || 0 })}
                        disabled={currentRole !== 'admin_dinkes'}
                        className={`w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg ${currentRole !== 'admin_dinkes' ? 'opacity-60 cursor-not-allowed bg-slate-50 text-slate-500 border-slate-200' : 'focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none'}`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-emerald-800 font-semibold block mb-1">TMT Pangkat Terakhir / Lama</label>
                      <input
                        type="date" required
                        value={editingAsn.tmt_pangkat_terakhir}
                        onChange={(e) => setEditingAsn({ ...editingAsn, tmt_pangkat_terakhir: e.target.value })}
                        className="w-full p-2 border border-emerald-300 bg-emerald-50/20 text-emerald-950 font-bold rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition font-medium shadow-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-cyan-800 font-semibold block mb-1">TMT Jabatan Terakhir</label>
                      <input
                        type="date" required
                        value={editingAsn.tmt_jabatan_terakhir}
                        onChange={(e) => setEditingAsn({ ...editingAsn, tmt_jabatan_terakhir: e.target.value })}
                        className="w-full p-2 border border-cyan-300 bg-cyan-50/20 text-cyan-950 font-bold rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition font-medium shadow-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-amber-800 font-semibold block mb-1">TMT Gaji Berkala Terakhir</label>
                      <input
                        type="date" required
                        value={editingAsn.tmt_berkala_terakhir}
                        onChange={(e) => setEditingAsn({ ...editingAsn, tmt_berkala_terakhir: e.target.value })}
                        className="w-full p-2 border border-amber-300 bg-amber-50/20 text-amber-950 font-bold rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none transition font-medium shadow-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* II. DETAIL SPESIFIK STATUS KEPEGAWAIAN */}
                {editingAsn.status_pegawai_detail === 'PNS' && (
                  <div className="border-t border-slate-200 pt-5 space-y-4 animate-in fade-in duration-200">
                    <h5 className="font-bold text-indigo-800 text-[10.5px] uppercase tracking-wider border-b border-indigo-100 pb-1">II. Informasi PNS (Regulasi BKN)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Pangkat Nama <span className="text-[10px] text-teal-600 font-normal block mt-0.5">(bisa lebih cepat apabila AK tercukupi)</span></label>
                        <input
                          type="text" disabled={true}
                          value={GOLONGAN_TO_PANGKAT[editingAsn.golongan_ruang] || editingAsn.pangkat_nama || ''}
                          className="w-full p-2 border border-slate-200 bg-slate-50 text-slate-500 rounded-lg font-bold cursor-not-allowed shadow-inner"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Jenis Kenaikan Pangkat <span className="text-[10px] text-teal-600 font-normal block mt-0.5">(Isi Otomatis)</span></label>
                        <input
                          type="text" disabled={true}
                          value={getNextGolonganDescription(editingAsn.golongan_ruang)}
                          className="w-full p-2 border border-slate-200 bg-slate-50 text-slate-500 rounded-lg font-bold cursor-not-allowed shadow-inner"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Masa Kerja Golongan</label>
                        <input
                          type="text"
                          value={editingAsn.pns_masa_kerja_golongan || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pns_masa_kerja_golongan: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                          placeholder="Contoh: 05 tahun 02 bulan"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">No. Pertimbangan Teknis BKN</label>
                        <input
                          type="text"
                          value={editingAsn.pns_no_pertek_bkn || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pns_no_pertek_bkn: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Tgl Pertimbangan Teknis BKN</label>
                        <input
                          type="date"
                          value={editingAsn.pns_tgl_pertek_bkn || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pns_tgl_pertek_bkn: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Nomor SK Pangkat</label>
                        <input
                          type="text"
                          value={editingAsn.pns_no_sk || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pns_no_sk: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Tanggal SK Pangkat</label>
                        <input
                          type="date"
                          value={editingAsn.pns_tgl_sk || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pns_tgl_sk: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Nama Jabatan Penuh</label>
                        <input
                          type="text"
                          value={editingAsn.pns_nama_jabatan || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pns_nama_jabatan: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                          placeholder="e.g. Perawat Ahli Pertama"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Jenis Jabatan</label>
                        <select
                          value={editingAsn.pns_jenis_jabatan || 'Jabatan Fungsional'}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pns_jenis_jabatan: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        >
                          <option value="Jabatan Fungsional">Jabatan Fungsional</option>
                          <option value="Struktural">Struktural</option>
                          <option value="Umum">Umum</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Nomor SK Jabatan</label>
                        <input
                          type="text"
                          value={editingAsn.pns_no_sk_jabatan || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pns_no_sk_jabatan: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Tanggal SK Jabatan</label>
                        <input
                          type="date"
                          value={editingAsn.pns_tgl_sk_jabatan || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pns_tgl_sk_jabatan: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {(editingAsn.status_pegawai_detail === 'PPPK_Penuh_Waktu' || editingAsn.status_pegawai_detail === 'PPPK_Paruh_Waktu') && (
                  <div className="border-t border-slate-200 pt-5 space-y-4 animate-in fade-in duration-200">
                    <h5 className="font-bold text-emerald-800 text-[10.5px] uppercase tracking-wider border-b border-emerald-100 pb-1">II. Informasi PPPK</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Nomor Induk PPPK (NI PPPK)</label>
                        <input
                          type="text"
                          value={editingAsn.pppk_ni || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pppk_ni: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Nomor Perjanjian Kerja</label>
                        <input
                          type="text"
                          value={editingAsn.pppk_no_perjanjian || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pppk_no_perjanjian: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Tanggal Perjanjian Kerja</label>
                        <input
                          type="date"
                          value={editingAsn.pppk_tgl_perjanjian || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pppk_tgl_perjanjian: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Tanggal Mulai Perjanjian</label>
                        <input
                          type="date"
                          value={editingAsn.pppk_tmt_perjanjian_mulai || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pppk_tmt_perjanjian_mulai: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Tanggal Selesai Perjanjian</label>
                        <input
                          type="date"
                          value={editingAsn.pppk_tmt_perjanjian_selesai || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pppk_tmt_perjanjian_selesai: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">TMT Golongan PPPK</label>
                        <input
                          type="date"
                          value={editingAsn.pppk_tmt_golongan || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pppk_tmt_golongan: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Nomor SK PPPK</label>
                        <input
                          type="text"
                          value={editingAsn.pppk_no_sk || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pppk_no_sk: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Tanggal SK PPPK</label>
                        <input
                          type="date"
                          value={editingAsn.pppk_tgl_sk || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pppk_tgl_sk: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Jabatan Terdaftar</label>
                        <input
                          type="text"
                          value={editingAsn.pppk_jabatan || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pppk_jabatan: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {editingAsn.status_pegawai_detail === 'Non_ASN' && (
                  <div className="border-t border-slate-200 pt-5 space-y-4 animate-in fade-in duration-200">
                    <h5 className="font-bold text-amber-800 text-[10.5px] uppercase tracking-wider border-b border-amber-100 pb-1">II. Informasi PKWT &amp; Non-ASN</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Nomor NIK KTP</label>
                        <input
                          type="text"
                          value={editingAsn.nik || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, nik: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                          placeholder="NIK 16 Digit"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Nomor SK Kontrak / Tugas</label>
                        <input
                          type="text"
                          value={editingAsn.pkwt_no_sk_kontrak || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pkwt_no_sk_kontrak: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Tanggal SK Kontrak</label>
                        <input
                          type="date"
                          value={editingAsn.pkwt_tgl_sk_kontrak || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pkwt_tgl_sk_kontrak: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">TMT Mulai Kontrak</label>
                        <input
                          type="date"
                          value={editingAsn.pkwt_tmt_sk || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pkwt_tmt_sk: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Masa Kerja Penugasan</label>
                        <input
                          type="text"
                          value={editingAsn.pkwt_masa_kerja || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pkwt_masa_kerja: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                          placeholder="e.g. 02 tahun 00 bulan"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Sumber Pembiayaan Jasa</label>
                        <select
                          value={editingAsn.pkwt_pembiayaan || 'BLUD'}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pkwt_pembiayaan: e.target.value as 'APBD' | 'BLUD' | 'APBN' })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        >
                          <option value="APBD">APBD Lombok Barat</option>
                          <option value="BLUD">BLUD Unit Puskesmas</option>
                          <option value="APBN">APBN Pusat</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Jabatan Pelayanan</label>
                        <input
                          type="text"
                          value={editingAsn.pkwt_jabatan || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pkwt_jabatan: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* III. ARSIP MANDATORI STR & SIP KESEHATAN */}
                {editingAsn.jenis_pegawai === 'Jafung_Kesehatan' && (
                  <div className="border-t border-slate-200 pt-5">
                    <h5 className="font-bold text-slate-800 text-[10.5px] uppercase tracking-wider mb-2 border-b border-slate-200 pb-1 mb-4">III. Arsip Mandatori STR &amp; SIP Kesehatan</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* STR */}
                      <div className="p-4 bg-slate-50 border border-slate-200 shadow-sm rounded-xl space-y-3">
                        <h4 className="text-xs font-bold text-emerald-800 border-b border-slate-200 pb-1">Arsip STR (Surat Tanda Registrasi)</h4>
                        <div className="space-y-1">
                          <label className="text-slate-500 font-semibold mb-0.5 text-[10px]">Nomor STR</label>
                          <input
                            type="text"
                            value={editingAsn.no_str || ''}
                            onChange={(e) => setEditingAsn({ ...editingAsn, no_str: e.target.value })}
                            className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-slate-500 font-semibold mb-0.5 text-[10px]">Tgl Terbit STR</label>
                            <input
                              type="date"
                              value={editingAsn.tanggal_terbit_str || ''}
                              onChange={(e) => setEditingAsn({ ...editingAsn, tanggal_terbit_str: e.target.value })}
                              className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between items-center mb-0.5">
                              <label className="text-slate-500 font-semibold mb-0.5 text-[10px]">Tgl Akhir STR</label>
                              <label className="flex items-center space-x-1 cursor-pointer text-emerald-700 select-none">
                                <input
                                  type="checkbox"
                                  checked={editingAsn.is_str_seumur_hidup || false}
                                  onChange={(e) => {
                                    const isChecked = e.target.checked;
                                    setEditingAsn({
                                      ...editingAsn,
                                      is_str_seumur_hidup: isChecked,
                                      tanggal_akhir_str: isChecked ? 'Seumur Hidup' : ''
                                    });
                                  }}
                                  className="accent-emerald-600 rounded scale-90"
                                />
                                <span className="text-[9px] font-bold">Seumur Hidup</span>
                              </label>
                            </div>
                            <input
                              type="date"
                              disabled={editingAsn.is_str_seumur_hidup || false}
                              value={editingAsn.is_str_seumur_hidup ? '' : (editingAsn.tanggal_akhir_str || '')}
                              onChange={(e) => setEditingAsn({ ...editingAsn, tanggal_akhir_str: e.target.value })}
                              className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg disabled:opacity-40 text-xs focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* SIP */}
                      <div className="p-4 bg-slate-50 border border-slate-200 shadow-sm rounded-xl space-y-3">
                        <h4 className="text-xs font-bold text-teal-800 border-b border-slate-200 pb-1">Arsip SIP (Surat Izin Praktik)</h4>
                        <div className="space-y-1">
                          <label className="text-slate-500 font-semibold mb-0.5 text-[10px]">Nomor SIP</label>
                          <input
                            type="text"
                            value={editingAsn.no_sip || ''}
                            onChange={(e) => setEditingAsn({ ...editingAsn, no_sip: e.target.value })}
                            className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-slate-500 font-semibold mb-0.5 text-[10px]">Tgl Terbit SIP</label>
                            <input
                              type="date"
                              value={editingAsn.tanggal_terbit_sip || ''}
                              onChange={(e) => setEditingAsn({ ...editingAsn, tanggal_terbit_sip: e.target.value })}
                              className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-slate-500 font-semibold mb-0.5 text-[10px]">Tgl Akhir SIP</label>
                            <input
                              type="date"
                              value={editingAsn.tanggal_akhir_sip || ''}
                              onChange={(e) => setEditingAsn({ ...editingAsn, tanggal_akhir_sip: e.target.value })}
                              className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

              </div>

              <div className="flex justify-end items-center space-x-3 mt-6 pt-4 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingAsn(null)}
                  className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold shadow-md transition cursor-pointer font-bold"
                >
                  Simpan Profil Pegawai
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= MODAL: DETAIL PEGAWAI ======================= */}
      {selectedProfileForDetail && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-4xl w-full my-8 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            
            {/* Header ID Card Section */}
            <div className="relative bg-gradient-to-r from-emerald-50 via-teal-50/50 to-slate-50 p-6 md:p-8 border-b border-slate-200 text-slate-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center space-x-4">
                <div className="h-14 w-14 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 font-bold text-xl uppercase shadow-sm">
                  {selectedProfileForDetail.nama_lengkap.charAt(0)}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg md:text-xl font-bold font-display text-slate-900">
                      {selectedProfileForDetail.nama_lengkap}
                      {selectedProfileForDetail.gelar_belakang ? `, ${selectedProfileForDetail.gelar_belakang}` : ''}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                      selectedProfileForDetail.status_pegawai_detail === 'PNS' 
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                        : selectedProfileForDetail.status_pegawai_detail === 'PPPK_Penuh_Waktu'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : selectedProfileForDetail.status_pegawai_detail === 'PPPK_Paruh_Waktu'
                            ? 'bg-teal-50 text-teal-700 border border-teal-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {selectedProfileForDetail.status_pegawai_detail === 'PNS' 
                        ? 'PNS' 
                        : selectedProfileForDetail.status_pegawai_detail === 'PPPK_Penuh_Waktu' 
                          ? 'PPPK Penuh Waktu' 
                          : selectedProfileForDetail.status_pegawai_detail === 'PPPK_Paruh_Waktu' 
                            ? 'PPPK Paruh Waktu' 
                            : 'PKWT / Non-ASN'}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-600">
                    {selectedProfileForDetail.status_pegawai_detail.startsWith('PPPK') ? (
                      selectedProfileForDetail.pppk_ni ? `NI PPPK. ${selectedProfileForDetail.pppk_ni}` : 'NI PPPK Belum Diisi'
                    ) : selectedProfileForDetail.status_pegawai_detail === 'PNS' ? (
                      `NIP. ${selectedProfileForDetail.nip}`
                    ) : (
                      selectedProfileForDetail.nik ? `NIK. ${selectedProfileForDetail.nik}` : 'NIK Belum Diisi'
                    )}
                  </div>
                  <div className="mt-1">
                    <p className="text-xs text-emerald-800 font-semibold bg-emerald-50/70 border border-emerald-100/80 px-2.5 py-1 rounded-lg w-fit">
                      Unit Penempatan: {getPuskesmasName(selectedProfileForDetail.id_puskesmas)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Close Button Top Right */}
              <button 
                onClick={() => setSelectedProfileForDetail(null)}
                className="absolute top-4 right-4 md:static text-slate-400 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                title="Tutup detail"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable details container */}
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto max-h-[60vh] bg-white text-slate-800">
              
              {/* Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                
                {/* Section 1: Identitas Personal */}
                <div className="bg-slate-50 border border-slate-200 shadow-sm rounded-xl p-4 space-y-3.5">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1.5 flex items-center space-x-1.55">
                    <Users size={13} className="text-emerald-600" />
                    <span>Identitas Personal</span>
                  </h4>
                  <div className="space-y-2.5">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Tempat / Tanggal Lahir</span>
                      <span className="text-xs font-semibold text-slate-900">{selectedProfileForDetail.tanggal_lahir ? formatDate(selectedProfileForDetail.tanggal_lahir) : '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Jenis Kelamin</span>
                      <span className="text-xs font-semibold text-slate-900">{selectedProfileForDetail.jenis_kelamin === 'L' ? 'Laki-Laki' : 'Perempuan'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Status Kepegawaian</span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-lg w-fit flex items-center space-x-1 mt-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping mr-1"></span>
                        <span>{selectedProfileForDetail.status_kepegawaian.replace('_', ' ')}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Posisi & Rumpun Jabatan */}
                <div className="bg-slate-50 border border-slate-200 shadow-sm rounded-xl p-4 space-y-3.5">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1.5 flex items-center space-x-1.5">
                    <CheckCircle size={13} className="text-teal-600" />
                    <span>Jabatan & Penugasan</span>
                  </h4>
                  <div className="space-y-2.5">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Rumpun Pegawai</span>
                      <span className="text-xs font-semibold text-slate-900">{selectedProfileForDetail.jenis_pegawai.replace('_', ' ')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Jenjang Jafung / Peran</span>
                      <span className="text-xs font-semibold text-slate-900">{selectedProfileForDetail.jenjang_jafung || 'Struktural / Staf'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Golongan & Ruang (Pangkat)</span>
                      <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 border border-slate-250 px-2.5 py-0.5 rounded w-fit inline-block">{selectedProfileForDetail.golongan_ruang || '-'}</span>
                    </div>
                    {selectedProfileForDetail.jenis_pegawai === 'Jafung_Kesehatan' && (
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Angka Kredit Integrasi (2022)</span>
                        <span className="text-xs font-mono font-bold text-slate-900">{selectedProfileForDetail.ak_integrasi_2022 || 0} pt</span>
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Sisa Jatah Cuti Tahunan</span>
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-150 w-fit inline-block">{selectedProfileForDetail.sisa_cuti_tahunan || 0} Hari</span>
                    </div>
                  </div>
                </div>

                {/* Section 3: Legalitas STR & SIP */}
                <div className="bg-slate-50 border border-slate-200 shadow-sm rounded-xl p-4 space-y-3.5 col-span-1 md:col-span-2 lg:col-span-1">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1.5 flex items-center space-x-1.5">
                    <FolderCheck size={13} className="text-blue-600" />
                    <span>Legalitas Tenaga Kesehatan</span>
                  </h4>
                  <div className="space-y-3.5">
                    
                    {/* STR */}
                    <div className="border-l-2 border-emerald-500/55 pl-2.5 space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Surat Tanda Registrasi (STR)</span>
                      {selectedProfileForDetail.no_str ? (
                        <>
                          <span className="text-xs font-mono font-extrabold text-slate-950 block bg-white border border-slate-200 px-2 py-1 rounded">No: {selectedProfileForDetail.no_str}</span>
                          <span className="text-[10.5px] text-slate-600 block">
                            Masa Berlaku: {selectedProfileForDetail.is_str_seumur_hidup || selectedProfileForDetail.tanggal_akhir_str === 'Seumur Hidup' ? (
                              <strong className="text-sky-700 font-sans font-bold">♾️ Seumur Hidup</strong>
                            ) : (
                              <span className="text-slate-600 font-medium">s.d. {formatDate(selectedProfileForDetail.tanggal_akhir_str || '')}</span>
                            )}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-rose-700 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded font-bold block w-fit">⚠️ Belum memiliki STR</span>
                      )}
                    </div>

                    {/* SIP */}
                    <div className="border-l-2 border-teal-500/55 pl-2.5 space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Surat Izin Praktik (SIP)</span>
                      {selectedProfileForDetail.no_sip ? (
                        <>
                          <span className="text-xs font-mono font-extrabold text-slate-950 block bg-white border border-slate-200 px-2 py-1 rounded">No: {selectedProfileForDetail.no_sip}</span>
                          <span className="text-[10.5px] text-slate-600 block">
                            Masa Berlaku: s.d. <span className="font-medium text-slate-700">{formatDate(selectedProfileForDetail.tanggal_akhir_sip || '')}</span>
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-rose-700 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded font-bold block w-fit">⚠️ Belum memiliki SIP</span>
                      )}
                    </div>

                  </div>
                </div>

              </div>

              {/* Contextual Card: PNS, PPPK, or PKWT Specific Details */}
              <div className="w-full">
                {selectedProfileForDetail.status_pegawai_detail === 'PNS' && (
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 md:p-6 space-y-4">
                    <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider flex items-center space-x-2 border-b border-indigo-100 pb-2">
                      <Shield size={14} className="text-indigo-600" />
                      <span>Berkas Administrasi PNS (Pegawai Negeri Sipil)</span>
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-xs font-medium">
                      <div>
                        <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide block pb-0.5">Nama Pangkat</span>
                        <span className="text-slate-900 font-bold text-xs">{selectedProfileForDetail.pangkat_nama || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide block pb-0.5">TMT Pangkat Terakhir</span>
                        <span className="text-slate-900 font-mono text-xs">{selectedProfileForDetail.pns_tmt_golongan ? formatDate(selectedProfileForDetail.pns_tmt_golongan) : formatDate(selectedProfileForDetail.tmt_pangkat_terakhir)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide block pb-0.5">Masa Kerja Golongan (MKG)</span>
                        <span className="text-slate-900 text-xs">{selectedProfileForDetail.pns_masa_kerja_golongan || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide block pb-0.5">Jenis Kenaikan Pangkat Terakhir</span>
                        <span className="text-slate-900 text-xs">{selectedProfileForDetail.pns_jenis_kenaikan_pangkat || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide block pb-0.5">Nomor Pertek BKN</span>
                        <span className="text-slate-900 font-mono text-xs">{selectedProfileForDetail.pns_no_pertek_bkn || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide block pb-0.5">Tanggal Pertek BKN</span>
                        <span className="text-slate-900 text-xs">{selectedProfileForDetail.pns_tgl_pertek_bkn ? formatDate(selectedProfileForDetail.pns_tgl_pertek_bkn) : '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide block pb-0.5">Nomor SK Pangkat (Terakhir)</span>
                        <span className="text-slate-900 font-mono text-xs">{selectedProfileForDetail.pns_no_sk || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide block pb-0.5">Tanggal SK Pangkat</span>
                        <span className="text-slate-900 text-xs">{selectedProfileForDetail.pns_tgl_sk ? formatDate(selectedProfileForDetail.pns_tgl_sk) : '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide block pb-0.5">Nama Jabatan</span>
                        <span className="text-slate-900 font-bold text-xs">{selectedProfileForDetail.pns_nama_jabatan || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide block pb-0.5">Jenis Jabatan</span>
                        <span className="text-slate-900 text-xs">{selectedProfileForDetail.pns_jenis_jabatan || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide block pb-0.5">Nomor SK Jabatan</span>
                        <span className="text-slate-900 font-mono text-xs">{selectedProfileForDetail.pns_no_sk_jabatan || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide block pb-0.5">Tanggal SK Jabatan</span>
                        <span className="text-slate-900 text-xs">{selectedProfileForDetail.pns_tgl_sk_jabatan ? formatDate(selectedProfileForDetail.pns_tgl_sk_jabatan) : '-'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedProfileForDetail.status_pegawai_detail.startsWith('PPPK') && (
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 md:p-6 space-y-4 font-sans">
                    <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center space-x-2 border-b border-emerald-100 pb-2">
                      <Shield size={14} className="text-emerald-600" />
                      <span>Berkas Perjanjian Kerja PPPK ({selectedProfileForDetail.status_pegawai_detail === 'PPPK_Penuh_Waktu' ? 'Penuh Waktu' : 'Paruh Waktu'})</span>
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-xs font-medium">
                      <div>
                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide block pb-0.5">Nomor Induk PPPK (NI PPPK)</span>
                        <span className="text-slate-900 font-mono font-bold text-xs">{selectedProfileForDetail.pppk_ni || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide block pb-0.5">Nomor Perjanjian Kontrak</span>
                        <span className="text-slate-900 font-mono text-xs">{selectedProfileForDetail.pppk_no_perjanjian || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide block pb-0.5">Tanggal Perjanjian</span>
                        <span className="text-slate-900 text-xs">{selectedProfileForDetail.pppk_tgl_perjanjian ? formatDate(selectedProfileForDetail.pppk_tgl_perjanjian) : '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide block pb-0.5">Masa Kontrak Berlaku</span>
                        <span className="text-emerald-700 font-bold text-xs">
                          {selectedProfileForDetail.pppk_tmt_perjanjian_mulai ? formatDate(selectedProfileForDetail.pppk_tmt_perjanjian_mulai) : '-'} s.d. {selectedProfileForDetail.pppk_tmt_perjanjian_selesai ? formatDate(selectedProfileForDetail.pppk_tmt_perjanjian_selesai) : '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide block pb-0.5">TMT Golongan Terakhir</span>
                        <span className="text-slate-900 font-mono text-xs">{selectedProfileForDetail.pppk_tmt_golongan ? formatDate(selectedProfileForDetail.pppk_tmt_golongan) : '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide block pb-0.5">Nomor SK Pengangkatan PPPK</span>
                        <span className="text-slate-900 font-mono text-xs">{selectedProfileForDetail.pppk_no_sk || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide block pb-0.5">Tanggal SK Pengangkatan</span>
                        <span className="text-slate-900 text-xs">{selectedProfileForDetail.pppk_tgl_sk ? formatDate(selectedProfileForDetail.pppk_tgl_sk) : '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide block pb-0.5">Jabatan Ditugaskan</span>
                        <span className="text-slate-900 font-bold text-xs">{selectedProfileForDetail.pppk_jabatan || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide block pb-0.5">Golongan</span>
                        <span className="text-emerald-800 font-mono font-bold bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded w-fit block mt-1 text-xs">{selectedProfileForDetail.pppk_golongan || '-'}</span>
                      </div>
                      {selectedProfileForDetail.status_pegawai_detail === 'PPPK_Paruh_Waktu' && (
                        <>
                          <div>
                            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide block pb-0.5">Target Jam Kerja/Minggu</span>
                            <span className="text-slate-900 font-bold text-xs">{selectedProfileForDetail.pppw_jumlah_jam_kerja_per_minggu || '-'} Jam</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide block pb-0.5">Surat Kesepakatan Jadwal</span>
                            <span className="text-emerald-700 font-bold italic text-xs">{selectedProfileForDetail.pppw_surat_kesepakatan_file ? '✓ Terunggah' : 'Belum Terunggah'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {selectedProfileForDetail.status_pegawai_detail === 'Non_ASN' && (
                  <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5 md:p-6 space-y-4">
                    <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center space-x-2 border-b border-amber-100 pb-2">
                      <Shield size={14} className="text-amber-600" />
                      <span>Administrasi Pegawai Kontrak Daerah / PKWT (Non-ASN)</span>
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-xs font-medium">
                      <div>
                        <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wide block pb-0.5">Nomor Induk Kependudukan (NIK)</span>
                        <span className="text-slate-900 font-mono font-bold text-xs">{selectedProfileForDetail.nik || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wide block pb-0.5">Nomor SK Kontrak / Tugas</span>
                        <span className="text-slate-900 font-mono text-xs">{selectedProfileForDetail.pkwt_no_sk_kontrak || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wide block pb-0.5">Tanggal SK Kontrak</span>
                        <span className="text-slate-900 text-xs">{selectedProfileForDetail.pkwt_tgl_sk_kontrak ? formatDate(selectedProfileForDetail.pkwt_tgl_sk_kontrak) : '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wide block pb-0.5">TMT Mulai Kontrak</span>
                        <span className="text-slate-900 font-mono text-xs">{selectedProfileForDetail.pkwt_tmt_sk ? formatDate(selectedProfileForDetail.pkwt_tmt_sk) : '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wide block pb-0.5">Masa Kerja PKWT</span>
                        <span className="text-slate-900 text-xs">{selectedProfileForDetail.pkwt_masa_kerja || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wide block pb-0.5">Sumber Anggaran Gaji</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold w-fit block mt-1 uppercase ${
                          selectedProfileForDetail.pkwt_pembiayaan === 'APBD'
                            ? 'bg-red-50 text-red-700 border border-red-100'
                            : selectedProfileForDetail.pkwt_pembiayaan === 'BLUD'
                              ? 'bg-blue-50 text-blue-700 border border-blue-100'
                              : 'bg-green-50 text-green-700 border border-green-100'
                        }`}>
                          {selectedProfileForDetail.pkwt_pembiayaan || 'Lainnya'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wide block pb-0.5">Deskripsi Jabatan Tugas</span>
                        <span className="text-slate-900 font-bold text-xs">{selectedProfileForDetail.pkwt_jabatan || '-'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Footer Actions */}
            <div className="bg-slate-100 px-6 py-5 border-t border-slate-200 flex flex-col sm:flex-row justify-end items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedProfileForDetail(null)}
                className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Tutup Detail
              </button>
              
              {/* Authorized Edit Button */}
              {(currentRole === 'admin_dinkes' || selectedProfileForDetail.id_puskesmas === selectedPuskesmasId) && (
                <button
                  type="button"
                  onClick={() => {
                    const profileToEdit = { ...selectedProfileForDetail };
                    setSelectedProfileForDetail(null);
                    setEditingAsn(profileToEdit);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-teal-700 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center space-x-1.5 font-bold"
                >
                  <Sliders size={13} />
                  <span>Ubah Data Pegawai</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ======================= MODAL: CONFIRM DELETE EMPLOYEE ======================= */}
      {asnToDelete && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-50 text-yellow-600 mb-4 border border-yellow-200 animate-pulse">
              <AlertTriangle size={24} />
            </div>
            <h4 className="font-bold text-slate-900 font-display text-base uppercase tracking-wide">Konfirmasi Hapus Pegawai</h4>
            
            <div className="bg-yellow-50/70 border border-yellow-200 rounded-xl p-4 my-3 text-left">
              <p className="text-xs text-slate-800 font-sans leading-relaxed">
                Apakah Anda yakin ingin menghapus nama pegawai <strong className="text-yellow-600 font-bold font-sans">"{asnToDelete.name}"</strong> secara permanen dari database Kabupaten Lombok Barat?
              </p>
              <p className="text-[10px] text-yellow-850 bg-yellow-100 border border-yellow-300/60 p-2 rounded-lg mt-2 font-semibold leading-normal font-sans">
                Tindakan ini tidak dapat dibatalkan. Seluruh records riwayat, berkas, dan profil pegawai akan dihapus permanen.
              </p>
            </div>

            <div className="mt-6 flex space-x-3 justify-center">
              <button
                type="button"
                onClick={() => setAsnToDelete(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = asnToDelete.id;
                  const name = asnToDelete.name;
                  const updated = dbState.asnProfiles.filter(p => p.id !== id);
                  updateProfiles(updated);
                  setAsnToDelete(null);
                  setSuccessToast(`✓ Pegawai "${name}" berhasil dihapus.`);
                }}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-900 rounded-lg text-xs font-bold transition cursor-pointer shadow-md"
              >
                Hapus Permanen
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

      {/* Footer copyright */}
      <footer className="bg-[#0f0f12] text-slate-500 py-6 text-center text-xs mt-12 border-t border-white/5 block">
        <p>© 2026 Pemerintah Kabupaten Lombok Barat • Dinas Kesehatan PPKB</p>
        <p className="text-[10px] text-slate-600 mt-1">Sistem Informasi Manajemen Kepegawaian (SIMPEG) v1.0.0 • Decision Support System & Digital Management Platform</p>
      </footer>

    </div>
  );
}
