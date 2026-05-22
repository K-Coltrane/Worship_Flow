import { normalizeBollsBookName } from './bible-books';

const BOLLS_API = 'https://bolls.life';

type BollsBookMeta = {
  bookid: number;
  name: string;
  chapters: number;
};

type BollsVerse = {
  verse: number;
  text: string;
};

export type BollsImportedVerse = {
  book: string;
  chapter: number;
  verse: number;
  text: string;
};

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchBollsTranslation(code: string): Promise<BollsImportedVerse[]> {
  const booksResponse = await fetch(`${BOLLS_API}/get-books/${code}/`);
  if (!booksResponse.ok) {
    throw new Error(`Bolls get-books failed for ${code}: ${booksResponse.status}`);
  }

  const books = (await booksResponse.json()) as BollsBookMeta[];
  const verses: BollsImportedVerse[] = [];

  for (const book of books) {
    const bookName = normalizeBollsBookName(book.name);
    for (let chapter = 1; chapter <= book.chapters; chapter += 1) {
      const chapterResponse = await fetch(
        `${BOLLS_API}/get-text/${code}/${book.bookid}/${chapter}/`,
      );
      if (!chapterResponse.ok) {
        throw new Error(
          `Bolls get-text failed for ${code} ${bookName} ${chapter}: ${chapterResponse.status}`,
        );
      }

      const chapterVerses = (await chapterResponse.json()) as BollsVerse[];
      for (const row of chapterVerses) {
        const text = stripHtml(row.text);
        if (!text) {
          continue;
        }
        verses.push({
          book: bookName,
          chapter,
          verse: row.verse,
          text,
        });
      }

      // Be gentle to the public API
      await delay(60);
    }
  }

  return verses;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
