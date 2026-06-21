/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Puskesmas, 
  ASNProfile, 
  MasterFitur, 
  MasterDokumen, 
  UsulanLayanan, 
  MasterProfesiSDMK, 
  LaporanSDMKBulanan,
  RiwayatAngkaKredit,
  User,
  ArsipKepegawaian,
  InAppNotification
} from './types';

// 1. Lister Puskesmas (including Dinas Kesehatan as safe ID 100)
export const MASTER_PUSKESMAS: Puskesmas[] = [
  { id: 100, kode_puskesmas: "D520100", nama_puskesmas: "Dinas Kesehatan PPKB", alamat: "Jl. Giri Menang Raya No. 1, Gerung, Lombok Barat", total_penduduk: 461000 },
  { id: 1, kode_puskesmas: "P520101", nama_puskesmas: "Puskesmas Gerung", alamat: "Jl. Ki Hajar Dewantara No. 12, Gerung, Lombok Barat", total_penduduk: 92000 },
  { id: 2, kode_puskesmas: "P520102", nama_puskesmas: "Puskesmas Narmada", alamat: "Jl. Raya Narmada No. 45, Narmada, Lombok Barat", total_penduduk: 110000 },
  { id: 3, kode_puskesmas: "P520103", nama_puskesmas: "Puskesmas Kediri", alamat: "Jl. TGH Abdul Karim, Kediri, Lombok Barat", total_penduduk: 85000 },
  { id: 4, kode_puskesmas: "P520104", nama_puskesmas: "Puskesmas Gunungsari", alamat: "Jl. Raya Gunungsari No. 8, Gunungsari, Lombok Barat", total_penduduk: 98000 },
  { id: 5, kode_puskesmas: "P520105", nama_puskesmas: "Puskesmas Lingsar", alamat: "Jl. Raya Lingsar, Lingsar, Lombok Barat", total_penduduk: 76000 }
];

// 2. Master Fitur (Layanan Core 1-9 & SDMK 11. Renbut 10 removed!)
export const MASTER_FITUR: MasterFitur[] = [
  { id: 1, nama_fitur: "Kenaikan Pangkat", slug: "kenaikan-pangkat", warning_threshold_bulan: 4, is_active: true },
  { id: 2, nama_fitur: "Pensiun", slug: "pensiun", warning_threshold_bulan: 6, is_active: true },
  { id: 3, nama_fitur: "Usul Gaji Berkala", slug: "gaji-berkala", warning_threshold_bulan: 2, is_active: true },
  { id: 4, nama_fitur: "Cuti Kepegawaian", slug: "cuti", warning_threshold_bulan: 0, is_active: true },
  { id: 5, nama_fitur: "Izin Belajar", slug: "izin-belajar", warning_threshold_bulan: 0, is_active: true },
  { id: 6, nama_fitur: "Mutasi Internal", slug: "mutasi", warning_threshold_bulan: 0, is_active: true },
  { id: 7, nama_fitur: "Pencantuman Gelar", slug: "pencantuman-gelar", warning_threshold_bulan: 0, is_active: true },
  { id: 8, nama_fitur: "Uji Kompetensi", slug: "uji-kompetensi", warning_threshold_bulan: 0, is_active: true },
  { id: 9, nama_fitur: "Usulan Jafung & Angka Kredit", slug: "usulan-jafung", warning_threshold_bulan: 0, is_active: true },
  { id: 11, nama_fitur: "Laporan SDMK", slug: "keadaan-sdmk", warning_threshold_bulan: 0, is_active: true }
];

// 3. Master Dokumen
export const MASTER_DOKUMEN: MasterDokumen[] = [
  { id: 1, nama_dokumen: "Surat Pengantar Kepsek Puskesmas", kata_kunci_ocr: "SURAT PENGANTAR, KEPALA PUSKESMAS, DINKES" },
  { id: 2, nama_dokumen: "SK Pangkat Terakhir", kata_kunci_ocr: "KEPUTUSAN BUPATI, KENAIKAN PANGKAT, GOLONGAN" },
  { id: 3, nama_dokumen: "PAK (Penetapan Angka Kredit)", kata_kunci_ocr: "ANGKA KREDIT, KOMULATIF, JAFUNG, JABATAN" },
  { id: 4, nama_dokumen: "Penilaian Prestasi Kerja (SKP) 2 Tahun", kata_kunci_ocr: "SASARAN KINERJA PEGAWAI, PRESTASI KERJA, BAIK" },
  { id: 5, nama_dokumen: "Surat Permohonan Pensiun", kata_kunci_ocr: "PERMOHONAN PENSIUN, APS, BUP, KELUARGA" },
  { id: 6, nama_dokumen: "Data Riwayat Hidup / Buku Nikah", kata_kunci_ocr: "DAFTAR RIWAYAT HIDUP, NIKAH, KELUARGA, ANAK" },
  { id: 7, nama_dokumen: "SK Kenaikan Gaji Berkala Terakhir", kata_kunci_ocr: "GAJI BERKALA, GAJI POKOK, TMT BERKALA" },
  { id: 8, nama_dokumen: "Surat Permohonan Cuti", kata_kunci_ocr: "PERMOHONAN CUTI, TAHUNAN, SAKIT, ALASAN PENTING" },
  { id: 9, nama_dokumen: "Rekomendasi Mutasi", kata_kunci_ocr: "REKOMENDASI MUTASI, PERSETUJUAN KEPALA, PINDAH" },
  { id: 10, nama_dokumen: "Ijazah Baru / Transkrip Nilai", kata_kunci_ocr: "IJAZAH, GELAR AKADEMIK, SARJANA, DIPLOMA" },
  { id: 11, nama_dokumen: "Sertifikat Kelulusan Uji Kompetensi", kata_kunci_ocr: "SERTIFIKAT KELULUSAN, UJI KOMPETENSI, UKOM, JAFUNG" }
];

