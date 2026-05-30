import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

interface CategoryRow {
  id: number;
  name: string;
  created_at: string;
}

export interface CategoryResponse {
  id: number;
  name: string;
  createdAt: string;
}

@Injectable()
export class CategoriesService implements OnModuleInit {
  constructor(private readonly db: DatabaseService) {}

  onModuleInit(): void {
    this.db.getDb().exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT    NOT NULL UNIQUE,
        created_at TEXT    DEFAULT (datetime('now'))
      );
    `);
  }

  findAll(): CategoryResponse[] {
    const rows = this.query<CategoryRow>(
      'SELECT id, name, created_at FROM categories ORDER BY name ASC',
    );
    return rows.map((row) => this.toResponse(row));
  }

  findOne(id: number): CategoryResponse {
    const row = this.findRowById(id);
    if (!row) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
    return this.toResponse(row);
  }

  findRowById(id: number): CategoryRow | undefined {
    return this.query<CategoryRow>(
      'SELECT id, name, created_at FROM categories WHERE id = ?',
      [id],
    )[0];
  }

  create(dto: CreateCategoryDto): CategoryResponse {
    const existing = this.query<CategoryRow>(
      'SELECT id FROM categories WHERE name = ?',
      [dto.name],
    )[0];
    if (existing) {
      throw new ConflictException('Category with this name already exists');
    }

    const result = this.run('INSERT INTO categories (name) VALUES (?)', [
      dto.name,
    ]);

    const row = this.findRowById(Number(result.lastInsertRowid));
    if (!row) {
      throw new Error('Failed to create category');
    }
    return this.toResponse(row);
  }

  update(id: number, dto: UpdateCategoryDto): CategoryResponse {
    const existing = this.findRowById(id);
    if (!existing) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }

    const nameTaken = this.query<CategoryRow>(
      'SELECT id FROM categories WHERE name = ? AND id != ?',
      [dto.name, id],
    )[0];
    if (nameTaken) {
      throw new ConflictException('Category with this name already exists');
    }

    this.run('UPDATE categories SET name = ? WHERE id = ?', [dto.name, id]);

    const updated = this.findRowById(id);
    if (!updated) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
    return this.toResponse(updated);
  }

  remove(id: number): { message: string } {
    const existing = this.findRowById(id);
    if (!existing) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }

    const todoCount = this.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM todos WHERE category_id = ?',
      [id],
    )[0];

    if (todoCount.count > 0) {
      throw new BadRequestException(
        'Cannot delete category that has todos',
      );
    }

    this.run('DELETE FROM categories WHERE id = ?', [id]);
    return { message: 'Category deleted successfully' };
  }

  private query<T>(sql: string, params: unknown[] = []): T[] {
    return this.db.getDb().prepare(sql).all(...params) as T[];
  }

  private run(sql: string, params: unknown[] = []) {
    return this.db.getDb().prepare(sql).run(...params);
  }

  private toResponse(row: CategoryRow): CategoryResponse {
    return {
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
    };
  }
}
