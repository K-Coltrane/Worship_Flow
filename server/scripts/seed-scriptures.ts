import 'reflect-metadata';
import { DatabaseService } from '../src/database/database.service';
import { ScriptureImportService } from '../src/scripture/scripture-import.service';

async function main() {
  const configured = process.env.SCRIPTURE_TRANSLATIONS?.split(',').map((t) => t.trim());
  console.log(
    configured?.length
      ? `Seeding translations: ${configured.join(', ')}`
      : 'Seeding default popular translations (MSG, AMP, NLT, NIV, ESV, …)',
  );

  const database = new DatabaseService();
  database.onModuleInit();

  const importer = new ScriptureImportService(database);
  await importer.importDefaultTranslations();

  database.onApplicationShutdown();
  console.log('Scripture seed complete.');
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
