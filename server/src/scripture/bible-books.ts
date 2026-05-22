/** Canonical book order (Protestant 66-book canon). */
export const BIBLE_BOOK_NAMES = [
  'Genesis',
  'Exodus',
  'Leviticus',
  'Numbers',
  'Deuteronomy',
  'Joshua',
  'Judges',
  'Ruth',
  '1 Samuel',
  '2 Samuel',
  '1 Kings',
  '2 Kings',
  '1 Chronicles',
  '2 Chronicles',
  'Ezra',
  'Nehemiah',
  'Esther',
  'Job',
  'Psalm',
  'Proverbs',
  'Ecclesiastes',
  'Song of Solomon',
  'Isaiah',
  'Jeremiah',
  'Lamentations',
  'Ezekiel',
  'Daniel',
  'Hosea',
  'Joel',
  'Amos',
  'Obadiah',
  'Jonah',
  'Micah',
  'Nahum',
  'Habakkuk',
  'Zephaniah',
  'Haggai',
  'Zechariah',
  'Malachi',
  'Matthew',
  'Mark',
  'Luke',
  'John',
  'Acts',
  'Romans',
  '1 Corinthians',
  '2 Corinthians',
  'Galatians',
  'Ephesians',
  'Philippians',
  'Colossians',
  '1 Thessalonians',
  '2 Thessalonians',
  '1 Timothy',
  '2 Timothy',
  'Titus',
  'Philemon',
  'Hebrews',
  'James',
  '1 Peter',
  '2 Peter',
  '1 John',
  '2 John',
  '3 John',
  'Jude',
  'Revelation',
] as const;

export type BibleBookName = (typeof BIBLE_BOOK_NAMES)[number];

/** Aliases used for spoken / typed reference detection. */
export const bookAliases: Record<string, string[]> = {
  Genesis: ['genesis', 'gen'],
  Exodus: ['exodus', 'exod', 'ex'],
  Leviticus: ['leviticus', 'lev'],
  Numbers: ['numbers', 'num'],
  Deuteronomy: ['deuteronomy', 'deut'],
  Joshua: ['joshua', 'josh'],
  Judges: ['judges', 'judg'],
  Ruth: ['ruth'],
  '1 Samuel': ['1 samuel', 'first samuel', 'i samuel'],
  '2 Samuel': ['2 samuel', 'second samuel', 'ii samuel'],
  '1 Kings': ['1 kings', 'first kings', 'i kings'],
  '2 Kings': ['2 kings', 'second kings', 'ii kings'],
  '1 Chronicles': ['1 chronicles', 'first chronicles', 'i chronicles'],
  '2 Chronicles': ['2 chronicles', 'second chronicles', 'ii chronicles'],
  Ezra: ['ezra'],
  Nehemiah: ['nehemiah', 'neh'],
  Esther: ['esther', 'est'],
  Job: ['job'],
  Psalm: ['psalm', 'psalms', 'ps'],
  Proverbs: ['proverbs', 'prov'],
  Ecclesiastes: ['ecclesiastes', 'eccl'],
  'Song of Solomon': ['song of solomon', 'song of songs', 'sos'],
  Isaiah: ['isaiah', 'isa'],
  Jeremiah: ['jeremiah', 'jer'],
  Lamentations: ['lamentations', 'lam'],
  Ezekiel: ['ezekiel', 'ezek'],
  Daniel: ['daniel', 'dan'],
  Hosea: ['hosea'],
  Joel: ['joel'],
  Amos: ['amos'],
  Obadiah: ['obadiah', 'obad'],
  Jonah: ['jonah'],
  Micah: ['micah'],
  Nahum: ['nahum'],
  Habakkuk: ['habakkuk', 'hab'],
  Zephaniah: ['zephaniah', 'zeph'],
  Haggai: ['haggai'],
  Zechariah: ['zechariah', 'zech'],
  Malachi: ['malachi', 'mal'],
  Matthew: ['matthew', 'matt', 'mt'],
  Mark: ['mark', 'mk'],
  Luke: ['luke', 'lk'],
  John: ['john', 'jn'],
  Acts: ['acts'],
  Romans: ['romans', 'rom'],
  '1 Corinthians': ['1 corinthians', 'first corinthians', 'i corinthians'],
  '2 Corinthians': ['2 corinthians', 'second corinthians', 'ii corinthians'],
  Galatians: ['galatians', 'gal'],
  Ephesians: ['ephesians', 'eph'],
  Philippians: ['philippians', 'phil'],
  Colossians: ['colossians', 'col'],
  '1 Thessalonians': ['1 thessalonians', 'first thessalonians', 'i thessalonians'],
  '2 Thessalonians': ['2 thessalonians', 'second thessalonians', 'ii thessalonians'],
  '1 Timothy': ['1 timothy', 'first timothy', 'i timothy'],
  '2 Timothy': ['2 timothy', 'second timothy', 'ii timothy'],
  Titus: ['titus'],
  Philemon: ['philemon', 'phlm'],
  Hebrews: ['hebrews', 'heb'],
  James: ['james', 'jas'],
  '1 Peter': ['1 peter', 'first peter', 'i peter'],
  '2 Peter': ['2 peter', 'second peter', 'ii peter'],
  '1 John': ['1 john', 'first john', 'i john'],
  '2 John': ['2 john', 'second john', 'ii john'],
  '3 John': ['3 john', 'third john', 'iii john'],
  Jude: ['jude'],
  Revelation: ['revelation', 'rev'],
};

