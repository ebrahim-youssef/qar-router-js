import { InvalidRequestError } from '../domain/errors.js'
import { ayahCount } from './surah-meta.js'
export interface VerseKey { readonly surah: number; readonly ayah: number }
export function parseVerseKey(value: string): VerseKey { const match = /^(\d{1,3}):(\d{1,3})$/.exec(value); if (!match) throw new InvalidRequestError(`Invalid verse key: ${value}`); const surah = Number(match[1]), ayah = Number(match[2]); if (surah < 1 || surah > 114 || ayah < 1 || ayah > ayahCount(surah)) throw new InvalidRequestError(`Verse key outside Quran bounds: ${value}`); return { surah, ayah } }
export const formatVerseKey = (verse: VerseKey): string => `${verse.surah}:${verse.ayah}`
