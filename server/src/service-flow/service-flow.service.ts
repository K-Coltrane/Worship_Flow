import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PresentationContent, ServiceFlowItem } from '../common/domain.types';
import { parseJson, stringifyJson } from '../common/json';
import { nowIso } from '../common/time';
import { assertNotBlank } from '../common/validators';
import { DatabaseService } from '../database/database.service';
import { PresentationService } from '../presentation/presentation.service';
import { RealtimeEvents } from '../realtime/realtime.events';
import { RealtimeService } from '../realtime/realtime.service';
import { AddServiceItemDto } from './service-flow.dto';

type ServiceItemRow = {
  id: string;
  type: 'song' | 'scripture' | 'media';
  title: string;
  subtitle: string | null;
  item_ref: string | null;
  content_json: string;
  position: number;
  created_at: string;
  updated_at: string;
};

@Injectable()
export class ServiceFlowService {
  constructor(
    private readonly database: DatabaseService,
    private readonly presentationService: PresentationService,
    private readonly realtime: RealtimeService,
  ) {}

  getFlow() {
    const items = this.listItems();
    const activeItemId = this.getActiveItemId();
    return {
      items,
      activeItemId,
      activeItem: activeItemId ? items.find((item) => item.id === activeItemId) ?? null : null,
    };
  }

  addItem(input: AddServiceItemDto): ServiceFlowItem {
    const timestamp = nowIso();
    const nextPosition = this.getNextPosition();
    const item: ServiceFlowItem = {
      id: randomUUID(),
      type: input.type,
      title: assertNotBlank(input.title, 'title'),
      subtitle: input.subtitle?.trim() || undefined,
      itemRef: input.itemRef?.trim() || undefined,
      content: this.cloneContent(input.content),
      position: nextPosition,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.database.db
      .prepare(
        `INSERT INTO service_items
          (id, type, title, subtitle, item_ref, content_json, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        item.id,
        item.type,
        item.title,
        item.subtitle ?? null,
        item.itemRef ?? null,
        stringifyJson(item.content),
        item.position,
        item.createdAt,
        item.updatedAt,
      );

    this.emitFlow();
    return item;
  }

  reorderItems(itemIds: string[]) {
    const currentItems = this.listItems();
    const currentIds = currentItems.map((item) => item.id).sort();
    const requestedIds = [...itemIds].sort();

    if (
      currentIds.length !== requestedIds.length ||
      currentIds.some((id, index) => id !== requestedIds[index])
    ) {
      throw new BadRequestException('Reorder must include every service item exactly once');
    }

    const timestamp = nowIso();
    const reorder = this.database.db.transaction(() => {
      itemIds.forEach((id, index) => {
        this.database.db
          .prepare('UPDATE service_items SET position = ?, updated_at = ? WHERE id = ?')
          .run(-(index + 1), timestamp, id);
      });

      itemIds.forEach((id, index) => {
        this.database.db
          .prepare('UPDATE service_items SET position = ?, updated_at = ? WHERE id = ?')
          .run(index, timestamp, id);
      });
    });

    reorder();
    return this.emitFlow();
  }

  setActiveItem(id: string) {
    const item = this.getItem(id);
    const timestamp = nowIso();
    this.database.db
      .prepare(`UPDATE service_flow_state SET active_item_id = ?, updated_at = ? WHERE id = 'singleton'`)
      .run(id, timestamp);

    this.presentationService.setPreview(item.content);
    return this.emitFlow();
  }

  removeItem(id: string): void {
    const result = this.database.db.prepare('DELETE FROM service_items WHERE id = ?').run(id);
    if (result.changes === 0) {
      throw new NotFoundException(`Service item ${id} was not found`);
    }

    this.compactPositions();
    this.emitFlow();
  }

  listItems(): ServiceFlowItem[] {
    const rows = this.database.db
      .prepare('SELECT * FROM service_items ORDER BY position ASC')
      .all() as ServiceItemRow[];

    return rows.map((row) => this.mapRow(row));
  }

  getItem(id: string): ServiceFlowItem {
    const row = this.database.db.prepare('SELECT * FROM service_items WHERE id = ?').get(id) as
      | ServiceItemRow
      | undefined;

    if (!row) {
      throw new NotFoundException(`Service item ${id} was not found`);
    }

    return this.mapRow(row);
  }

  private getActiveItemId(): string | null {
    const row = this.database.db
      .prepare(`SELECT active_item_id FROM service_flow_state WHERE id = 'singleton'`)
      .get() as { active_item_id: string | null };
    return row.active_item_id;
  }

  private getNextPosition(): number {
    const row = this.database.db
      .prepare('SELECT COALESCE(MAX(position), -1) + 1 AS nextPosition FROM service_items')
      .get() as { nextPosition: number };
    return row.nextPosition;
  }

  private compactPositions(): void {
    const ids = this.listItems().map((item) => item.id);
    if (ids.length === 0) {
      return;
    }

    this.reorderItems(ids);
  }

  private emitFlow() {
    const flow = this.getFlow();
    this.realtime.emit(RealtimeEvents.ServiceFlowUpdated, flow);
    return flow;
  }

  private mapRow(row: ServiceItemRow): ServiceFlowItem {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      subtitle: row.subtitle ?? undefined,
      itemRef: row.item_ref ?? undefined,
      content: parseJson<PresentationContent>(row.content_json, {
        id: row.id,
        type: row.type,
        title: row.title,
      }),
      position: row.position,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private cloneContent(content: PresentationContent): PresentationContent {
    if (!content?.id || !content.type || !content.title) {
      throw new BadRequestException('Service item content requires id, type, and title');
    }

    return JSON.parse(JSON.stringify(content)) as PresentationContent;
  }
}
