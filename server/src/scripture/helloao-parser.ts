type HelloAoContentPart = string | { noteId?: number };

type HelloAoChapterContent = {
  type: string;
  number?: number;
  content?: HelloAoContentPart[];
};

type HelloAoChapter = {
  number?: number;
  chapter?: { number: number; content: HelloAoChapterContent[] };
  content?: HelloAoChapterContent[];
};

type HelloAoBook = {
  name: string;
  commonName?: string;
  order: number;
  chapters: HelloAoChapter[];
};

type HelloAoComplete = {
  books: HelloAoBook[];
};

const HELLOAO_BOOK_ALIASES: Record<string, string> = {
  Psalms: 'Psalm',
  'Song of Solomon': 'Song of Solomon',
  Song: 'Song of Solomon',
};

function normalizeHelloAoBookName(name: string): string {
  return HELLOAO_BOOK_ALIASES[name] ?? name;
}

export function verseTextFromHelloAoContent(parts: HelloAoContentPart[] | undefined): string {
  if (!parts?.length) {
    return '';
  }
  return parts
    .filter((part): part is string => typeof part === 'string')
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseHelloAoComplete(raw: HelloAoComplete): Array<{
  book: string;
  chapter: number;
  verse: number;
  text: string;
}> {
  const verses: Array<{ book: string; chapter: number; verse: number; text: string }> = [];

  for (const book of raw.books) {
    const bookName = normalizeHelloAoBookName(book.commonName || book.name);
    for (const chapterEntry of book.chapters) {
      const chapterNumber = chapterEntry.chapter?.number ?? chapterEntry.number ?? 0;
      const content = chapterEntry.chapter?.content ?? chapterEntry.content ?? [];
      for (const block of content) {
        if (block.type !== 'verse' || !block.number) {
          continue;
        }
        const text = verseTextFromHelloAoContent(block.content);
        if (!text) {
          continue;
        }
        verses.push({
          book: bookName,
          chapter: chapterNumber,
          verse: block.number,
          text,
        });
      }
    }
  }

  return verses;
}
