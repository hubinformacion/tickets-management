import { asc, and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { attentionAreas, ticketCategories, ticketSubcategories, tickets } from "@/db/schema";
import { categoryMutationSchema, subcategoryMutationSchema } from "@/lib/validation/schemas";

type CatalogTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type CatalogScope = { role: "admin" } | { role: "agent"; areaId: number };
class CatalogError extends Error {}

function areaCondition(areaId: number | null) {
  return areaId === null ? isNull(ticketCategories.attentionAreaId) : eq(ticketCategories.attentionAreaId, areaId);
}

async function categoryFor(tx: CatalogTransaction, scope: CatalogScope, id: number) {
  const category = await tx.query.ticketCategories.findFirst({ where: eq(ticketCategories.id, id) });
  if (!category || (scope.role === "agent" && category.attentionAreaId !== scope.areaId)) {
    throw new CatalogError("Categoría no encontrada o no autorizada");
  }
  return category;
}

async function subcategoryFor(tx: CatalogTransaction, scope: CatalogScope, id: number) {
  const subcategory = await tx.query.ticketSubcategories.findFirst({ where: eq(ticketSubcategories.id, id) });
  if (!subcategory) throw new CatalogError("Subcategoría no encontrada o no autorizada");
  await categoryFor(tx, scope, subcategory.categoryId);
  return subcategory;
}

async function categoryInUse(tx: CatalogTransaction, id: number) {
  const children = await tx.query.ticketSubcategories.findMany({ where: eq(ticketSubcategories.categoryId, id), columns: { id: true } });
  return tx.query.tickets.findFirst({
    where: or(eq(tickets.categoryId, id), children.length ? inArray(tickets.subcategoryId, children.map(child => child.id)) : undefined),
    columns: { id: true },
  });
}

async function subcategoryInUse(tx: CatalogTransaction, id: number) {
  return tx.query.tickets.findFirst({ where: eq(tickets.subcategoryId, id), columns: { id: true } });
}

async function categoryRows(tx: CatalogTransaction, areaId: number | null) {
  return tx.query.ticketCategories.findMany({ where: areaCondition(areaId), orderBy: [asc(ticketCategories.displayOrder), asc(ticketCategories.id)] });
}

async function subcategoryRows(tx: CatalogTransaction, categoryId: number) {
  return tx.query.ticketSubcategories.findMany({ where: eq(ticketSubcategories.categoryId, categoryId), orderBy: [asc(ticketSubcategories.displayOrder), asc(ticketSubcategories.id)] });
}

function nextOrder(rows: { displayOrder: number }[]) {
  const order = rows.reduce((max, row) => Math.max(max, row.displayOrder), 0) + 1;
  if (order > 2147483647) throw new CatalogError("El orden del catálogo excede el límite permitido");
  return order;
}

async function moveRows(
  rows: { id: number; displayOrder: number }[], id: number, direction: "up" | "down",
  write: (id: number, order: number) => Promise<void>,
) {
  const index = rows.findIndex(row => row.id === id);
  const destination = index + (direction === "up" ? -1 : 1);
  if (index < 0 || destination < 0 || destination >= rows.length) {
    throw new CatalogError(direction === "up" ? "No se puede mover más arriba" : "No se puede mover más abajo");
  }
  [rows[index], rows[destination]] = [rows[destination], rows[index]];
  // Un orden estable por ID permite mover también grupos con empates antiguos.
  for (const [position, row] of rows.entries()) {
    if (row.displayOrder !== position + 1) await write(row.id, position + 1);
  }
}

async function mutate(task: (tx: CatalogTransaction) => Promise<void>) {
  try {
    await db.transaction(async tx => {
      // Un único dominio pequeño de catálogos evita carreras e interbloqueos entre grupos.
      // Se libera automáticamente al terminar la transacción; no depende de la sesión del pool.
      await tx.execute(sql`select pg_advisory_xact_lock(794203, 1)`);
      await task(tx);
    }, { isolationLevel: "read committed" });
    for (const route of ["/dashboard/sistema", "/dashboard/configuracion", "/dashboard/tickets/nuevo"]) revalidatePath(route);
    return { success: true };
  } catch (error) {
    if (error instanceof CatalogError) return { error: error.message };
    console.error("No se pudo confirmar la operación del catálogo");
    return { error: "No se pudo actualizar el catálogo. Intenta de nuevo." };
  }
}

export async function mutateCategory(scope: CatalogScope, input: unknown) {
  const parsed = categoryMutationSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos de categoría inválidos" };
  const command = parsed.data;
  return mutate(async tx => {
    if (command.operation === "create" || command.operation === "update") {
      if (scope.role === "agent" && command.attentionAreaId !== scope.areaId) throw new CatalogError("Área no autorizada");
      if (command.attentionAreaId !== null && !await tx.query.attentionAreas.findFirst({ where: eq(attentionAreas.id, command.attentionAreaId), columns: { id: true } })) {
        throw new CatalogError("Área no encontrada");
      }
    }
    if (command.operation === "create") {
      const rows = await categoryRows(tx, command.attentionAreaId);
      await tx.insert(ticketCategories).values({
        name: command.name, description: command.description || null, isActive: command.isActive,
        attentionAreaId: command.attentionAreaId, displayOrder: nextOrder(rows),
      });
      return;
    }
    const category = await categoryFor(tx, scope, command.id);
    if (command.operation === "update") {
      const moving = command.attentionAreaId !== category.attentionAreaId;
      if (moving && await categoryInUse(tx, category.id)) throw new CatalogError("La categoría está en uso y no se puede cambiar de área. Desactívala si corresponde.");
      const displayOrder = moving ? nextOrder(await categoryRows(tx, command.attentionAreaId)) : category.displayOrder;
      await tx.update(ticketCategories).set({
        name: command.name, description: command.description || null, isActive: command.isActive,
        attentionAreaId: command.attentionAreaId, displayOrder, updatedAt: new Date(),
      }).where(eq(ticketCategories.id, category.id));
    } else if (command.operation === "toggle") {
      await tx.update(ticketCategories).set({ isActive: command.newState ?? !category.isActive, updatedAt: new Date() }).where(eq(ticketCategories.id, category.id));
    } else if (command.operation === "delete") {
      if (await categoryInUse(tx, category.id)) throw new CatalogError("La categoría está en uso. Desactívala para conservar los tickets existentes.");
      await tx.delete(ticketCategories).where(eq(ticketCategories.id, category.id));
    } else {
      await moveRows(await categoryRows(tx, category.attentionAreaId), category.id, command.direction, async (id, displayOrder) => {
        await tx.update(ticketCategories).set({ displayOrder, updatedAt: new Date() }).where(and(eq(ticketCategories.id, id), areaCondition(category.attentionAreaId)));
      });
    }
  });
}

export async function mutateSubcategory(scope: CatalogScope, input: unknown) {
  const parsed = subcategoryMutationSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos de subcategoría inválidos" };
  const command = parsed.data;
  return mutate(async tx => {
    if (command.operation === "create") {
      await categoryFor(tx, scope, command.categoryId);
      await tx.insert(ticketSubcategories).values({
        name: command.name, description: command.description || null, isActive: command.isActive,
        categoryId: command.categoryId, displayOrder: nextOrder(await subcategoryRows(tx, command.categoryId)),
      });
      return;
    }
    const subcategory = await subcategoryFor(tx, scope, command.id);
    if (command.operation === "update") {
      await categoryFor(tx, scope, command.categoryId);
      const moving = command.categoryId !== subcategory.categoryId;
      if (moving && await subcategoryInUse(tx, subcategory.id)) throw new CatalogError("La subcategoría está en uso y no se puede cambiar de categoría. Desactívala si corresponde.");
      const displayOrder = moving ? nextOrder(await subcategoryRows(tx, command.categoryId)) : subcategory.displayOrder;
      await tx.update(ticketSubcategories).set({
        name: command.name, description: command.description || null, isActive: command.isActive,
        categoryId: command.categoryId, displayOrder, updatedAt: new Date(),
      }).where(eq(ticketSubcategories.id, subcategory.id));
    } else if (command.operation === "toggle") {
      await tx.update(ticketSubcategories).set({ isActive: command.newState ?? !subcategory.isActive, updatedAt: new Date() }).where(eq(ticketSubcategories.id, subcategory.id));
    } else if (command.operation === "delete") {
      if (await subcategoryInUse(tx, subcategory.id)) throw new CatalogError("La subcategoría está en uso. Desactívala para conservar los tickets existentes.");
      await tx.delete(ticketSubcategories).where(eq(ticketSubcategories.id, subcategory.id));
    } else {
      if (command.expectedCategoryId !== subcategory.categoryId) throw new CatalogError("La categoría cambió. Actualiza la página.");
      await moveRows(await subcategoryRows(tx, subcategory.categoryId), subcategory.id, command.direction, async (id, displayOrder) => {
        await tx.update(ticketSubcategories).set({ displayOrder, updatedAt: new Date() }).where(and(eq(ticketSubcategories.id, id), eq(ticketSubcategories.categoryId, subcategory.categoryId)));
      });
    }
  });
}
