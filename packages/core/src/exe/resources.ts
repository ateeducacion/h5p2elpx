import type { ElpxResource } from "./model.ts";

export function dedupeResources(resources: ElpxResource[]): ElpxResource[] {
  const map = new Map<string, ElpxResource>();
  for (const r of resources) map.set(r.path, r);
  return Array.from(map.values());
}
