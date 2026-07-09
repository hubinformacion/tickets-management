"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "./config-form";
import { AgentCategoriesManagement } from "@/components/agent/categories-management";
import { AgentSubcategoriesManagement } from "@/components/agent/subcategories-management";
import { AgentPriorityConfig } from "@/components/agent/priority-config";
import { AgentProvidersManagement } from "@/components/agent/providers-management";

interface Category {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
  attentionAreaId?: number | null;
  subcategories?: {
    id: number;
    name: string;
    isActive: boolean;
  }[];
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

interface SettingsTabsProps {
  initialData: {
    isAcceptingTickets: boolean;
    businessStartTime: string;
    businessEndTime: string;
    businessDays: string;
  };
  categories: Category[];
  subcategories: Subcategory[];
  areaId: number;
  priorityConfigs: PriorityConfigItem[];
  providers: ProviderItem[];
}

export function SettingsTabs({ initialData, categories, subcategories, priorityConfigs, providers }: SettingsTabsProps) {
  return (
    <Tabs defaultValue="reception" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="reception" className="cursor-pointer">Recepción</TabsTrigger>
        <TabsTrigger value="categories" className="cursor-pointer">Categorías</TabsTrigger>
        <TabsTrigger value="subcategories" className="cursor-pointer">Subcategorías</TabsTrigger>
        <TabsTrigger value="priorities" className="cursor-pointer">Prioridades</TabsTrigger>
        <TabsTrigger value="providers" className="cursor-pointer">Proveedores</TabsTrigger>
      </TabsList>

      <TabsContent value="reception" className="mt-6">
        <SettingsForm initialData={initialData} />
      </TabsContent>

      <TabsContent value="categories" className="mt-6">
        <AgentCategoriesManagement categories={categories} />
      </TabsContent>

      <TabsContent value="subcategories" className="mt-6">
        <AgentSubcategoriesManagement
          subcategories={subcategories}
          categories={categories}
        />
      </TabsContent>

      <TabsContent value="priorities" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Prioridades de tu área</CardTitle>
            <CardDescription>
              Configura la descripción y el tiempo de atención (SLA) de cada nivel de prioridad
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AgentPriorityConfig priorityConfigs={priorityConfigs} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="providers" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Proveedores de tu área</CardTitle>
            <CardDescription>
              Gestiona los proveedores externos asociados a tu área de atención
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AgentProvidersManagement providers={providers} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
