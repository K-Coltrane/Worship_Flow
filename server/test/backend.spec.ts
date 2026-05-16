import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AiService } from '../src/ai/ai.service';
import { SpeechToTextService } from '../src/ai/speech-to-text.service';
import { DatabaseService } from '../src/database/database.service';
import { PresentationService } from '../src/presentation/presentation.service';
import { RealtimeService } from '../src/realtime/realtime.service';
import { ScriptureService } from '../src/scripture/scripture.service';
import { ServiceFlowService } from '../src/service-flow/service-flow.service';
import { SongsService } from '../src/songs/songs.service';

function createBackendHarness() {
  const tempDir = mkdtempSync(join(tmpdir(), 'worship-backend-'));
  process.env.WORSHIP_DB_PATH = join(tempDir, 'test.sqlite');

  const database = new DatabaseService();
  database.onModuleInit();

  const eventEmitter = new EventEmitter2();
  const realtime = new RealtimeService(eventEmitter);
  const scripture = new ScriptureService(database);
  const presentation = new PresentationService(database, realtime, scripture);
  const songs = new SongsService(database);
  const speechToText = new SpeechToTextService();
  const ai = new AiService(database, realtime, scripture, speechToText);
  const serviceFlow = new ServiceFlowService(database, presentation, realtime);

  return {
    database,
    scripture,
    presentation,
    songs,
    ai,
    serviceFlow,
    cleanup: () => {
      database.onApplicationShutdown();
      rmSync(tempDir, { recursive: true, force: true });
      delete process.env.WORSHIP_DB_PATH;
    },
  };
}

test('songs are persisted and searchable', () => {
  const backend = createBackendHarness();
  try {
    const song = backend.songs.createSong({
      title: 'How Great Thou Art',
      artist: 'Traditional',
      verses: [{ type: 'verse', content: 'O Lord my God' }],
    });

    assert.equal(backend.songs.getSong(song.id).title, 'How Great Thou Art');
    assert.equal(backend.songs.searchSongs('great').some((item) => item.id === song.id), true);
  } finally {
    backend.cleanup();
  }
});

test('scripture detection normalizes spoken references', () => {
  const backend = createBackendHarness();
  try {
    const detections = backend.scripture.detectReferences('Please read First Corinthians 13:4');

    assert.equal(detections.length, 1);
    assert.equal(detections[0].reference, '1 Corinthians 13:4');
  } finally {
    backend.cleanup();
  }
});

test('presentation keeps preview and live as explicit separate states', () => {
  const backend = createBackendHarness();
  try {
    const state = backend.presentation.setPreview({
      id: 'song-1',
      type: 'song',
      title: 'Amazing Grace',
      content: 'Amazing grace',
    });

    assert.equal(state.preview?.title, 'Amazing Grace');
    assert.equal(state.live, null);

    const liveState = backend.presentation.goLive();
    assert.equal(liveState.preview?.title, 'Amazing Grace');
    assert.equal(liveState.live?.title, 'Amazing Grace');

    const clearedState = backend.presentation.clearLive();
    assert.equal(clearedState.preview?.title, 'Amazing Grace');
    assert.equal(clearedState.live, null);
  } finally {
    backend.cleanup();
  }
});

test('AI detection assists without changing live state', () => {
  const backend = createBackendHarness();
  try {
    const result = backend.ai.processText('The sermon mentions John 3:16');
    const latestDetection = backend.ai.getLatestDetection();

    assert.equal(result.detections.length, 1);
    assert.equal(latestDetection?.reference, 'John 3:16');
    assert.equal(backend.presentation.getState().live, null);
  } finally {
    backend.cleanup();
  }
});

test('service flow active item updates preview only', () => {
  const backend = createBackendHarness();
  try {
    const item = backend.serviceFlow.addItem({
      type: 'scripture',
      title: 'Romans 8:28',
      content: {
        id: 'romans-8-28',
        type: 'scripture',
        title: 'Romans 8:28',
        content: 'All things work together for good.',
      },
    });

    const flow = backend.serviceFlow.setActiveItem(item.id);
    const state = backend.presentation.getState();

    assert.equal(flow.activeItemId, item.id);
    assert.equal(state.preview?.title, 'Romans 8:28');
    assert.equal(state.live, null);
  } finally {
    backend.cleanup();
  }
});