// 4. Hubungan Syarat Dokumen per Fitur (Slug) - Initial Seed
export const INITIAL_SYARAT_FITUR_MAP: Record<string, number[]> = {
  "kenaikan-pangkat": [1, 2, 3, 4],
  "pensiun": [1, 5, 6],
  "gaji-berkala": [1, 7],
  "cuti": [1, 8],
  "izin-belajar": [1, 10],
  "mutasi": [1, 9],
  "pencantuman-gelar": [1, 10],
  "uji-kompetensi": [1, 11],
  "usulan-jafung": [1, 3, 4, 11]
};

// 5. Seeds ASN/Non-ASN Profiles (Classified as PNS, PPPK Penuh Waktu, PPPK Paruh Waktu, and PKWT/Non_ASN)
export const SEED_ASN_PROFILES: ASNProfile[] = [
  {
    id: 1,
    nip: "198004122005011003",
    nama_lengkap: "dr. Wahyu Darizki",
    gelar_belakang: "M.Kes",
    id_puskesmas: 1, // Gerung
    tanggal_lahir: "1980-04-12",
    golongan_ruang: "IV/a",
    tmt_pangkat_terakhir: "2022-10-01",
    tmt_berkala_terakhir: "2024-07-15",
    tmt_jabatan_terakhir: "2021-02-10",
    jenis_pegawai: "Jafung_Kesehatan",
    jenjang_jafung: "Ahli Madya",
    ak_integrasi_2022: 120.500,
    sisa_cuti_tahunan: 10,
    status_kepegawaian: "Aktif",
    jenis_kelamin: "L",
    status_pegawai_detail: "PNS"
  },
  {
    id: 2,
    nip: "196811251991032001",
    nama_lengkap: "Hj. Baiq Sumiati",
    gelar_belakang: "S.Tr.Keb",
    id_puskesmas: 1, // Gerung
    tanggal_lahir: "1968-11-25",
    golongan_ruang: "III/d",
    tmt_pangkat_terakhir: "2023-04-01",
    tmt_berkala_terakhir: "2025-02-10",
    tmt_jabatan_terakhir: "2018-05-15",
    jenis_pegawai: "Jafung_Kesehatan",
    jenjang_jafung: "Ahli Muda",
    ak_integrasi_2022: 74.250,
    sisa_cuti_tahunan: 12,
    status_kepegawaian: "Aktif",
    jenis_kelamin: "P",
    status_pegawai_detail: "PNS"
  },
  {
    id: 3,
    nip: "199401032021022014",
    nama_lengkap: "Nia Ramadhani",
    gelar_belakang: "A.Md.Kep",
    id_puskesmas: 2, // Narmada
    tanggal_lahir: "1994-01-03",
    golongan_ruang: "II/c",
    tmt_pangkat_terakhir: "2023-10-01",
    tmt_berkala_terakhir: "2024-08-11",
    tmt_jabatan_terakhir: "2021-03-01",
    jenis_pegawai: "Jafung_Kesehatan",
    jenjang_jafung: "Terampil",
    ak_integrasi_2022: 15.000,
    sisa_cuti_tahunan: 8,
    status_kepegawaian: "Aktif",
    jenis_kelamin: "P",
    status_pegawai_detail: "PPPK_Penuh_Waktu"
  },
  {
    id: 4,
    nip: "199105152019041002",
    nama_lengkap: "Ahmad Zulkarnaen",
    gelar_belakang: "S.Farm",
    id_puskesmas: 3, // Kediri
    tanggal_lahir: "1991-05-15",
    golongan_ruang: "III/b",
    tmt_pangkat_terakhir: "2022-10-01",
    tmt_berkala_terakhir: "2024-09-01",
    tmt_jabatan_terakhir: "2022-04-12",
    jenis_pegawai: "Jafung_Kesehatan",
    jenjang_jafung: "Ahli Pertama",
    ak_integrasi_2022: 30.500,
    sisa_cuti_tahunan: 5,
    status_kepegawaian: "Aktif",
    jenis_kelamin: "L",
    status_pegawai_detail: "PNS"
  },
  {
    id: 5,
    nip: "198812012015031005",
    nama_lengkap: "Donny Setiawan",
    gelar_belakang: "A.Md.KG",
    id_puskesmas: 4, // Gunungsari
    tanggal_lahir: "1988-12-01",
    golongan_ruang: "II/d",
    tmt_pangkat_terakhir: "2023-04-01",
    tmt_berkala_terakhir: "2025-05-01",
    tmt_jabatan_terakhir: "2015-06-01",
    jenis_pegawai: "Jafung_Kesehatan",
    jenjang_jafung: "Terampil",
    ak_integrasi_2022: 24.100,
    sisa_cuti_tahunan: 12,
    status_kepegawaian: "Aktif",
    jenis_kelamin: "L",
    status_pegawai_detail: "PPPK_Paruh_Waktu"
  },
  {
    id: 6,
    nip: "199507022022032005",
    nama_lengkap: "drg. Fitria Handayani",
    gelar_belakang: null,
    id_puskesmas: 5, // Lingsar
    tanggal_lahir: "1995-07-02",
    golongan_ruang: "III/b",
    tmt_pangkat_terakhir: "2022-10-01",
    tmt_berkala_terakhir: "2024-08-01",
    tmt_jabatan_terakhir: "2022-05-15",
    jenis_pegawai: "Jafung_Kesehatan",
    jenjang_jafung: "Ahli Pertama",
    ak_integrasi_2022: 45.000,
    sisa_cuti_tahunan: 9,
    status_kepegawaian: "Aktif",
    jenis_kelamin: "P",
    status_pegawai_detail: "PNS"
  },
  {
    id: 7,
    nip: "197208151996121001",
    nama_lengkap: "Bambang Triyawan",
    gelar_belakang: "SH",
    id_puskesmas: 2, // Narmada
    tanggal_lahir: "1972-08-15",
    golongan_ruang: "III/d",
    tmt_pangkat_terakhir: "2021-10-01",
    tmt_berkala_terakhir: "2023-11-15",
    tmt_jabatan_terakhir: "2015-02-11",
    jenis_pegawai: "Struktural",
    jenjang_jafung: null,
    ak_integrasi_2022: 0,
    sisa_cuti_tahunan: 12,
    status_kepegawaian: "Aktif",
    jenis_kelamin: "L",
    status_pegawai_detail: "PNS"
  },
  {
    id: 8,
    nip: "199209182019052003",
    nama_lengkap: "Sri Handayani",
    gelar_belakang: "S.Tr.A.K",
    id_puskesmas: 3, // Kediri
    tanggal_lahir: "1992-09-18",
    golongan_ruang: "III/a",
    tmt_pangkat_terakhir: "2024-04-01",
    tmt_berkala_terakhir: "2024-05-15",
    tmt_jabatan_terakhir: "2019-06-01",
    jenis_pegawai: "Jafung_Kesehatan",
    jenjang_jafung: "Ahli Pertama",
    ak_integrasi_2022: 20.000,
    sisa_cuti_tahunan: 11,
    status_kepegawaian: "Aktif",
    jenis_kelamin: "P",
    status_pegawai_detail: "Non_ASN" // PKWT / Non-ASN
  },
  {
    id: 9,
    nip: "198305212009121002",
    nama_lengkap: "Agus Setyawan",
    gelar_belakang: "S.Kom",
    id_puskesmas: 100, // Dinas Kesehatan PPKB Pusat
    tanggal_lahir: "1983-05-21",
    golongan_ruang: "III/c",
    tmt_pangkat_terakhir: "2023-10-01",
    tmt_berkala_terakhir: "2024-12-15",
    tmt_jabatan_terakhir: "2021-04-10",
    jenis_pegawai: "Staf_Umum",
    jenjang_jafung: null,
    ak_integrasi_2022: 0,
    sisa_cuti_tahunan: 12,
    status_kepegawaian: "Aktif",
    jenis_kelamin: "L",
    status_pegawai_detail: "PNS"
  },
  {
    id: 10,
    nip: "199803152025022011",
    nama_lengkap: "Rina Kartika",
    gelar_belakang: "A.Md.Keb",
    id_puskesmas: 100, // Dinas Kesehatan PPKB Pusat
    tanggal_lahir: "1998-03-15",
    golongan_ruang: "II/c",
    tmt_pangkat_terakhir: "2025-02-01",
    tmt_berkala_terakhir: "2025-02-01",
    tmt_jabatan_terakhir: "2025-02-01",
    jenis_pegawai: "Jafung_Kesehatan",
    jenjang_jafung: "Terampil",
    ak_integrasi_2022: 12.000,
    sisa_cuti_tahunan: 12,
    status_kepegawaian: "Aktif",
    jenis_kelamin: "P",
    status_pegawai_detail: "PPPK_Paruh_Waktu"
  }
];

