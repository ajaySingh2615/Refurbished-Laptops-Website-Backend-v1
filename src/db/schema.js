import {
  serial,
  varchar,
  text,
  int,
  decimal,
  boolean,
  timestamp,
  mysqlTable,
} from "drizzle-orm/mysql-core";

export const products = mysqlTable("products", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  brand: varchar("brand", { length: 128 }).notNull(),
  cpu: varchar("cpu", { length: 128 }),
  ramGb: int("ram_gb"),
  storage: varchar("storage", { length: 128 }),
  condition: varchar("condition", { length: 64 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  inStock: boolean("in_stock").notNull().default(true),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
