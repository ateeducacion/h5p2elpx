import { XMLBuilder } from "fast-xml-parser";
import type { ElpxIdevice, ElpxProject } from "./model.ts";

/**
 * Build the real eXeLearning `content.xml` (ODE format, namespace
 * http://www.intef.es/xsd/ode, version 2.0). This is the XML eXeLearning
 * itself reads on import.
 *
 * Structure:
 *   <ode>
 *     <userPreferences/>
 *     <odeResources/>          ← project ids + version
 *     <odeProperties/>         ← title, lang, theme, ...
 *     <odeNavStructures>       ← one entry per page (nav sidebar)
 *       <odeNavStructure>
 *         <odePagStructures>   ← one entry per block on the page
 *           <odePagStructure>
 *             <odeComponents>  ← one entry per iDevice in the block
 *               <odeComponent>
 *                 <htmlView>CDATA</htmlView>
 *                 <jsonProperties>CDATA</jsonProperties>
 */

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: true,
  indentBy: "  ",
  suppressEmptyNode: false,
  cdataPropName: "__cdata"
});

function kv(key: string, value: string | number) {
  return { key, value: String(value) };
}

const DEFAULT_PAG_PROPS = [
  kv("visibility", "true"),
  kv("teacherOnly", "false"),
  kv("allowToggle", "true"),
  kv("minimized", "false"),
  kv("cssClass", "")
];

function buildComponent(idev: ElpxIdevice) {
  return {
    odePageId: idev.pageId,
    odeBlockId: idev.blockId,
    odeIdeviceId: idev.id,
    odeIdeviceTypeName: idev.typeName,
    htmlView: { __cdata: idev.htmlView },
    jsonProperties: { __cdata: JSON.stringify(idev.jsonProperties ?? {}) },
    odeComponentsOrder: String(idev.order),
    odeComponentsProperties: {}
  };
}

export type BuildContentXmlOptions = {
  /** Project identifiers to put in <odeResources>. Auto-generated if omitted. */
  odeId?: string;
  odeVersionId?: string;
  exeVersion?: string;
  exelearningVersion?: string;
  exportSource?: string;
};

function nowOdeStamp(): string {
  const d = new Date();
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}${rand}`;
}

export function buildContentXml(project: ElpxProject, opts: BuildContentXmlOptions = {}): string {
  const odeId = opts.odeId ?? nowOdeStamp();
  const odeVersionId = opts.odeVersionId ?? nowOdeStamp();
  const exeVersion = opts.exeVersion ?? "0.0.0-h5p2elpx";
  const exelearningVersion = opts.exelearningVersion ?? "v0.0.0-h5p2elpx";

  const navStructures = project.pages
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((page, idx) => ({
      odePageId: page.id,
      odeParentPageId: page.parentId ?? "",
      pageName: page.title,
      odeNavStructureOrder: String(idx),
      odeNavStructureProperties: {
        odeNavStructureProperty: [kv("titlePage", page.title)]
      },
      odePagStructures: {
        odePagStructure: page.blocks
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((block, bIdx) => {
            const firstIdev = block.iDevices[0];
            const blockName = firstIdev?.title ?? "Bloque";
            return {
              odePageId: page.id,
              odeBlockId: block.id,
              blockName,
              iconName: "",
              odePagStructureOrder: String(bIdx + 1),
              odePagStructureProperties: {
                odePagStructureProperty: DEFAULT_PAG_PROPS
              },
              odeComponents: {
                odeComponent: block.iDevices
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map(buildComponent)
              }
            };
          })
      }
    }));

  const doc = {
    "?xml": { "@_version": "1.0", "@_encoding": "UTF-8" },
    ode: {
      "@_xmlns": "http://www.intef.es/xsd/ode",
      "@_version": "2.0",
      userPreferences: {
        userPreference: [kv("theme", "base")]
      },
      odeResources: {
        odeResource: [
          kv("odeId", odeId),
          kv("odeVersionId", odeVersionId),
          kv("exe_version", exeVersion),
          ...(opts.exportSource ? [kv("exportSource", opts.exportSource)] : [])
        ]
      },
      odeProperties: {
        odeProperty: [
          kv("pp_title", project.title),
          kv("pp_lang", project.language ?? "en"),
          kv("pp_license", "creative commons: attribution - share alike 4.0"),
          kv("pp_licenseUrl", "https://creativecommons.org/licenses/by-sa/4.0/"),
          kv("pp_theme", "base"),
          kv("pp_exelearning_version", exelearningVersion),
          kv("pp_modified", String(Date.now())),
          kv("pp_addAccessibilityToolbar", "false"),
          kv("pp_addExeLink", "true"),
          kv("pp_addMathJax", "false"),
          kv("pp_addPagination", "true"),
          kv("pp_addSearchBox", "false"),
          kv("pp_globalFont", "")
        ]
      },
      odeNavStructures: {
        odeNavStructure: navStructures
      }
    }
  };

  const xml = builder.build(doc);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE ode SYSTEM "content.dtd">\n${stripXmlDecl(xml)}`;
}

