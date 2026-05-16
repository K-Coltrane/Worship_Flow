import 'reflect-metadata';
import { DatabaseService } from '../src/database/database.service';
import { ScriptureImportService } from '../src/scripture/scripture-import.service';

async function main() {
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
