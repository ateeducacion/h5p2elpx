import type { NormalizedNode } from "../nodes.ts";
import { uniqueId } from "../../utils/slug.ts";

export const machineName = "H5P.ImageSequencing";

/** H5P.ImageSequencing content.json: { taskDescription, imageTasks: [ { image:{path}, imageDescription } ] } */
export function adapt(content: any): NormalizedNode {
  const tasks: any[] = Array.isArray(content?.imageTasks) ? content.imageTasks : [];
  const task = typeof content?.taskDescription === "string" ? content.taskDescription : "";
  const list = tasks
    .map((t, i) => {
      const path = typeof t?.image?.path === "string" ? t.image.path : "";
      const desc = typeof t?.imageDescription === "string" ? t.imageDescription : "";
      const img = path ? `<img src="${path}" alt="${desc}" />` : "";
      return `<li><strong>${i + 1}.</strong> ${img} ${desc}</li>`;
    })
    .join("\n");
  return {
    id: uniqueId("is"),
    sourceType: machineName,
    kind: "text",
    html: [
      task ? `<p>${task}</p>` : "",
      tasks.length > 0
        ? `<p><em>(Correct order — author should re-scramble in eXe.)</em></p><ol>${list}</ol>`
        : "<p>(empty)</p>"
    ]
      .filter(Boolean)
      .join("\n")
  };
}
