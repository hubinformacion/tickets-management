import { db } from "@/db";
import { ticketCategories, ticketSubcategories, appSettings, attentionAreas, priorityConfig, providers } from "@/db/schema";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // 1. Seed Attention Areas (must be before categories for FK reference)
    console.log("🎯 Seeding attention areas...");
    const attentionAreasList = await db.insert(attentionAreas).values([
      {
        name: "Tecnologías y Sistemas de Información",
        slug: "TSI",
        isAcceptingTickets: true,
        businessStartTime: "08:30",
        businessEndTime: "18:30",
        businessDays: "1,2,3,4,5",
      },
      {
        name: "Fondo Editorial",
        slug: "FED",
        isAcceptingTickets: false,
        businessStartTime: "08:30",
        businessEndTime: "16:00",
        businessDays: "1,2,3,4,5",
      },
      {
        name: "Difusión",
        slug: "DIF",
        isAcceptingTickets: false,
        businessStartTime: "08:30",
        businessEndTime: "18:30",
        businessDays: "1,2,3,4,5",
      }
    ]).onConflictDoNothing().returning({ id: attentionAreas.id, name: attentionAreas.name });

    console.log(`✅ Created ${attentionAreasList.length} attention areas`);

    // Get TSI area ID for linking categories
    const tsiArea = attentionAreasList.find(a => a.name.includes("Tecnologías"));

    // 2. Seed Categories (linked to attention areas)
    console.log("📁 Seeding categories...");
    const categories = await db.insert(ticketCategories).values([
      {
        name: "Sistema de Gestión Bibliotecaria",
        description: "Problemas del sistema bibliotecario",
        displayOrder: 1,
        attentionAreaId: tsiArea?.id ?? null,
      },
      {
        name: "Plataformas Web",
        description: "Problemas de las diferentes páginas web",
        displayOrder: 2,
        attentionAreaId: tsiArea?.id ?? null,
      },
      {
        name: "Sistematización y Reportería",
        description: "Problemas referentes a la reportería",
        displayOrder: 3,
        attentionAreaId: tsiArea?.id ?? null,
      },
    ]).returning({ id: ticketCategories.id, name: ticketCategories.name });

    console.log(`✅ Created ${categories.length} categories`);

    // 3. Seed Subcategories
    console.log("📂 Seeding subcategories...");
    const subcategories = await db.insert(ticketSubcategories).values([
      // Sistema de Gestión Bibliotecaria
      {
        categoryId: categories[0].id,
        name: "Catálogo en línea - Descubridor (Primo)",
        description: "Problemas con el catálogo en línea",
        displayOrder: 1
      },
      {
        categoryId: categories[0].id,
        name: "Autopréstamo",
        description: "Problemas con el autopréstamo",
        displayOrder: 2
      },
      {
        categoryId: categories[0].id,
        name: "Accesos/Permisos",
        description: "Problemas con los accesos y permisos",
        displayOrder: 3
      },

      // Plataformas Web
      {
        categoryId: categories[1].id,
        name: "Repositorio Institucional",
        description: "Problemas con el repositorio institucional",
        displayOrder: 1
      },
      {
        categoryId: categories[1].id,
        name: "Sitio Web Hub de Información",
        description: "Problemas con el sitio web de la institución",
        displayOrder: 2
      },
      {
        categoryId: categories[1].id,
        name: "Sitio Web Fondo Editorial",
        description: "Problemas con el sitio web del fondo editorial",
        displayOrder: 3
      },

      // Sistematización y Reportería
      {
        categoryId: categories[2].id,
        name: "Automatización de proceso y/o archivo",
        description: "Problemas con la automatización de procesos y/o archivos",
        displayOrder: 1
      },
      {
        categoryId: categories[2].id,
        name: "Actualización y/o normalización de formularios",
        description: "Problemas con la actualización y/o normalización de formularios",
        displayOrder: 2
      },
    ]).returning();

    console.log(`✅ Created ${subcategories.length} subcategories`);

    // 4. Seed App Settings
    console.log("⚙️  Seeding app settings...");
    await db.insert(appSettings).values([
      {
        key: "allow_new_tickets",
        value: "true"
      },
      {
        key: "ticket_disabled_message",
        value: "Estamos en mantenimiento. Por favor, inténtelo más tarde."
      },
      {
        key: "knowledge_base_url",
        value: "https://docs.google.com/spreadsheets/d/140VQoMEDkztJ1vmJ68ULwKlQ1y1BdQixU5w7AGZ5QZ4/"
      },
    ]).onConflictDoNothing();

    console.log("✅ App settings configured");

    // 5. Seed Priority Config (4 priorities × 3 areas = 12 rows)
    console.log("🎯 Seeding priority config...");
    const priorityDefaults = [
      { priority: "low", description: "Consultas generales, solicitudes de información o problemas menores que no afectan el funcionamiento.", slaHours: 120 },
      { priority: "medium", description: "Incidencias que afectan parcialmente el trabajo pero permiten continuar operando.", slaHours: 48 },
      { priority: "high", description: "Problemas que impiden realizar tareas críticas o afectan a múltiples usuarios.", slaHours: 24 },
      { priority: "critical", description: "Interrupción total del servicio, caída de sistemas o situaciones que requieren acción inmediata.", slaHours: 1 },
    ];

    const priorityConfigRows = attentionAreasList.flatMap(area =>
      priorityDefaults.map(p => ({
        attentionAreaId: area.id,
        priority: p.priority,
        description: p.description,
        slaHours: p.slaHours,
      }))
    );

    await db.insert(priorityConfig).values(priorityConfigRows).onConflictDoNothing();
    console.log(`✅ Created ${priorityConfigRows.length} priority config entries`);

    // 6. Seed Providers (per area)
    console.log("🏢 Seeding providers...");
    const tsiAreaForProviders = attentionAreasList.find(a => a.name.includes("Tecnologías"));
    const difAreaForProviders = attentionAreasList.find(a => a.name.includes("Difusión"));

    const providerValues = [
      // TSI providers
      ...(tsiAreaForProviders ? [
        { name: "Elogim", attentionAreaId: tsiAreaForProviders.id },
        { name: "Exlibris", attentionAreaId: tsiAreaForProviders.id },
        { name: "Intelego", attentionAreaId: tsiAreaForProviders.id },
      ] : []),
      // Difusión providers
      ...(difAreaForProviders ? [
        { name: "Comunicación al Estudiante (DSEE)", attentionAreaId: difAreaForProviders.id },
        { name: "Experiencia de Marca y Producto", attentionAreaId: difAreaForProviders.id },
        { name: "Audiovisual", attentionAreaId: difAreaForProviders.id },
        { name: "Gestión Docente", attentionAreaId: difAreaForProviders.id },
        { name: "Fondo Editorial", attentionAreaId: difAreaForProviders.id },
      ] : []),
    ];

    if (providerValues.length > 0) {
      await db.insert(providers).values(providerValues).onConflictDoNothing();
    }
    console.log(`✅ Created ${providerValues.length} providers`);

    console.log("\n🎉 Database seeded successfully!");
    console.log("\n📝 Next steps:");
    console.log("   1. Login with Google using your account");
    console.log("   2. Promote to admin if needed:");
    console.log("      UPDATE \"user\" SET role = 'admin' WHERE email = 'your-email';");

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

seed()
  .then(() => {
    console.log("✨ Seed complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
