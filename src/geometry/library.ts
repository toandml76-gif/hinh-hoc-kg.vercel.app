import { AnalyzedProblem, DifficultyLevel } from '../types/geometry';
import { ADVANCED_PRESET_PROBLEMS } from './advancedPresets';
import { PRESET_PROBLEMS } from './presets';

export const PROBLEM_LIBRARY: AnalyzedProblem[] = [
  ...PRESET_PROBLEMS.slice(0, 6),
  ...ADVANCED_PRESET_PROBLEMS,
  ...PRESET_PROBLEMS.slice(6),
];

export const ALL_LIBRARY_TOPICS = [
  'Tất cả',
  'Vuông góc',
  'Song song',
  'Khoảng cách',
  'Góc',
  'Thể tích',
  'Thiết diện',
  'Kiểm chứng đề',
] as const;

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  co_ban: 'Cơ bản',
  trung_binh: 'Trung bình',
  nang_cao: 'Nâng cao',
};

function stripDiacritics(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export interface LibraryFilterQuery {
  search?: string;
  topic?: string;
  difficulty?: DifficultyLevel | 'all';
}

export function filterProblemLibrary(
  problems: AnalyzedProblem[],
  query: LibraryFilterQuery
): AnalyzedProblem[] {
  const searchNorm = stripDiacritics((query.search ?? '').trim());
  const topic = query.topic && query.topic !== 'Tất cả' ? query.topic : null;
  const difficulty = query.difficulty && query.difficulty !== 'all' ? query.difficulty : null;

  return problems.filter((p) => {
    if (topic && !p.topics.includes(topic)) {
      return false;
    }
    if (difficulty && p.difficulty !== difficulty) {
      return false;
    }
    if (searchNorm) {
      const haystack = stripDiacritics(
        `${p.title} ${p.rawText} ${p.category} ${p.structured.solidTypeLabel} ${p.structured.solidName} ${p.topics.join(' ')}`
      );
      const terms = searchNorm.split(/\s+/).filter(Boolean);
      for (const term of terms) {
        if (!haystack.includes(term)) return false;
      }
    }
    return true;
  });
}
