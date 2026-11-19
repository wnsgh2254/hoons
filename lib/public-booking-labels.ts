/**
 * Guest-facing English labels for My Booking (phone lookup).
 * Prefer DB english fields when present; otherwise translate common Korean salon terms.
 */

/** Exact phrase matches (after stripping card/cash suffixes and trimming). */
const SERVICE_NAME_KO_TO_EN: Record<string, string> = {
  여자커트: "Women's haircut",
  남자커트: "Men's haircut",
  여성커트: "Women's haircut",
  남성커트: "Men's haircut",
  커트: 'Haircut',
  베이직커트: 'Basic haircut',
  키즈커트: "Kids' haircut",
  앞머리커트: 'Bangs trim',
  드라이: 'Blow dry',
  스타일링: 'Styling',
  염색: 'Colour',
  컬러: 'Colour',
  블리치: 'Bleach',
  토닝: 'Toning',
  디지털펌: 'Digital perm',
  '디지털 펌': 'Digital perm',
  열펌: 'Hot perm',
  매직펌: 'Magic straight perm',
  매직: 'Magic straight',
  핫펌: 'Hot perm',
  클리닉: 'Treatment clinic',
  크리닉: 'Treatment clinic',
  두피클리닉: 'Scalp treatment',
  패키지: 'Package',
  기타: 'Other',
};

function stripPaymentSuffix(name: string): string {
  return name.replace(/\s*\(card\)\s*/gi, '').replace(/\s*\(cash\)\s*/gi, '').trim();
}

/** True if string contains Hangul syllables. */
function containsHangul(s: string): boolean {
  return /[\uAC00-\uD7AF]/.test(s);
}

/** True if label is suitable as English as-is (Latin letters, digits, common punctuation). */
function isMostlyLatinLabel(s: string): boolean {
  const hangul = s.replace(/[^\uAC00-\uD7AF]/g, '');
  if (hangul.length === 0) return true;
  const latin = s.replace(/[^a-zA-Z]/g, '');
  return latin.length > 0 && latin.length >= hangul.length;
}

/**
 * Translate catalog or custom service names for public English UI.
 */
export function translateServiceNameToEnglish(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const s = stripPaymentSuffix(raw);
  if (!s) return null;

  const compact = s.replace(/\s+/g, '');
  if (SERVICE_NAME_KO_TO_EN[compact]) return SERVICE_NAME_KO_TO_EN[compact];
  if (SERVICE_NAME_KO_TO_EN[s]) return SERVICE_NAME_KO_TO_EN[s];

  if (isMostlyLatinLabel(s)) return s;

  let out = s;

  const replacements: Array<[RegExp, string]> = [
    [/여자\s*/g, "Women's "],
    [/남자\s*/g, "Men's "],
    [/여성\s*/g, "Women's "],
    [/남성\s*/g, "Men's "],
    [/키즈\s*/g, "Kids' "],
    [/매직\s*/g, 'magic '],
    [/커트/g, 'haircut'],
    [/드라이/g, 'blow dry'],
    [/스타일링/g, 'styling'],
    [/염색/g, 'colour'],
    [/컬러/g, 'colour'],
    [/블리치/g, 'bleach'],
    [/토닝/g, 'toning'],
    [/펌/g, 'perm'],
    [/클리닉/g, 'clinic'],
    [/트리트먼트/g, 'treatment'],
    [/두피/g, 'scalp '],
  ];

  for (const [re, repl] of replacements) {
    out = out.replace(re, repl);
  }

  out = out.replace(/\s+/g, ' ').trim();
  if (!out) return null;

  const sentence = out.charAt(0).toUpperCase() + out.slice(1);
  return sentence;
}

/**
 * Catalog service: DB english_name wins; else translate Korean name.
 */
export function publicServiceLabelEn(
  englishName: string | null | undefined,
  catalogName: string | null | undefined,
  customName: string | null | undefined,
): string | null {
  const fromDb = englishName?.trim();
  if (fromDb) return fromDb;

  const custom = customName?.trim();
  if (custom) {
    const t = translateServiceNameToEnglish(custom);
    if (t && !containsHangul(t)) return t;
    if (t && containsHangul(t)) return 'Hair service';
    if (!containsHangul(custom)) return custom;
  }

  const catalog = catalogName?.trim();
  if (catalog) {
    const t = translateServiceNameToEnglish(catalog);
    if (t && !containsHangul(t)) return t;
    if (t && containsHangul(t)) return 'Hair service';
    const stripped = stripPaymentSuffix(catalog);
    if (!containsHangul(stripped)) return stripped;
  }

  return 'Hair service';
}

/**
 * Stylist: english_name from staff profile; Latin-only name as fallback; otherwise generic English.
 */
export function publicStylistLabelEn(
  englishName: string | null | undefined,
  name: string | null | undefined,
): string {
  const en = englishName?.trim();
  if (en) return en;
  const n = name?.trim();
  if (n && !containsHangul(n)) return n;
  return 'Your stylist';
}

/** SMS: always English service line (DB english_name wins, else translate Ko). */
export function smsServiceLabelEn(
  englishName: string | null | undefined,
  catalogName: string | null | undefined,
  customName: string | null | undefined,
): string {
  return publicServiceLabelEn(englishName, catalogName, customName) ?? 'Hair service';
}

/** SMS header; Korean branch names become neutral English. */
export function hoonsSmsHeader(shopName: string | null | undefined): string {
  const t = String(shopName ?? '').trim();
  if (!t) return 'Hoons Salon';
  if (containsHangul(t)) return 'Hoons Salon';

  // Comment: DB shop names may already include "HOONS" / "Hoons" — avoid "Hoons Hoons …".
  const withoutBrand = t.replace(/^hoons\s*/i, '').trim();
  if (!withoutBrand) return 'Hoons Salon';
  return `Hoons ${withoutBrand}`;
}

/** Reminder Location line: known venues show store name only; hide Korean addresses. */
export function smsVenueLocationForReminder(
  location: string | null | undefined,
  shopName?: string | null | undefined,
): string {
  const haystack = `${String(location ?? '')} ${String(shopName ?? '')}`.trim().toLowerCase();
  if (haystack.includes('meadowbank')) return 'Meadowbank Store';
  if (haystack.includes('haymarket')) return 'Haymarket Store';

  const t = String(location ?? '').trim();
  if (!t) return 'Hoons salon';
  if (containsHangul(t)) return 'Your Hoons salon';
  return t;
}