// 6. Master Profesi Rumpun SDMK
export const MASTER_PROFESI_SDMK: MasterProfesiSDMK[] = [
  { id: 1, nama_profesi: "Perawat" },
  { id: 2, nama_profesi: "Dokter" },
  { id: 3, nama_profesi: "Dokter Gigi" },
  { id: 4, nama_profesi: "Bidan" },
  { id: 5, nama_profesi: "Apoteker" },
  { id: 6, nama_profesi: "Tenaga Teknik Kefarmasian" },
  { id: 7, nama_profesi: "Promkes & Ilmu Perilaku" },
  { id: 8, nama_profesi: "Sanitarian" },
  { id: 9, nama_profesi: "Nutrisionis" },
  { id: 10, nama_profesi: "Ahli Teknologi Lab Medik" },
  { id: 11, nama_profesi: "Rekam Medis" },
  { id: 12, nama_profesi: "Terapis Gigi & Mulut" },
  { id: 13, nama_profesi: "Umum & Kepeg" },
  { id: 14, nama_profesi: "Tenaga Adm. Keuangan" },
  { id: 15, nama_profesi: "Tenaga Sistem Informasi Kes." }
];

// 7. Seed Riwayat SKP / Angka Kredit
export const SEED_RIWAYAT_AK: RiwayatAngkaKredit[] = [
  { id: 1, id_asn: 1, tahun_skp: 2023, predikat_skp: "Sangat Baik", ak_diperoleh: 56.250 },
  { id: 2, id_asn: 1, tahun_skp: 2024, predikat_skp: "Baik", ak_diperoleh: 37.500 },
  { id: 3, id_asn: 1, tahun_skp: 2025, predikat_skp: "Baik", ak_diperoleh: 37.500 },
  { id: 4, id_asn: 4, tahun_skp: 2023, predikat_skp: "Baik", ak_diperoleh: 12.500 },
  { id: 5, id_asn: 4, tahun_skp: 2024, predikat_skp: "Sangat Baik", ak_diperoleh: 18.750 },
  { id: 6, id_asn: 4, tahun_skp: 2025, predikat_skp: "Butuh Perbaikan", ak_diperoleh: 9.375 }
];

