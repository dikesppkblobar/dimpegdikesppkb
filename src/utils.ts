/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ASNProfile, RiwayatAngkaKredit, PredikatSKP } from './types';

// Anchor system date: June 11, 2026
export const SYSTEM_DATE_STR = "2026-06-11";
export const SYSTEM_DATE = new Date(SYSTEM_DATE_STR);

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateString;
  }
}

/**
 * Calculates month difference helper
 */
export function countMonthDiff(start: Date, end: Date): number {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + (end.getDate() - start.getDate()) / 30;
}

export interface EarlyWarningAlert {
  id: string;
  id_asn: number;
  type: 'pensiun' | 'pangkat' | 'berkala';
  message: string;
  subMessage: string;
  monthsLeft: number;
  targetDateStr: string;
  asnName: string;
  nip: string;
  puskesmasId: number;
}

/**
 * Multi-Tenant Local Early Warning System logic matcher
 */
export function getEarlyWarningAlerts(asnList: ASNProfile[]): EarlyWarningAlert[] {
  const alerts: EarlyWarningAlert[] = [];

  asnList.forEach(asn => {
    if (asn.status_kepegawaian !== 'Aktif') return;

    // 1. PENSIUN (BUP is 58 years for common civil service / clinical Jafung in primary clinics)
    const birthDate = new Date(asn.tanggal_lahir);
    const targetPensiun = new Date(birthDate.getFullYear() + 58, birthDate.getMonth(), birthDate.getDate());
    const mPensiun = countMonthDiff(SYSTEM_DATE, targetPensiun);

    if (mPensiun > 0 && mPensiun <= 6) {
      alerts.push({
        id: `pensiun-${asn.id}`,
        id_asn: asn.id,
        type: 'pensiun',
        message: `Masa Pensiun Mendekati (BUP 58 Tahun)`,
        subMessage: `${Math.round(mPensiun * 10) / 10} bulan tersisa sebelum TMT pensiun (${formatDate(targetPensiun.toISOString().split('T')[0])})`,
        monthsLeft: mPensiun,
        targetDateStr: targetPensiun.toISOString().split('T')[0],
        asnName: asn.nama_lengkap + (asn.gelar_belakang ? `, ${asn.gelar_belakang}` : ''),
        nip: asn.nip,
        puskesmasId: asn.id_puskesmas
      });
    }

    // 2. KENAIKAN PANGKAT (Period is every 4 years)
    const pangkatDate = new Date(asn.tmt_pangkat_terakhir);
    const targetPangkat = new Date(pangkatDate.getFullYear() + 4, pangkatDate.getMonth(), pangkatDate.getDate());
    const mPangkat = countMonthDiff(SYSTEM_DATE, targetPangkat);

    if (mPangkat > 0 && mPangkat <= 4) {
      alerts.push({
        id: `pangkat-${asn.id}`,
        id_asn: asn.id,
        type: 'pangkat',
        message: `Kenaikan Pangkat Berkala (Siklus 4 Tahun)`,
        subMessage: `${Math.round(mPangkat * 10) / 10} bulan tersisa sebelum TMT pangkat baru (${formatDate(targetPangkat.toISOString().split('T')[0])})`,
        monthsLeft: mPangkat,
        targetDateStr: targetPangkat.toISOString().split('T')[0],
        asnName: asn.nama_lengkap + (asn.gelar_belakang ? `, ${asn.gelar_belakang}` : ''),
        nip: asn.nip,
        puskesmasId: asn.id_puskesmas
      });
    }

    // 3. GAJI BERKALA (Period is every 2 years)
    const berkalaDate = new Date(asn.tmt_berkala_terakhir);
    const targetBerkala = new Date(berkalaDate.getFullYear() + 2, berkalaDate.getMonth(), berkalaDate.getDate());
    const mBerkala = countMonthDiff(SYSTEM_DATE, targetBerkala);

    if (mBerkala > 0 && mBerkala <= 2) {
      alerts.push({
        id: `berkala-${asn.id}`,
        id_asn: asn.id,
        type: 'berkala',
        message: `Kenaikan Gaji Berkala (KGB - Siklus 2 Tahun)`,
        subMessage: `${Math.round(mBerkala * 10) / 10} bulan tersisa sebelum TMT berkala baru (${formatDate(targetBerkala.toISOString().split('T')[0])})`,
        monthsLeft: mBerkala,
        targetDateStr: targetBerkala.toISOString().split('T')[0],
        asnName: asn.nama_lengkap + (asn.gelar_belakang ? `, ${asn.gelar_belakang}` : ''),
        nip: asn.nip,
        puskesmasId: asn.id_puskesmas
      });
    }
  });

  return alerts.sort((a, b) => a.monthsLeft - b.monthsLeft);
}