function stripXmlDecl(xml: string): string {
  return xml.replace(/^<\?xml[^?]*\?>\s*/, "");
}

export const CONTENT_DTD = `<!--
    ODE Content DTD - emitted by h5p2elpx
    Matches eXeLearning ODE XML format (content.xml) v2.0
    Namespace: http://www.intef.es/xsd/ode
-->

<!ELEMENT ode (userPreferences?, odeResources?, odeProperties?, odeNavStructures)>
<!ATTLIST ode
    xmlns CDATA #FIXED "http://www.intef.es/xsd/ode"
    version CDATA #IMPLIED>

<!ELEMENT userPreferences (userPreference*)>
<!ELEMENT userPreference (key, value)>
<!ELEMENT odeResources (odeResource*)>
<!ELEMENT odeResource (key, value)>
<!ELEMENT odeProperties (odeProperty*)>
<!ELEMENT odeProperty (key, value)>
<!ELEMENT key (#PCDATA)>
<!ELEMENT value (#PCDATA)>

<!ELEMENT odeNavStructures (odeNavStructure*)>
<!ELEMENT odeNavStructure (odePageId, odeParentPageId, pageName, odeNavStructureOrder, odeNavStructureProperties?, odePagStructures?)>
<!ELEMENT odePageId (#PCDATA)>
<!ELEMENT odeParentPageId (#PCDATA)>
<!ELEMENT pageName (#PCDATA)>
<!ELEMENT odeNavStructureOrder (#PCDATA)>
<!ELEMENT odeNavStructureProperties (odeNavStructureProperty*)>
<!ELEMENT odeNavStructureProperty (key, value)>

<!ELEMENT odePagStructures (odePagStructure*)>
<!ELEMENT odePagStructure (odePageId, odeBlockId, blockName, iconName?, odePagStructureOrder, odePagStructureProperties?, odeComponents?)>
<!ELEMENT odeBlockId (#PCDATA)>
<!ELEMENT blockName (#PCDATA)>
<!ELEMENT iconName (#PCDATA)>
<!ELEMENT odePagStructureOrder (#PCDATA)>
<!ELEMENT odePagStructureProperties (odePagStructureProperty*)>
<!ELEMENT odePagStructureProperty (key, value)>

<!ELEMENT odeComponents (odeComponent*)>
<!ELEMENT odeComponent (odePageId, odeBlockId, odeIdeviceId, odeIdeviceTypeName, htmlView?, jsonProperties?, odeComponentsOrder, odeComponentsProperties?)>
<!ELEMENT odeIdeviceId (#PCDATA)>
<!ELEMENT odeIdeviceTypeName (#PCDATA)>
<!ELEMENT htmlView (#PCDATA)>
<!ELEMENT jsonProperties (#PCDATA)>
<!ELEMENT odeComponentsOrder (#PCDATA)>
<!ELEMENT odeComponentsProperties (odeComponentsProperty*)>
<!ELEMENT odeComponentsProperty (key, value)>
`;
