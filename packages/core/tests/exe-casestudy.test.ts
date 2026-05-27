import { describe, it, expect } from "vitest";
import { buildCaseStudyIdevice } from "../src/exe/idevices/casestudy.ts";
import { buildContentXml } from "../src/exe/content-xml.ts";
import type { ElpxProject } from "../src/exe/model.ts";

describe("buildCaseStudyIdevice", () => {
  it("emits the casestudy iDevice shape (typeGame, history, activities)", () => {
    const idev = buildCaseStudyIdevice({
      pageId: "page-1",
      blockId: "block-1",
      order: 0,
      title: "Mi reflexión",
      history: "<p>Lee el siguiente texto y reflexiona.</p>",
      activities: [{ activity: "<p>¿Qué opinas?</p>", feedback: "<p>Respuesta esperada.</p>" }]
    });
    expect(idev.typeName).toBe("casestudy");
    expect(idev.title).toBe("Mi reflexión");
    const json = idev.jsonProperties as Record<string, unknown>;
    expect(json.typeGame).toBe("Case study");
    expect(json.history).toBe("<p>Lee el siguiente texto y reflexiona.</p>");
    const activities = json.activities as Array<{ activity: string; feedback: string }>;
    expect(activities.length).toBe(1);
    expect(activities[0]!.activity).toBe("<p>¿Qué opinas?</p>");
    expect(activities[0]!.feedback).toBe("<p>Respuesta esperada.</p>");
    expect(idev.htmlView).toContain("CSP-History");
    expect(idev.htmlView).toContain("CSP-Activities");
  });

  it("survives the content.xml builder and serialises typeName=casestudy", () => {
    const project: ElpxProject = {
      id: "p-1",
      title: "Test",
      language: "es",
      pages: [
        {
          id: "page-1",
          title: "Page",
          order: 0,
          blocks: [
            {
              id: "block-1",
              pageId: "page-1",
              order: 0,
              iDevices: [
                buildCaseStudyIdevice({
                  pageId: "page-1",
                  blockId: "block-1",
                  order: 0,
                  history: "<p>Escenario</p>",
                  activities: [{ activity: "<p>Tarea</p>" }]
                })
              ]
            }
          ]
        }
      ],
      resources: []
    };
    const xml = buildContentXml(project);
    expect(xml).toContain("<odeIdeviceTypeName>casestudy</odeIdeviceTypeName>");
    expect(xml).toMatch(/typeGame.{0,4}Case study/);
    expect(xml).toContain("CSP-Activities");
  });

  it("emits an empty <blockName> when the iDevice has no real title", () => {
    const project: ElpxProject = {
      id: "p-1",
      title: "Test",
      language: "es",
      pages: [
        {
          id: "page-1",
          title: "Page",
          order: 0,
          blocks: [
            {
              id: "block-1",
              pageId: "page-1",
              order: 0,
              iDevices: [
                buildCaseStudyIdevice({
                  pageId: "page-1",
                  blockId: "block-1",
                  order: 0,
                  history: "<p>x</p>",
                  activities: [{ activity: "<p>y</p>" }]
                })
              ]
            }
          ]
        }
      ],
      resources: []
    };
    const xml = buildContentXml(project);
    expect(xml).toMatch(/<blockName\/>|<blockName><\/blockName>/);
  });
});
