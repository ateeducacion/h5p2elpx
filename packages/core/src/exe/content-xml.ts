import { XMLBuilder } from "fast-xml-parser";
import type { ElpxIdevice, ElpxProject } from "./model.ts";
import { newOdeId } from "./ids.ts";

/**
 * Generate eXeLearning `content.xml` in the ODE v2.0 format used by
 * eXeLearning v4. Mirrors the structure produced by
 * `src/shared/export/generators/OdeXmlGenerator.ts` in the eXe repo:
 *
 *   <ode xmlns="http://www.intef.es/xsd/ode" version="2.0">
 *     <userPreferences/>
 *     <odeResources/>      ← odeId, odeVersionId, exe_version="3.0"
 *     <odeProperties/>     ← pp_title, pp_lang, pp_theme, ...
 *     <odeNavStructures>   ← one entry per page (nav sidebar)
 *       <odeNavStructure>
 *         <odePagStructures>   ← blocks
 *           <odePagStructure>
 *             <odeComponents>  ← iDevices
 *               <odeComponent>
 *                 <htmlView>CDATA</htmlView>
 *                 <jsonProperties>CDATA</jsonProperties>
 *
 * htmlView and jsonProperties are ALWAYS CDATA-wrapped, even when their
 * contents have no XML-significant characters — matches OdeXmlGenerator.
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

/**
 * The three component-level properties eXeLearning always emits per the
 * snippets in `doc/elpx-format/idevices/snippets.md`. `value` is omitted
 * (self-closing) when empty.
 */
function defaultComponentProps() {
  return {
    odeComponentsProperty: [
      { key: "identifier", value: "" },
      { key: "visibility", value: "true" },
      { key: "cssClass", value: "" }
    ]
  };
}

function buildComponent(idev: ElpxIdevice) {
  return {
    odePageId: idev.pageId,
    odeBlockId: idev.blockId,
    odeIdeviceId: idev.id,
    odeIdeviceTypeName: idev.typeName,
    htmlView: { __cdata: idev.htmlView ?? "" },
    jsonProperties: { __cdata: JSON.stringify(idev.jsonProperties ?? {}) },
    odeComponentsOrder: String(idev.order),
    odeComponentsProperties: defaultComponentProps()
  };
}

export type BuildContentXmlOptions = {
  odeId?: string;
  odeVersionId?: string;
  /** Value of the `exe_version` ode resource. Defaults to "3.0" — the
   *  ODE_VERSION constant in eXe v4. */
  exeVersion?: string;
};

export function buildContentXml(project: ElpxProject, opts: BuildContentXmlOptions = {}): string {
  const odeId = opts.odeId ?? newOdeId();
  const odeVersionId = opts.odeVersionId ?? newOdeId();
  const exeVersion = opts.exeVersion ?? "3.0";

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
          kv("exe_version", exeVersion)
        ]
      },
      odeProperties: {
        odeProperty: [
          kv("pp_title", project.title),
          kv("pp_lang", project.language ?? "en"),
          kv("pp_license", "creative commons: attribution - share alike 4.0"),
          kv("pp_licenseUrl", "https://creativecommons.org/licenses/by-sa/4.0/"),
          kv("pp_theme", "base"),
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