// 8. Initial Usulan Layanan
export const SEED_USULAN_LAYANAN: UsulanLayanan[] = [
  {
    id: 1,
    id_fitur: 1, // Kenaikan Pangkat
    id_asn: 4,
    id_puskesmas_pengusul: 3,
    tanggal_pengusulan: "2026-06-01T08:30:00Z",
    status: "Usulan Dikirim ke BKD",
    catatan_perbaikan: null,
    file_sk_final: null
  },
  {
    id: 2,
    id_fitur: 3, // Usul Gaji Berkala
    id_asn: 1,
    id_puskesmas_pengusul: 1,
    tanggal_pengusulan: "2026-06-02T10:15:00Z",
    status: "Perbaikan Berkas",
    catatan_perbaikan: "File SK Berkala terakhir kabur / tidak terbaca dengan jelas, harap di-scan ulang dalam posisi lurus.",
    file_sk_final: null
  }
];

// 9. Seeding monthly SDMK reports for Lombok Barat (Juni 2026)
export const SEED_LAPORAN_SDMK: LaporanSDMKBulanan[] = [
  { id: 1, id_puskesmas: 1, periode_bulan: 6, periode_tahun: 2026, id_profesi: 1, pns_l: 3, pns_p: 7, p3k_pn_l: 2, p3k_pn_p: 4, p3k_pw_l: 0, p3k_pw_p: 1, non_asn_l: 5, non_asn_p: 10 },
  { id: 2, id_puskesmas: 1, periode_bulan: 6, periode_tahun: 2026, id_profesi: 2, pns_l: 1, pns_p: 0, p3k_pn_l: 0, p3k_pn_p: 0, p3k_pw_l: 0, p3k_pw_p: 0, non_asn_l: 0, non_asn_p: 1 },
  { id: 3, id_puskesmas: 1, periode_bulan: 6, periode_tahun: 2026, id_profesi: 4, pns_l: 0, pns_p: 1, p3k_pn_l: 0, p3k_pn_p: 2, p3k_pw_l: 0, p3k_pw_p: 0, non_asn_l: 0, non_asn_p: 4 },
  { id: 4, id_puskesmas: 2, periode_bulan: 6, periode_tahun: 2026, id_profesi: 1, pns_l: 0, pns_p: 0, p3k_pn_l: 0, p3k_pn_p: 1, p3k_pw_l: 0, p3k_pw_p: 0, non_asn_l: 1, non_asn_p: 2 },
  { id: 5, id_puskesmas: 2, periode_bulan: 6, periode_tahun: 2026, id_profesi: 13, pns_l: 1, pns_p: 0, p3k_pn_l: 0, p3k_pn_p: 0, p3k_pw_l: 0, p3k_pw_p: 0, non_asn_l: 0, non_asn_p: 0 }
];

// 10. Seed users (for simulated login/admin lists)
export const SEED_USERS: User[] = [
  { id: 1, nip: "198004122005011003", nama_lengkap: "dr. Wahyu Darizki (Kadin)", role: "admin_dinkes", id_puskesmas: null },
  { id: 2, nip: "196811251991032001", nama_lengkap: "Hj. Baiq Sumiati", role: "admin_puskesmas", id_puskesmas: 1 },
  { id: 3, nip: "199401032021022014", nama_lengkap: "Nia Ramadhani", role: "admin_puskesmas", id_puskesmas: 2 },
  { id: 4, nip: "199105152019041002", nama_lengkap: "Ahmad Zulkarnaen", role: "admin_puskesmas", id_puskesmas: 3 }
];

