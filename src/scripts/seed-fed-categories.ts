/**
 * Script de seed incremental para las categorías y subcategorías de Fondo Editorial.
 * ⚠️ NO destructivo — solo inserta si no existe (usa verificación por nombre + área).
 * Ejecutar: pnpm tsx src/scripts/seed-fed-categories.ts
 */

import { db } from "@/db";
import { ticketCategories, ticketSubcategories, attentionAreas } from "@/db/schema";
import { eq, and } from "drizzle-orm";

interface SubcategoryDef {
  name: string;
  description: string;
  displayOrder: number;
}

interface CategoryDef {
  name: string;
  description: string;
  displayOrder: number;
  subcategories: SubcategoryDef[];
}

const FED_CATEGORIES: CategoryDef[] = [
  {
    name: "Diseño",
    description: "Diseño gráfico, cubiertas, portadas y retoque de imágenes",
    displayOrder: 1,
    subcategories: [
      { name: "Diseño de pieza gráfica", description: "Diseño de piezas gráficas nuevas o correcciones", displayOrder: 1 },
      { name: "Diseño de cubierta", description: "Diseño de cubiertas para publicaciones", displayOrder: 2 },
      { name: "Portada de tesis", description: "Diseño de portadas para tesis", displayOrder: 3 },
      { name: "Retoque de imágenes", description: "Edición y retoque de imágenes", displayOrder: 4 },
    ],
  },
  {
    name: "Diagramación",
    description: "Diagramación de libros, revistas y material educativo",
    displayOrder: 2,
    subcategories: [
      { name: "Libro", description: "Diagramación de libros", displayOrder: 1 },
      { name: "Revista", description: "Diagramación de revistas", displayOrder: 2 },
      { name: "Material educativo", description: "Diagramación de material educativo", displayOrder: 3 },
    ],
  },
  {
    name: "Corrección de textos",
    description: "Corrección y cotejo de documentos, copys, guías y títulos de tesis",
    displayOrder: 3,
    subcategories: [
      { name: "Corrección de proyectos editoriales", description: "Corrección de textos de proyectos editoriales", displayOrder: 1 },
      { name: "Cotejo de pruebas", description: "Cotejo y revisión de pruebas de impresión", displayOrder: 2 },
      { name: "Corrección de copys/mailing", description: "Corrección de copys y contenido de mailing", displayOrder: 3 },
      { name: "Corrección de guías", description: "Corrección de guías y documentos académicos", displayOrder: 4 },
      { name: "Corrección de títulos de tesis", description: "Corrección y revisión de títulos de tesis", displayOrder: 5 },
    ],
  },
];

async function seedFedCategories() {
  console.log("🌱 Seeding Fondo Editorial categories...\n");

  // 1. Obtener el área de Fondo Editorial
  const fedArea = await db.query.attentionAreas.findFirst({
    where: eq(attentionAreas.slug, "FED"),
    columns: { id: true, name: true },
  });

  if (!fedArea) {
    console.error("❌ No se encontró el área de atención 'FED'. Ejecuta el seed principal primero.");
    process.exit(1);
  }

  console.log(`✅ Área encontrada: ${fedArea.name} (ID: ${fedArea.id})\n`);

  let categoriesCreated = 0;
  let subcategoriesCreated = 0;

  for (const catDef of FED_CATEGORIES) {
    // Verificar si la categoría ya existe para esta área
    const existing = await db.query.ticketCategories.findFirst({
      where: and(
        eq(ticketCategories.name, catDef.name),
        eq(ticketCategories.attentionAreaId, fedArea.id),
      ),
      columns: { id: true },
    });

    let categoryId: number;

    if (existing) {
      categoryId = existing.id;
      console.log(`  ⏭️  Categoría "${catDef.name}" ya existe (ID: ${categoryId})`);
    } else {
      const [newCategory] = await db.insert(ticketCategories).values({
        name: catDef.name,
        description: catDef.description,
        displayOrder: catDef.displayOrder,
        attentionAreaId: fedArea.id,
      }).returning({ id: ticketCategories.id });

      categoryId = newCategory.id;
      categoriesCreated++;
      console.log(`  ✅ Categoría "${catDef.name}" creada (ID: ${categoryId})`);
    }

    // Insertar subcategorías
    for (const subDef of catDef.subcategories) {
      const existingSub = await db.query.ticketSubcategories.findFirst({
        where: and(
          eq(ticketSubcategories.name, subDef.name),
          eq(ticketSubcategories.categoryId, categoryId),
        ),
        columns: { id: true },
      });

      if (existingSub) {
        console.log(`    ⏭️  Subcategoría "${subDef.name}" ya existe (ID: ${existingSub.id})`);
      } else {
        const [newSub] = await db.insert(ticketSubcategories).values({
          name: subDef.name,
          description: subDef.description,
          displayOrder: subDef.displayOrder,
          categoryId,
        }).returning({ id: ticketSubcategories.id });

        subcategoriesCreated++;
        console.log(`    ✅ Subcategoría "${subDef.name}" creada (ID: ${newSub.id})`);
      }
    }

    console.log();
  }

  console.log("─".repeat(50));
  console.log(`\n🎉 Seed completado:`);
  console.log(`   📁 Categorías creadas: ${categoriesCreated}`);
  console.log(`   📂 Subcategorías creadas: ${subcategoriesCreated}`);
}

seedFedCategories()
  .then(() => {
    console.log("\n✨ ¡Listo!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error fatal:", error);
    process.exit(1);
  });
