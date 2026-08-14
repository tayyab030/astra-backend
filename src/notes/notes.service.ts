import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import {
  BulkNotesDto,
  CreateNoteDto,
  NotesFilterDto,
  UpdateNoteDto,
} from './dto/notes.dto';
import { Note } from './entities/note.entity';

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const TAB_TO_NOTE_TYPE: Record<string, string> = {
  'quick-notes': 'quick-notes',
  knowledge: 'knowledge',
  research: 'research',
  ideas: 'ideas',
  'decision-journal': 'decision-journal',
  'lessons-learned': 'lessons-learned',
  meetings: 'meetings',
  'daily-journal': 'daily-journal',
  vision: 'vision',
  'book-notes': 'book-notes',
};

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepository: Repository<Note>,
  ) {}

  async getDashboard(userId: string, filterDto: NotesFilterDto) {
    const page = filterDto.page ?? 1;
    const pageSize = filterDto.page_size ?? 12;
    const allNotes = await this.noteRepository.find({
      where: { user_id: userId },
      order: { updated_at: 'DESC' },
    });

    const filtered = this.applyFilters(allNotes, filterDto);
    const sorted = this.sortNotes(
      filtered,
      filterDto.sort_field ?? 'updated_at',
      filterDto.sort_order ?? 'desc',
    );

    const start = (page - 1) * pageSize;
    const paginated = sorted.slice(start, start + pageSize);

    return {
      stats: this.buildStats(allNotes),
      sidebar_counts: this.buildSidebarCounts(allNotes),
      tags: this.collectTags(allNotes),
      categories: this.collectCategories(allNotes),
      notes: paginated.map((note) => this.serializeNote(note)),
      pagination: {
        page,
        page_size: pageSize,
        total: sorted.length,
        has_more: start + pageSize < sorted.length,
      },
    };
  }

  async getNote(userId: string, noteId: string) {
    const note = await this.findOwnedNote(userId, noteId);
    return this.serializeNote(note);
  }

  async createNote(userId: string, dto: CreateNoteDto) {
    const now = new Date();
    const note = this.noteRepository.create({
      user_id: userId,
      title: dto.title.trim(),
      content: dto.content ?? '',
      note_type: dto.note_type,
      category: dto.category ?? 'Personal',
      tags: dto.tags ?? [],
      priority: dto.priority ?? 'medium',
      is_favorite: dto.is_favorite ?? false,
      is_pinned: false,
      color: dto.color ?? null,
      status: dto.status ?? 'active',
      attachments: [],
      reminder: dto.reminder ? new Date(dto.reminder) : null,
      linked_items: dto.linked_items ?? [],
      visibility: dto.visibility ?? 'private',
      is_locked: false,
      is_ai_generated: false,
      metadata: dto.metadata ?? {},
      versions: [],
      activity: [
        {
          id: randomUUID(),
          action: 'Created note',
          timestamp: now.toISOString(),
        },
      ],
    });

    const saved = await this.noteRepository.save(note);
    return this.serializeNote(saved);
  }

  async updateNote(userId: string, noteId: string, dto: UpdateNoteDto) {
    const note = await this.findOwnedNote(userId, noteId);
    const now = new Date();

    const contentChanged =
      (dto.content !== undefined && dto.content !== note.content) ||
      (dto.title !== undefined && dto.title !== note.title);

    if (contentChanged) {
      const versions = [
        {
          id: randomUUID(),
          title: note.title,
          content: note.content,
          created_at: now.toISOString(),
        },
        ...(note.versions ?? []),
      ].slice(0, 20);
      note.versions = versions;
    }

    if (dto.title !== undefined) note.title = dto.title.trim();
    if (dto.content !== undefined) note.content = dto.content;
    if (dto.note_type !== undefined) note.note_type = dto.note_type;
    if (dto.category !== undefined) note.category = dto.category;
    if (dto.tags !== undefined) note.tags = dto.tags;
    if (dto.priority !== undefined) note.priority = dto.priority;
    if (dto.is_favorite !== undefined) note.is_favorite = dto.is_favorite;
    if (dto.is_pinned !== undefined) note.is_pinned = dto.is_pinned;
    if (dto.color !== undefined) note.color = dto.color ?? null;
    if (dto.status !== undefined) note.status = dto.status;
    if (dto.reminder !== undefined) {
      note.reminder = dto.reminder ? new Date(dto.reminder) : null;
    }
    if (dto.linked_items !== undefined) note.linked_items = dto.linked_items;
    if (dto.attachments !== undefined) note.attachments = dto.attachments;
    if (dto.visibility !== undefined) note.visibility = dto.visibility;
    if (dto.metadata !== undefined) {
      note.metadata = { ...note.metadata, ...dto.metadata };
    }

    note.activity = [
      {
        id: randomUUID(),
        action: 'Updated note',
        timestamp: now.toISOString(),
      },
      ...(note.activity ?? []),
    ].slice(0, 50);

    const saved = await this.noteRepository.save(note);
    return this.serializeNote(saved);
  }

  async deleteNote(userId: string, noteId: string, permanent = false) {
    const note = await this.findOwnedNote(userId, noteId);

    if (permanent) {
      await this.noteRepository.remove(note);
      return { message: 'Note permanently deleted' };
    }

    note.status = 'deleted';
    note.activity = [
      {
        id: randomUUID(),
        action: 'Moved to recycle bin',
        timestamp: new Date().toISOString(),
      },
      ...(note.activity ?? []),
    ].slice(0, 50);
    await this.noteRepository.save(note);
    return { message: 'Note moved to recycle bin' };
  }

  async restoreNote(userId: string, noteId: string) {
    const note = await this.findOwnedNote(userId, noteId);
    note.status = 'active';
    await this.noteRepository.save(note);
    return this.serializeNote(note);
  }

  async archiveNote(userId: string, noteId: string) {
    const note = await this.findOwnedNote(userId, noteId);
    note.status = 'archived';
    await this.noteRepository.save(note);
    return this.serializeNote(note);
  }

  async duplicateNote(userId: string, noteId: string) {
    const original = await this.findOwnedNote(userId, noteId);
    return this.createNote(userId, {
      title: `${original.title} (Copy)`,
      content: original.content,
      note_type: original.note_type,
      category: original.category,
      tags: [...(original.tags ?? [])],
      priority: original.priority,
      metadata: { ...(original.metadata ?? {}) },
    });
  }

  async bulkAction(userId: string, dto: BulkNotesDto) {
    const notes = await this.noteRepository
      .createQueryBuilder('note')
      .where('note.user_id = :userId', { userId })
      .andWhere('note.id IN (:...ids)', { ids: dto.ids })
      .getMany();

    if (notes.length === 0) {
      throw new NotFoundException({ detail: 'No notes found.' });
    }

    const toRemove: Note[] = [];

    for (const note of notes) {
      if (dto.action === 'archive') {
        note.status = 'archived';
      } else if (dto.action === 'delete') {
        if (dto.permanent) {
          toRemove.push(note);
          continue;
        }
        note.status = 'deleted';
      } else if (dto.action === 'favorite') {
        note.is_favorite = true;
      } else if (dto.action === 'tag' && dto.tag) {
        if (!note.tags.includes(dto.tag)) {
          note.tags = [...note.tags, dto.tag];
        }
      }
    }

    if (toRemove.length > 0) {
      await this.noteRepository.remove(toRemove);
    }

    const toSave = notes.filter((note) => !toRemove.includes(note));
    if (toSave.length > 0) {
      await this.noteRepository.save(toSave);
    }

    return { message: `${notes.length} notes updated`, count: notes.length };
  }

  async restoreVersion(userId: string, noteId: string, versionId: string) {
    const note = await this.findOwnedNote(userId, noteId);
    const version = (note.versions ?? []).find(
      (entry) => (entry as { id?: string }).id === versionId,
    ) as { title?: string; content?: string } | undefined;

    if (!version) {
      throw new NotFoundException({ detail: 'Version not found.' });
    }

    return this.updateNote(userId, noteId, {
      title: version.title,
      content: version.content,
    });
  }

  private applyFilters(notes: Note[], filterDto: NotesFilterDto) {
    const activeTab = filterDto.active_tab ?? 'all';
    const sidebarFilter = filterDto.sidebar_filter ?? 'all';

    return notes.filter((note) => {
      if (activeTab === 'archive') {
        if (note.status !== 'archived' && note.status !== 'deleted') {
          return false;
        }
      } else if (note.status === 'deleted') {
        if (sidebarFilter !== 'trash') return false;
      } else if (note.status === 'archived') {
        return false;
      } else if (sidebarFilter === 'trash') {
        return false;
      }

      if (activeTab !== 'all' && activeTab !== 'archive') {
        const expectedType = TAB_TO_NOTE_TYPE[activeTab];
        if (expectedType && note.note_type !== expectedType) return false;
      }

      if (sidebarFilter === 'favorites' && !note.is_favorite) return false;
      if (sidebarFilter === 'pinned' && !note.is_pinned) return false;
      if (sidebarFilter === 'reminders' && !note.reminder) return false;
      if (sidebarFilter === 'attachments' && !(note.attachments?.length > 0)) {
        return false;
      }

      if (filterDto.search) {
        const q = filterDto.search.toLowerCase();
        const matches =
          note.title.toLowerCase().includes(q) ||
          note.content.toLowerCase().includes(q) ||
          (note.tags ?? []).some((tag) => tag.toLowerCase().includes(q)) ||
          note.category.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (
        filterDto.category &&
        filterDto.category !== 'all' &&
        note.category !== filterDto.category
      ) {
        return false;
      }

      if (
        filterDto.tag &&
        filterDto.tag !== 'all' &&
        !(note.tags ?? []).includes(filterDto.tag)
      ) {
        return false;
      }

      if (
        filterDto.priority &&
        filterDto.priority !== 'all' &&
        note.priority !== filterDto.priority
      ) {
        return false;
      }

      if (
        filterDto.status &&
        filterDto.status !== 'all' &&
        note.status !== filterDto.status
      ) {
        return false;
      }

      if (filterDto.favorite === true && !note.is_favorite) return false;
      if (filterDto.has_reminder === true && !note.reminder) return false;
      if (filterDto.has_attachment === true && !(note.attachments?.length > 0)) {
        return false;
      }
      if (filterDto.ai_generated === true && !note.is_ai_generated) {
        return false;
      }

      return true;
    });
  }

  private sortNotes(notes: Note[], field: string, order: string) {
    const sorted = [...notes].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) {
        return a.is_pinned ? -1 : 1;
      }

      let cmp = 0;
      if (field === 'title') {
        cmp = a.title.localeCompare(b.title);
      } else if (field === 'priority') {
        cmp =
          (PRIORITY_ORDER[a.priority] ?? 99) -
          (PRIORITY_ORDER[b.priority] ?? 99);
      } else if (field === 'created_at') {
        cmp = a.created_at.getTime() - b.created_at.getTime();
      } else {
        cmp = a.updated_at.getTime() - b.updated_at.getTime();
      }

      return order === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }

  private buildStats(notes: Note[]) {
    const active = notes.filter(
      (note) => note.status !== 'deleted' && note.status !== 'archived',
    );
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const tagCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};

    active.forEach((note) => {
      (note.tags ?? []).forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
      });
      categoryCounts[note.category] = (categoryCounts[note.category] ?? 0) + 1;
    });

    const journalDates = new Set(
      notes
        .filter((note) => note.note_type === 'daily-journal')
        .map((note) => note.created_at.toISOString().split('T')[0]),
    );

    return {
      total_notes: active.length,
      notes_this_week: active.filter((note) => note.created_at >= weekAgo)
        .length,
      ideas_created: active.filter((note) => note.note_type === 'ideas').length,
      research_completed: active.filter(
        (note) => note.note_type === 'research' && note.status === 'completed',
      ).length,
      books_read: active.filter(
        (note) => note.note_type === 'book-notes' && note.status === 'completed',
      ).length,
      journal_streak: journalDates.size,
      decision_accuracy: 0,
      top_tags: Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      category_distribution: Object.entries(categoryCounts)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
    };
  }

  private collectTags(notes: Note[]) {
    return [...new Set(notes.flatMap((note) => note.tags ?? []))].sort();
  }

  private collectCategories(notes: Note[]) {
    return [...new Set(notes.map((note) => note.category))].sort();
  }

  private buildSidebarCounts(notes: Note[]) {
    const active = notes.filter((note) => note.status === 'active');
    return {
      all: active.length,
      favorites: active.filter((note) => note.is_favorite).length,
      pinned: active.filter((note) => note.is_pinned).length,
      reminders: active.filter((note) => note.reminder).length,
      attachments: active.filter((note) => (note.attachments?.length ?? 0) > 0)
        .length,
      trash: notes.filter((note) => note.status === 'deleted').length,
    };
  }

  private async findOwnedNote(userId: string, noteId: string) {
    const note = await this.noteRepository.findOne({
      where: { id: noteId, user_id: userId },
    });

    if (!note) {
      throw new NotFoundException({ detail: 'Note not found.' });
    }

    return note;
  }

  private serializeNote(note: Note) {
    return {
      id: note.id,
      title: note.title,
      content: note.content,
      note_type: note.note_type,
      category: note.category,
      tags: note.tags ?? [],
      priority: note.priority,
      is_favorite: note.is_favorite,
      is_pinned: note.is_pinned,
      color: note.color,
      status: note.status,
      attachments: note.attachments ?? [],
      created_at: note.created_at.toISOString(),
      updated_at: note.updated_at.toISOString(),
      reminder: note.reminder?.toISOString() ?? null,
      linked_items: note.linked_items ?? [],
      visibility: note.visibility,
      is_locked: note.is_locked,
      is_ai_generated: note.is_ai_generated,
      metadata: note.metadata ?? {},
      versions: (note.versions ?? []).map((version) => {
        const entry = version as Record<string, unknown>;
        return {
          id: entry.id,
          title: entry.title,
          content: entry.content,
          created_at: entry.created_at ?? entry.timestamp,
        };
      }),
      activity: (note.activity ?? []).map((item) => {
        const entry = item as Record<string, unknown>;
        return {
          id: entry.id,
          action: entry.action,
          timestamp: entry.timestamp,
        };
      }),
    };
  }
}