// Seed data for the Digital Archive library (Arsip Kepegawaian)
export const SEED_ARSIP_KEPEGAWAIAN: ArsipKepegawaian[] = [
  // User ID 1 (dr. Wahyu Darizki - PNS)
  {
    id: 1,
    id_asn: 1,
    nama_berkas: "SK CPNS (Calon Pegawai Negeri Sipil)",
    kategori_kelompok: "Dasar",
    file_name: "SK_CPNS_Wahyu_Darizki.pdf",
    file_path: "VALID-DINKES-CPNS-BLOB",
    uploaded_at: "2023-01-10T09:00:00Z",
    source: "Upload Kerja"
  },
  {
    id: 2,
    id_asn: 1,
    nama_berkas: "SK PNS (Pegawai Negeri Sipil)",
    kategori_kelompok: "Dasar",
    file_name: "SK_PNS_Wahyu_Darizki.pdf",
    file_path: "VALID-DINKES-PNS-BLOB",
    uploaded_at: "2023-05-15T11:30:00Z",
    source: "Upload Kerja"
  },
  {
    id: 3,
    id_asn: 1,
    nama_berkas: "STR (Surat Tanda Registrasi) - Dokter Spesialis",
    kategori_kelompok: "Pendidikan",
    file_name: "STR_Dokter_Wahyu.pdf",
    file_path: "VALID-STR-BLOB",
    uploaded_at: "2024-06-11T14:45:00Z",
    source: "Upload Kerja",
    str_expired_date: "2026-07-25" // VERY SOON warning! (current date is June 2026)
  },
  {
    id: 4,
    id_asn: 1,
    nama_berkas: "SIP (Surat Izin Praktik) - UPT Puskesmas Gerung",
    kategori_kelompok: "Pendidikan",
    file_name: "SIP_Aktif_Wahyu.pdf",
    file_path: "VALID-SIP-BLOB",
    uploaded_at: "2024-07-01T10:00:00Z",
    source: "Upload Kerja"
  },
  {
    id: 5,
    id_asn: 1,
    nama_berkas: "KTP & Kartu Keluarga (KK) Terbaru",
    kategori_kelompok: "Personal",
    file_name: "KTP_KK_Wahyu_Darizki.pdf",
    file_path: "VALID-KTP-BLOB",
    uploaded_at: "2023-01-10T09:00:00Z",
    source: "Upload Kerja"
  },
  {
    id: 6,
    id_asn: 1,
    nama_berkas: "Buku Riwayat Golongan (SK Kenaikan Pangkat Akhir)",
    kategori_kelompok: "Mutasi",
    file_name: "SK_PANGKAT_TERAKHIR_WAHYU.pdf",
    file_path: "VALID-PANGKAT-BLOB",
    uploaded_at: "2022-10-01T08:00:00Z",
    source: "Auto-Copy Usulan"
  },

  // User ID 3 (Nia Ramadhani - PPPK Penuh Waktu)
  {
    id: 7,
    id_asn: 3,
    nama_berkas: "SK Pengangkatan PPPK (Awal s.d. Terakhir)",
    kategori_kelompok: "PPPK_Khusus",
    file_name: "SK_PPPK_Nia_Ramadhani.pdf",
    file_path: "VALID-PPPK-SK-BLOB",
    uploaded_at: "2023-04-01T08:20:00Z",
    source: "Upload Kerja"
  },
  {
    id: 8,
    id_asn: 3,
    nama_berkas: "Perjanijan Kerja PPPK (Kontrak 5 Tahun)",
    kategori_kelompok: "PPPK_Khusus",
    file_name: "Kontrak_Kerja_PPPK_Nia.pdf",
    file_path: "VALID-PPPK-KONTRAK-BLOB",
    uploaded_at: "2023-04-01T08:30:00Z",
    source: "Upload Kerja",
    notes: "Masa berlaku: 2023 s.d. 2028"
  },
  {
    id: 9,
    id_asn: 3,
    nama_berkas: "Surat Pernyataan Melaksanakan Tugas (SPMT)",
    kategori_kelompok: "PPPK_Khusus",
    file_name: "SPMT_PPPK_Nia_Ramadhani.pdf",
    file_path: "VALID-PPPK-SPMT-BLOB",
    uploaded_at: "2023-04-10T10:00:00Z",
    source: "Upload Kerja"
  },

  // User ID 8 (Sri Handayani - PKWT/Non_ASN)
  {
    id: 10,
    id_asn: 8,
    nama_berkas: "SK Pengangkatan Tenaga Kontrak / Honor Kepala Dinas",
    kategori_kelompok: "PKWT_Khusus",
    file_name: "SK_Honorer_SriHandayani.pdf",
    file_path: "VALID-HONOR-SK-BLOB",
    uploaded_at: "2024-01-02T09:00:00Z",
    source: "Upload Kerja"
  },
  {
    id: 11,
    id_asn: 8,
    nama_berkas: "Dokumen Kontrak Kerja PKWT Tahunan",
    kategori_kelompok: "PKWT_Khusus",
    file_name: "Kontrak_PKWT_SriHandayani_2025.pdf",
    file_path: "VALID-PKWT-2025-BLOB",
    uploaded_at: "2025-01-02T10:30:00Z",
    source: "Upload Kerja",
    pkwt_tahun: 2025
  },
  {
    id: 12,
    id_asn: 8,
    nama_berkas: "Dokumen Kontrak Kerja PKWT Tahunan",
    kategori_kelompok: "PKWT_Khusus",
    file_name: "Kontrak_PKWT_SriHandayani_2026.pdf",
    file_path: "VALID-PKWT-2026-BLOB",
    uploaded_at: "2026-01-02T08:15:00Z",
    source: "Upload Kerja",
    pkwt_tahun: 2026
  }
];

