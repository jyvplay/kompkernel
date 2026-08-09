import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

// Persisted conversion history for the Neuralese Compiler.
export const conversions = pgTable("conversions", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(),
  output: text("output").notNull(),
  preset: text("preset").notNull().default("balanced"),
  inChars: integer("in_chars").notNull().default(0),
  outChars: integer("out_chars").notNull().default(0),
  charDeltaPct: integer("char_delta_pct").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Conversion = typeof conversions.$inferSelect;
export type NewConversion = typeof conversions.$inferInsert;
