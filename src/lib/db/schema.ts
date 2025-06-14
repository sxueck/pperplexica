import { sql } from 'drizzle-orm';
import { text, integer, sqliteTable } from 'drizzle-orm/sqlite-core';

export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey(),
  content: text('content').notNull(),
  chatId: text('chatId').notNull(),
  messageId: text('messageId').notNull(),
  role: text('type', { enum: ['assistant', 'user'] }),
  metadata: text('metadata', {
    mode: 'json',
  }),
});

interface File {
  name: string;
  fileId: string;
}

export const chats = sqliteTable('chats', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: text('createdAt').notNull(),
  focusMode: text('focusMode').notNull(),
  files: text('files', { mode: 'json' })
    .$type<File[]>()
    .default(sql`'[]'`),
});

export const sharedEntries = sqliteTable('shared_entries', {
  id: text('id').primaryKey(),
  chatId: text('chatId').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  createdAt: text('createdAt').notNull(),
  author: text('author').notNull(),
  spaceSharing: integer('spaceSharing', { mode: 'boolean' }).notNull().default(true),
  category: text('category'),
  subcategory: text('subcategory'),
});