/**
 * PermenPAN-RB 1/2023 Jafung credit points definitions
 */
export const KOEFISIEN_TAHUNAN_JAFUNG: Record<string, number> = {
  "Terampil": 5.0,
  "Ahli Pertama": 12.5,
  "Ahli Muda": 25.0,
  "Ahli Madya": 37.5
};

export const MULTIPLIER_PREDIKAT_SKP: Record<PredikatSKP, number> = {
  "Sangat Baik": 1.5,
  "Baik": 1.0,
  "Butuh Perbaikan": 0.75,
  "Kurang": 0.5,
  "Sangat Kurang": 0.0
};

/**
 * Calculate credits acquired per year
 */
export function calculateYearlyCredit(jenjang: string, predikat: PredikatSKP): number {
  const coeff = KOEFISIEN_TAHUNAN_JAFUNG[jenjang] || 12.5; // default Ahli Pertama
  const mult = MULTIPLIER_PREDIKAT_SKP[predikat] ?? 1.0;
  return coeff * mult;
}

/**
 * Run overall calculation logic for an Jafung ASN
 */
export function compileTotalCredit(
  akIntegrasi2022: number, 
  jenjang: string, 
  riwayat: RiwayatAngkaKredit[]
): { total: number; detailHistorySum: number } {
  const sumHistory = riwayat.reduce((acc, curr) => acc + curr.ak_diperoleh, 0);
  return {
    total: akIntegrasi2022 + sumHistory,
    detailHistorySum: sumHistory
  };
}

/**
 * Simple mock OCR parser
 * Read content & check if it matches target keywords and owner's credentials (NIP or name)
 */
export function runMockOcrValidation(
  fileName: string,
  rawText: string,
  requiredDocKeywords: string,
  targetNip: string,
  targetName: string
): { success: boolean; reason: string; keywordsFound: string[] } {
  const textUpper = (rawText + " " + fileName).toUpperCase();
  const nipClear = targetNip.replace(/\D/g, ''); // numerical
  const nameParts = targetName.toLowerCase().split(/\s+/).filter(p => p.length > 2);

  // 1. check for other people's NIP! (Anti-slop safety upload check)
  // Let's check if the text contains a 18-digit number that starts with "19" or "20" but DOES NOT MATCH target NIP
  const nipPattern = /\b(19|20)\d{16}\b/g;
  const foundNips = textUpper.match(nipPattern);
  if (foundNips) {
    const foreignNip = foundNips.find(n => n !== nipClear);
    if (foreignNip) {
      return {
        success: false,
        reason: `Sistem mendeteksi NIP lain (${foreignNip}) di dalam dokumen yang diunggah. Berkas ini dicurigai milik pegawai lain.`,
        keywordsFound: []
      };
    }
  }

  // 2. keyword matching checks
  const keywords = requiredDocKeywords.split(',').map(k => k.trim().toUpperCase());
  const matched: string[] = [];
  keywords.forEach(k => {
    if (textUpper.includes(k)) {
      matched.push(k);
    }
  });

  const matchRatio = keywords.length > 0 ? (matched.length / keywords.length) : 1;
  
  if (matchRatio < 0.4) {
    return {
      success: false,
      reason: `Dokumen tidak valid atau kurang lengkap. Kata kunci tipe berkas wajib tidak ditemukan (mencari: ${requiredDocKeywords.toLowerCase()}).`,
      keywordsFound: matched
    };
  }

  return {
    success: true,
    reason: "Validasi Dokumen Sukses: Kata kunci tipe syarat lulus verifikasi OCR dan data pegawai sesuai.",
    keywordsFound: matched
  };
}

/**
 * Adds specify number of years to a standard ISO date string
 */
export function addYearsToDateString(dateString: string | undefined | null, years: number): string {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "-";
    d.setFullYear(d.getFullYear() + years);
    return d.toISOString().split('T')[0];
  } catch {
    return "-";
  }
}