export const SEED_NOTIFICATIONS: InAppNotification[] = [
  {
    id: 1,
    sender: "Sistem SAPA",
    time: "2026-06-15T01:00:00Z",
    title: "Sistem Peringatan Aktif",
    message: "Peringatan Dini otomatis mendeteksi 1 STR pegawai yang akan segera kedaluwarsa dalam 60 hari.",
    targetRole: "admin_dinkes",
    targetPuskesmasId: null,
    isRead: false
  },
  {
    id: 2,
    sender: "Sistem SAPA",
    time: "2026-06-15T01:00:00Z",
    title: "Sinkronisasi SatuSehat Terpadu",
    message: "Verifikasi integrasi Supabase & SatuSehat SDMK Kemenkes telah didaftarkan untuk kelayakan nakes.",
    targetRole: "admin_puskesmas",
    targetPuskesmasId: 1,
    isRead: false
  }
];

// Helper to fully initialize and retrieve stored db state
export const initializeDB = () => {
  if (typeof window === 'undefined') return;

  const checkAndSet = (key: string, defaultVal: any) => {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
    }
  };

  // Default values
  checkAndSet('simpeg_puskesmas', MASTER_PUSKESMAS);
  checkAndSet('simpeg_fitur', MASTER_FITUR);
  checkAndSet('simpeg_dokumen', MASTER_DOKUMEN);
  checkAndSet('simpeg_syarat_fitur_map', INITIAL_SYARAT_FITUR_MAP);
  checkAndSet('simpeg_asn_profiles', SEED_ASN_PROFILES);
  checkAndSet('simpeg_usulan_layanan', SEED_USULAN_LAYANAN);
  checkAndSet('simpeg_riwayat_ak', SEED_RIWAYAT_AK);
  checkAndSet('simpeg_laporan_sdmk', SEED_LAPORAN_SDMK);
  checkAndSet('simpeg_profesi_sdmk', MASTER_PROFESI_SDMK);
  checkAndSet('simpeg_users', SEED_USERS);
  checkAndSet('simpeg_arsip_kepegawaian', SEED_ARSIP_KEPEGAWAIAN);
  checkAndSet('simpeg_notifications', SEED_NOTIFICATIONS);

  checkAndSet('simpeg_logo_url', '/logo_lombok_barat.jpg');
  checkAndSet('simpeg_favicon_url', '/logo_lombok_barat.jpg');
  
  // also track uploaded document logs
  if (!localStorage.getItem('simpeg_usulan_dokumen_file')) {
    localStorage.setItem('simpeg_usulan_dokumen_file', JSON.stringify([
      { id: 1, id_usulan: 1, id_dokumen: 1, file_name: "surat_pengantar_kediri.pdf", file_path: "/uploads/1_1.pdf", uploaded_at: "2026-06-01T08:35:00Z", ocr_status: "SUCCESS", ocr_feedback_message: "Valid - NIP & KATA KUNCI Cocok" },
      { id: 2, id_usulan: 1, id_dokumen: 2, file_name: "sk_pangkat_ahmad.pdf", file_path: "/uploads/1_2.pdf", uploaded_at: "2026-06-01T08:37:00Z", ocr_status: "SUCCESS" },
      { id: 3, id_usulan: 1, id_dokumen: 3, file_name: "sk_jabatan_ahmad.pdf", file_path: "/uploads/1_3.pdf", uploaded_at: "2026-06-01T08:39:00Z", ocr_status: "SUCCESS" }
    ]));
  }
};

