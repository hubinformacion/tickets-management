export function readCatalogFields(formData: FormData) {
  const active = formData.get("isActive");
  return {
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    isActive: active === "true" ? true : active === "false" ? false : active,
  };
}
