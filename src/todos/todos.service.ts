import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { CategoriesService } from '../categories/categories.service';
import { DatabaseService } from '../database/database.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';

const MAX_TODOS_PER_CATEGORY = 5;

const TODO_SELECT = `
  SELECT
    t.id,
    t.text,
    t.category_id,
    t.completed,
    t.created_at,
    c.name AS category_name
  FROM todos t
  INNER JOIN categories c ON c.id = t.category_id
`;

interface TodoRow {
  id: number;
  text: string;
  category_id: number;
  completed: number;
  created_at: string;
  category_name: string;
}

export interface TodoResponse {
  id: number;
  text: string;
  categoryId: number;
  categoryName: string;
  completed: boolean;
  createdAt: string;
}

@Injectable()
export class TodosService implements OnModuleInit {
  constructor(
    private readonly db: DatabaseService,
    private readonly categoriesService: CategoriesService,
  ) {}

  onModuleInit(): void {
    this.migrateTodosTableIfNeeded();

    this.db.getDb().exec(`
      CREATE TABLE IF NOT EXISTS todos (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        text        TEXT    NOT NULL,
        category_id INTEGER NOT NULL REFERENCES categories(id),
        completed   INTEGER NOT NULL DEFAULT 0,
        created_at  TEXT    DEFAULT (datetime('now'))
      );
    `);
  }

  private migrateTodosTableIfNeeded(): void {
    const columns = this.db
      .getDb()
      .prepare('PRAGMA table_info(todos)')
      .all() as { name: string }[];

    const hasLegacyCategory = columns.some((c) => c.name === 'category');
    const hasCategoryId = columns.some((c) => c.name === 'category_id');

    if (!hasLegacyCategory || hasCategoryId) {
      return;
    }

    this.db.getDb().exec('DROP TABLE IF EXISTS todos');
  }

  findAll(categoryId?: number): TodoResponse[] {
    const rows = categoryId
      ? this.query<TodoRow>(
          `${TODO_SELECT} WHERE t.category_id = ? ORDER BY t.created_at DESC`,
          [categoryId],
        )
      : this.query<TodoRow>(
          `${TODO_SELECT} ORDER BY t.created_at DESC`,
        );
    return rows.map((row) => this.toResponse(row));
  }

  create(dto: CreateTodoDto): TodoResponse {
    if (!this.categoriesService.findRowById(dto.categoryId)) {
      throw new NotFoundException(
        `Category with id ${dto.categoryId} not found`,
      );
    }

    const countRow = this.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM todos WHERE category_id = ?',
      [dto.categoryId],
    )[0];

    if (countRow.count >= MAX_TODOS_PER_CATEGORY) {
      throw new BadRequestException(
        'This category already has 5 tasks. Maximum limit reached.',
      );
    }

    const result = this.run(
      'INSERT INTO todos (text, category_id) VALUES (?, ?)',
      [dto.text, dto.categoryId],
    );

    const row = this.findRowById(Number(result.lastInsertRowid));
    if (!row) {
      throw new Error('Failed to create todo');
    }
    return this.toResponse(row);
  }

  update(id: number, dto: UpdateTodoDto): TodoResponse {
    const existing = this.findRowById(id);
    if (!existing) {
      throw new NotFoundException(`Todo with id ${id} not found`);
    }

    const completedInt = dto.completed ? 1 : 0;
    this.run('UPDATE todos SET completed = ? WHERE id = ?', [completedInt, id]);

    const updated = this.findRowById(id);
    if (!updated) {
      throw new NotFoundException(`Todo with id ${id} not found`);
    }
    return this.toResponse(updated);
  }

  remove(id: number): { message: string } {
    const existing = this.findRowById(id);
    if (!existing) {
      throw new NotFoundException(`Todo with id ${id} not found`);
    }

    this.run('DELETE FROM todos WHERE id = ?', [id]);
    return { message: 'Todo deleted successfully' };
  }

  private findRowById(id: number): TodoRow | undefined {
    return this.query<TodoRow>(`${TODO_SELECT} WHERE t.id = ?`, [id])[0];
  }

  private query<T>(sql: string, params: unknown[] = []): T[] {
    return this.db.getDb().prepare(sql).all(...params) as T[];
  }

  private run(sql: string, params: unknown[] = []) {
    return this.db.getDb().prepare(sql).run(...params);
  }

  private toResponse(row: TodoRow): TodoResponse {
    return {
      id: row.id,
      text: row.text,
      categoryId: row.category_id,
      categoryName: row.category_name,
      completed: row.completed === 1,
      createdAt: row.created_at,
    };
  }
}