export function getFallbackProfesiId(nama: string, gelar: string | null): number {
  const text = (nama + " " + (gelar || '')).toLowerCase();
  if (text.includes("drg. ") || text.includes("dokter gigi")) return 3; // Dokter Gigi
  if (text.includes("dr. ") || text.includes("dokter")) return 2; // Dokter
  if (text.includes("bidan") || text.includes("keb") || text.includes("a.md.keb")) return 4; // Bidan
  if (text.includes("perawat") || text.includes("kep") || text.includes("a.md.kep")) return 1; // Perawat
  if (text.includes("apoteker") || text.includes("farm") || text.includes("apt")) return 5; // Apoteker
  if (text.includes("tenaga teknik kefarmasian")) return 6;
  if (text.includes("promkes") || text.includes("ilmu perilaku")) return 7;
  if (text.includes("sanitarian") || text.includes("kesehatan lingkungan")) return 8;
  if (text.includes("nutrisionis") || text.includes("gizi")) return 9;
  if (text.includes("laboratorium") || text.includes("analis") || text.includes("a.k") || text.includes("lab medik") || text.includes("atlm")) return 10; // Ahli Teknologi Lab Medik
  if (text.includes("rekam medis")) return 11;
  if (text.includes("terapis gigi") || text.includes("mulut") || text.includes("kg")) return 12; // Terapis Gigi & Mulut
  if (text.includes("s.kom") || text.includes("sistem informasi") || text.includes("telematika")) return 15; // Tenaga Sistem Informasi Kes.
  if (text.includes("keuangan") || text.includes("akuntansi") || text.includes("se") || text.includes("kasir")) return 14; // Tenaga Adm. Keuangan
  return 13; // Umum & Kepeg
}

export const getDB = () => {
  initializeDB();

  const safeParse = <T>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return fallback;
      const parsed = JSON.parse(item);
      return parsed as T;
    } catch (e) {
      console.warn(`Error parsing key "${key}" from localStorage, using fallback.`, e);
      return fallback;
    }
  };

  const rawProfiles = safeParse<ASNProfile[]>('simpeg_asn_profiles', []);
  const safeProfilesList = Array.isArray(rawProfiles) ? rawProfiles : [];

  const healedProfiles: ASNProfile[] = safeProfilesList.map(p => {
    const updated = { ...p };
    updated.id_profesi = updated.id_profesi || getFallbackProfesiId(updated.nama_lengkap, updated.gelar_belakang);
    
    // Auto-heal missing WhatsApp numbers with +62 prefix
    if (!updated.nomor_wa) {
      updated.nomor_wa = `+62812345678${updated.id}`;
    }

    // Auto-heal missing NIK with 16-digit compliant numeric string
    if (!updated.nik) {
      const idStr = String(updated.id).padStart(2, '0');
      const nipCleasened = String(updated.nip || '').replace(/\D/g, '');
      const prefix = nipCleasened.length >= 8 ? nipCleasened.slice(0, 8) : '19900101';
      updated.nik = ("520102" + prefix + "00" + idStr).padEnd(16, '1').slice(0, 16);
    }
    
    // Auto-heal Hj. Baiq Sumiati (id: 2) or anyone named Baiq Sumiati
    if (updated.nama_lengkap && updated.nama_lengkap.includes("Baiq Sumiati")) {
      updated.no_str = updated.no_str || "STR-19681125-199103-2-001";
      updated.tanggal_terbit_str = updated.tanggal_terbit_str || "2021-08-01";
      // To ensure exactly 45 days remaining from 2026-06-16, set exp date to 2026-07-31
      updated.tanggal_akhir_str = "2026-07-31"; 
      updated.is_str_seumur_hidup = false;
      updated.no_sip = updated.no_sip || "SIP-19681125-199103-2-001";
      updated.tanggal_terbit_sip = updated.tanggal_terbit_sip || "2021-08-15";
      updated.tanggal_akhir_sip = updated.tanggal_akhir_sip || "2026-08-15";
    }
    
    // Auto-heal dr. Wahyu Darizki (id: 1)
    if (updated.nama_lengkap && updated.nama_lengkap.includes("Wahyu Darizki")) {
      updated.no_str = updated.no_str || "STR-19800412-200501-1-003";
      updated.tanggal_terbit_str = updated.tanggal_terbit_str || "2015-05-12";
      updated.tanggal_akhir_str = updated.tanggal_akhir_str || "Seumur Hidup";
      updated.is_str_seumur_hidup = true;
      updated.no_sip = updated.no_sip || "SIP-19800412-200501-1-003";
      updated.tanggal_terbit_sip = updated.tanggal_terbit_sip || "2021-06-10";
      updated.tanggal_akhir_sip = updated.tanggal_akhir_sip || "2026-10-15";
    }

    // Give remaining Jafung Kesehatan basic STR / SIP if missing
    if (updated.jenis_pegawai === 'Jafung_Kesehatan') {
      const safeNip = String(updated.nip || `GEN-${updated.id}`);
      if (!updated.no_str) {
        updated.no_str = `STR-${safeNip.slice(0, 8)}-${updated.id}`;
        updated.tanggal_terbit_str = "2022-01-10";
        updated.tanggal_akhir_str = "Seumur Hidup";
        updated.is_str_seumur_hidup = true;
      }
      if (!updated.no_sip) {
        updated.no_sip = `SIP-${safeNip.slice(0, 8)}-${updated.id}`;
        updated.tanggal_terbit_sip = "2022-01-20";
        updated.tanggal_akhir_sip = "2027-12-15";
      }
    }
    return updated;
  });

  const psk = safeParse<Puskesmas[]>('simpeg_puskesmas', []);
  const ftr = safeParse<MasterFitur[]>('simpeg_fitur', []);
  const doc = safeParse<MasterDokumen[]>('simpeg_dokumen', []);
  const map = safeParse<Record<string, number[]>>('simpeg_syarat_fitur_map', {});
  const usul = safeParse<UsulanLayanan[]>('simpeg_usulan_layanan', []);
  const ak = safeParse<RiwayatAngkaKredit[]>('simpeg_riwayat_ak', []);
  const lpr = safeParse<LaporanSDMKBulanan[]>('simpeg_laporan_sdmk', []);
  const prof = safeParse<MasterProfesiSDMK[]>('simpeg_profesi_sdmk', []);
  const udoc = safeParse<any[]>('simpeg_usulan_dokumen_file', []);
  const ars = safeParse<ArsipKepegawaian[]>('simpeg_arsip_kepegawaian', []);
  const usr = safeParse<User[]>('simpeg_users', []);
  const ntf = safeParse<InAppNotification[]>('simpeg_notifications', []);

  return {
    puskesmas: Array.isArray(psk) ? psk : [],
    fitur: Array.isArray(ftr) ? ftr : [],
    dokumen: Array.isArray(doc) ? doc : [],
    syaratFiturMap: (map && typeof map === 'object') ? map : {},
    asnProfiles: healedProfiles,
    usulanLayanan: Array.isArray(usul) ? usul : [],
    riwayatAk: Array.isArray(ak) ? ak : [],
    laporanSdmk: Array.isArray(lpr) ? lpr : [],
    profesiSdmk: Array.isArray(prof) ? prof : [],
    usulanDokumenFile: Array.isArray(udoc) ? udoc : [],
    arsipKepegawaian: Array.isArray(ars) ? ars : [],
    users: Array.isArray(usr) ? usr : [],
    notifications: Array.isArray(ntf) ? ntf : [],
    logoUrl: localStorage.getItem('simpeg_logo_url') || '/logo_lombok_barat.jpg',
    faviconUrl: localStorage.getItem('simpeg_favicon_url') || '/logo_lombok_barat.jpg'
  };
};