export type BibleTranslationSource = 'bolls' | 'thiagobodruk' | 'helloao';

export type BibleTranslationEntry = {
  code: string;
  label: string;
  language: string;
  source: BibleTranslationSource;
  file?: string;
  helloaoId?: string;
  /** Lower numbers import earlier on first run. */
  priority?: number;
};

/** Popular English study/church translations via Bolls.life (free API). */
export const BOLLS_ENGLISH_TRANSLATIONS: BibleTranslationEntry[] = [
  { code: 'MSG', source: 'bolls', label: 'The Message', language: 'English', priority: 1 },
  { code: 'AMP', source: 'bolls', label: 'Amplified Bible', language: 'English', priority: 1 },
  { code: 'AMPC', source: 'bolls', label: 'Amplified Bible (Classic)', language: 'English', priority: 1 },
  { code: 'NLT', source: 'bolls', label: 'New Living Translation', language: 'English', priority: 1 },
  { code: 'NIV', source: 'bolls', label: 'New International Version', language: 'English', priority: 1 },
  { code: 'ESV', source: 'bolls', label: 'English Standard Version', language: 'English', priority: 1 },
  { code: 'NKJV', source: 'bolls', label: 'New King James Version', language: 'English', priority: 2 },
  { code: 'NASB', source: 'bolls', label: 'New American Standard Bible', language: 'English', priority: 2 },
  { code: 'CSB', source: 'bolls', label: 'Christian Standard Bible', language: 'English', priority: 2 },
  { code: 'HCSB', source: 'bolls', label: 'Holman Christian Standard Bible', language: 'English', priority: 2 },
  { code: 'KJV', source: 'bolls', label: 'King James Version', language: 'English', priority: 2 },
  { code: 'MEV', source: 'bolls', label: 'Modern English Version', language: 'English', priority: 2 },
  { code: 'LSB', source: 'bolls', label: 'Legacy Standard Bible', language: 'English', priority: 3 },
  { code: 'NRSV', source: 'bolls', label: 'New Revised Standard Version', language: 'English', priority: 3 },
  { code: 'RSV', source: 'bolls', label: 'Revised Standard Version', language: 'English', priority: 3 },
  { code: 'CEV', source: 'bolls', label: 'Contemporary English Version', language: 'English', priority: 3 },
  { code: 'NCV', source: 'bolls', label: "New Century Version", language: 'English', priority: 3 },
  { code: 'NIRV', source: 'bolls', label: "New International Reader's Version", language: 'English', priority: 3 },
  { code: 'GNT', source: 'bolls', label: 'Good News Translation', language: 'English', priority: 3 },
  { code: 'TLB', source: 'bolls', label: 'The Living Bible', language: 'English', priority: 3 },
  { code: 'ISV', source: 'bolls', label: 'International Standard Version', language: 'English', priority: 3 },
  { code: 'PHILLIPS', source: 'bolls', label: 'Phillips New Testament', language: 'English', priority: 4 },
];

/** Default set imported on first run / `npm run scripture:seed`. */
export const DEFAULT_IMPORT_TRANSLATION_CODES = [
  'MSG',
  'AMP',
  'AMPC',
  'NLT',
  'NIV',
  'ESV',
  'NKJV',
  'NASB',
  'CSB',
  'HCSB',
  'KJV',
] as const;

export const BIBLE_TRANSLATION_CATALOG: BibleTranslationEntry[] = [...BOLLS_ENGLISH_TRANSLATIONS];

export const DEFAULT_BIBLE_TRANSLATIONS = BIBLE_TRANSLATION_CATALOG;

export const BOLLS_BOOK_NAME_ALIASES: Record<string, string> = {
  Psalms: 'Psalm',
};

export function normalizeBollsBookName(name: string): string {
  return BOLLS_BOOK_NAME_ALIASES[name] ?? name;
}
