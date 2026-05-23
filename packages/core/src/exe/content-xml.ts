import { XMLBuilder } from "fast-xml-parser";
import type { ElpxProject } from "./model.ts";
import { wrapCdata } from "./cdata.ts";

/**
 * Build a self-contained `content.xml` for the elpx package.
 *
 * NOTE: real eXeLearning uses a binary/pickled-style content node tree.
 * This writer emits a clean, validated XML representation of our model
 * that round-trips through `parseContentXml`. When a real eXeLearning
 * template is provided, `elpx-writer.ts` injects the original template
 * files alongside this h5p2elpx-content.xml so users can still open the
 * project in eXeLearning while preserving the full conversion data.
 */

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: true,
  indentBy: "  ",
  suppressEmptyNode: true,
  cdataPropName: "__cdata"
});

export function buildContentXml(project: ElpxProject): string {
  const doc = {
    "?xml": { "@_version": "1.0", "@_encoding": "UTF-8" },
    elpx: {
      "@_version": "1",
      "@_tool": "h5p2elpx",
      project: {
        "@_id": project.id,
        title: { __cdata: project.title },
        ...(project.language ? { language: project.language } : {}),
        pages: {
          page: project.pages
            .sort((a, b) => a.order - b.order)
            .map((page) => ({
              "@_id": page.id,
              "@_order": page.order,
              ...(page.parentId ? { "@_parent": page.parentId } : {}),
              title: { __cdata: page.title },
              blocks: {
                block: page.blocks
                  .sort((a, b) => a.order - b.order)
                  .map((block) => ({
                    "@_id": block.id,
                    "@_order": block.order,
                    iDevices: {
                      iDevice: block.iDevices
                        .sort((a, b) => a.order - b.order)
                        .map((idev) => ({
                          "@_id": idev.id,
                          "@_typeName": idev.typeName,
                          "@_order": idev.order,
                          ...(idev.visibility === false
                            ? { "@_visibility": "false" }
                            : {}),
                          ...(idev.title ? { title: { __cdata: idev.title } } : {}),
                          htmlView: { __cdata: idev.htmlView },
                          jsonProperties: {
                            __cdata: JSON.stringify(idev.jsonProperties ?? {})
                          }
                        }))
                    }
                  }))
              }
            }))
        }
      }
    }
  };
  return builder.build(doc);
}

export const CONTENT_DTD = `<?xml version="1.0" encoding="UTF-8"?>
<!ELEMENT elpx (project)>
<!ATTLIST elpx version CDATA #REQUIRED tool CDATA #IMPLIED>
<!ELEMENT project (title, language?, pages)>
<!ATTLIST project id ID #REQUIRED>
<!ELEMENT title (#PCDATA)>
<!ELEMENT language (#PCDATA)>
<!ELEMENT pages (page+)>
<!ELEMENT page (title, blocks)>
<!ATTLIST page id ID #REQUIRED order CDATA #REQUIRED parent IDREF #IMPLIED>
<!ELEMENT blocks (block+)>
<!ELEMENT block (iDevices)>
<!ATTLIST block id ID #REQUIRED order CDATA #REQUIRED>
<!ELEMENT iDevices (iDevice+)>
<!ELEMENT iDevice (title?, htmlView, jsonProperties)>
<!ATTLIST iDevice id ID #REQUIRED typeName CDATA #REQUIRED order CDATA #REQUIRED visibility CDATA #IMPLIED>
<!ELEMENT htmlView (#PCDATA)>
<!ELEMENT jsonProperties (#PCDATA)>
`;

// Re-export for callers that want raw CDATA helper
export { wrapCdata };