export const saveDB = (data: Partial<ReturnType<typeof getDB>> & Record<string, any>) => {
  if (typeof window === 'undefined') return;
  Object.entries(data).forEach(([key, val]) => {
    let storageKey = '';
    if (key === 'puskesmas') storageKey = 'simpeg_puskesmas';
    else if (key === 'fitur') storageKey = 'simpeg_fitur';
    else if (key === 'dokumen') storageKey = 'simpeg_dokumen';
    else if (key === 'syaratFiturMap') storageKey = 'simpeg_syarat_fitur_map';
    else if (key === 'asnProfiles') storageKey = 'simpeg_asn_profiles';
    else if (key === 'usulanLayanan') storageKey = 'simpeg_usulan_layanan';
    else if (key === 'riwayatAk') storageKey = 'simpeg_riwayat_ak';
    else if (key === 'laporanSdmk') storageKey = 'simpeg_laporan_sdmk';
    else if (key === 'profesiSdmk') storageKey = 'simpeg_profesi_sdmk';
    else if (key === 'usulanDokumenFile') storageKey = 'simpeg_usulan_dokumen_file';
    else if (key === 'arsipKepegawaian') storageKey = 'simpeg_arsip_kepegawaian';
    else if (key === 'users') storageKey = 'simpeg_users';
    else if (key === 'logoUrl') storageKey = 'simpeg_logo_url';
    else if (key === 'faviconUrl') storageKey = 'simpeg_favicon_url';
    else if (key === 'notifications') storageKey = 'simpeg_notifications';

    if (storageKey) {
      const serializedValue = typeof val === 'string' ? val : JSON.stringify(val);
      try {
        localStorage.setItem(storageKey, serializedValue);
      } catch (err: any) {
        if (err.name === 'QuotaExceededError' || err.code === 22 || err.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
          console.warn(`SAPA Storage quota exceeded for key "${storageKey}". Attempting automatic base64 compression/pruning of older records...`);
          
          if (storageKey === 'simpeg_arsip_kepegawaian' || storageKey === 'simpeg_usulan_dokumen_file') {
            try {
              const list = typeof val === 'string' ? JSON.parse(val) : val;
              if (Array.isArray(list)) {
                // Keep only the most recent files intact, stub the rest to save space.
                const processed = list.map((item: any, idx: number) => {
                  // Keep item fully intact if it is the latest uploaded item
                  if (idx < list.length - 1 && item.file_path && item.file_path.startsWith('data:')) {
                    return {
                      ...item,
                      file_path: "data:application/pdf;base64,SIMULATED_LARGE_FILE_REDUCED_TO_PRESERVE_LOCAL_QUOTA_STUB_OK"
                    };
                  }
                  return item;
                });
                localStorage.setItem(storageKey, JSON.stringify(processed));
                console.log(`Successfully saved processed/pruned list for "${storageKey}" within localStorage quota limit!`);
                return;
              }
            } catch (_) {}
          }
          console.error(`Unable to automatically compress store data for key "${storageKey}".`);
        } else {
          console.error(`Storage save failure for key "${storageKey}":`, err);
        }
      }
    }
  });
};
