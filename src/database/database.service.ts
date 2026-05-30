import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

export interface UserRow {
  id: number;
  email: string;
  password: string;
  created_at: string;
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private db!: Database.Database;

  private readonly dbPath = path.join(process.cwd(), 'data', 'app.db');

  onModuleInit(): void {
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.runMigrations();
  }

  onModuleDestroy(): void {
    this.db?.close();
  }

  getDb(): Database.Database {
    return this.db;
  }

  private runMigrations(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }

  findUserByEmail(email: string): UserRow | undefined {
    const stmt = this.db.prepare(
      'SELECT id, email, password, created_at FROM users WHERE email = ?',
    );
    return stmt.get(email) as UserRow | undefined;
  }

  findUserById(id: number): UserRow | undefined {
    const stmt = this.db.prepare(
      'SELECT id, email, password, created_at FROM users WHERE id = ?',
    );
    return stmt.get(id) as UserRow | undefined;
  }

  createUser(email: string, passwordHash: string): UserRow {
    const insert = this.db.prepare(
      'INSERT INTO users (email, password) VALUES (?, ?)',
    );
    const result = insert.run(email, passwordHash);
    const user = this.findUserById(Number(result.lastInsertRowid));
    if (!user) {
      throw new Error('Failed to create user');
    }
    return user;
  }
}
