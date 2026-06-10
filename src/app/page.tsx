import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gestión de tickets",
  description: "Sistema de gestión de tickets y atención al usuario",
};

export default function HomePage() {
  redirect("/login");
}
