"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "@/components/admin/settings-form";
import { AdminCategoriesManagement as CategoriesManagement } from "@/components/admin/categories-management";
import { SubcategoriesManagement } from "@/components/admin/subcategories-management";
import { Tag, Grid3x3, Settings } from "lucide-react";
import { Gauge, Share2 } from "lucide-react";

interface Category {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
}

interface Subcategory {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
  category?: {
    id: number;
    name: string;
  };
}

import { AttentionAreasList } from "@/components/admin/attention-areas-list";
import { PriorityConfigManagement } from "@/components/admin/priority-config-management";
import { ProvidersManagement } from "@/components/admin/providers-management";

interface AttentionArea {
  id: number;
  name: string;
  slug: string;
  isAcceptingTickets: boolean;
  businessStartTime: string;
  businessEndTime: string;
}

interface PriorityConfigItem {
  id: number;
  attentionAreaId: number;
  priority: string;
  description: string;
  slaHours: number;
}

interface ProviderItem {
  id: number;
  name: string;
  attentionAreaId: number;
  isActive: boolean;
}

interface AdminSettingsTabsProps {
  initialAllowNewTickets: boolean;
  initialDisabledMessage?: string;
  initialKnowledgeBaseUrl?: string;
  initialCategories: Category[];
  initialSubcategories: Subcategory[];
  initialAttentionAreas: AttentionArea[];
  initialPriorityConfigs: PriorityConfigItem[];
  initialProviders: ProviderItem[];
}

export function AdminSettingsTabs({
  initialAllowNewTickets,
  initialDisabledMessage,
  initialKnowledgeBaseUrl,
  initialCategories,
  initialSubcategories,
  initialAttentionAreas,
  initialPriorityConfigs,
  initialProviders,
}: AdminSettingsTabsProps) {
  return (
    <Tabs defaultValue="general" className="space-y-4">
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger value="general" className="cursor-pointer">General</TabsTrigger>
        <TabsTrigger value="categories" className="cursor-pointer">
          <Tag className="h-4 w-4 mr-2" />
          Categorías
        </TabsTrigger>
        <TabsTrigger value="subcategories" className="cursor-pointer">
          <Grid3x3 className="h-4 w-4 mr-2" />
          Subcategorías
        </TabsTrigger>
        <TabsTrigger value="attention-areas" className="cursor-pointer">
          <Settings className="h-4 w-4 mr-2" />
          Áreas
        </TabsTrigger>
        <TabsTrigger value="priorities" className="cursor-pointer">
          <Gauge className="h-4 w-4 mr-2" />
          Prioridades
        </TabsTrigger>
        <TabsTrigger value="providers" className="cursor-pointer">
          <Share2 className="h-4 w-4 mr-2" />
          Proveedores
        </TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Configuración general</CardTitle>
            <CardDescription>
              Administra las opciones globales de la aplicación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsForm
              initialAllowNewTickets={initialAllowNewTickets}
              initialDisabledMessage={initialDisabledMessage}
              initialKnowledgeBaseUrl={initialKnowledgeBaseUrl}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="categories" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Categorías de tickets</CardTitle>
            <CardDescription>
              Gestiona las categorías principales para clasificar los tickets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CategoriesManagement
              initialCategories={initialCategories}
              attentionAreas={initialAttentionAreas}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="subcategories" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Subcategorías de tickets</CardTitle>
            <CardDescription>
              Gestiona las subcategorías para cada categoría principal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubcategoriesManagement
              initialSubcategories={initialSubcategories}
              categories={initialCategories}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="attention-areas" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Áreas de atención</CardTitle>
            <CardDescription>
              Gestiona las áreas responsables de resolver tickets (TSI, Fondo Editorial, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AttentionAreasList areas={initialAttentionAreas} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="priorities" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Prioridades por área</CardTitle>
            <CardDescription>
              Configura la descripción y el tiempo de atención (SLA) de cada nivel de prioridad para cada área
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PriorityConfigManagement
              priorityConfigs={initialPriorityConfigs}
              attentionAreas={initialAttentionAreas}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="providers" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Proveedores por área</CardTitle>
            <CardDescription>
              Gestiona los proveedores externos asociados a cada área de atención
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProvidersManagement
              providers={initialProviders}
              attentionAreas={initialAttentionAreas}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
