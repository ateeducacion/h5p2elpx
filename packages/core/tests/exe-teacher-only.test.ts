import { describe, it, expect } from "vitest";
import { buildContentXml } from "../src/exe/content-xml.ts";
import type { ElpxProject } from "../src/exe/model.ts";

function project(): ElpxProject {
  return {
    id: "project-1",
    title: "Teacher-only test",
    language: "es",
    pages: [
      {
        id: "page-1",
        title: "Page",
        order: 0,
        blocks: [
          {
            id: "block-public",
            pageId: "page-1",
            order: 0,
            iDevices: [
              {
                id: "idev-1",
                pageId: "page-1",
                blockId: "block-public",
                typeName: "freeText",
                title: "Public",
                htmlView: "<p>Visible to everyone</p>",
                jsonProperties: {},
                order: 0
              }
            ]
          },
          {
            id: "block-teacher",
            pageId: "page-1",
            order: 1,
            teacherOnly: true,
            iDevices: [
              {
                id: "idev-2",
                pageId: "page-1",
                blockId: "block-teacher",
                typeName: "freeText",
                title: "Teacher notes",
                htmlView: "<p>Only for the teacher</p>",
                jsonProperties: {},
                order: 0
              }
            ]
          },
          {
            id: "block-mixed",
            pageId: "page-1",
            order: 2,
            iDevices: [
              {
                id: "idev-3",
                pageId: "page-1",
                blockId: "block-mixed",
                typeName: "freeText",
                title: "Mixed block, teacher iDevice",
                htmlView: "<p>iDevice-level marker</p>",
                jsonProperties: {},
                order: 0,
                teacherOnly: true
              }
            ]
          }
        ]
      }
    ],
    resources: []
  };
}

describe("buildContentXml — teacherOnly serialization", () => {
  const xml = buildContentXml(project());

  it("emits teacherOnly=false for ordinary blocks", () => {
    // The first odePagStructure (block-public) keeps the default
    expect(xml).toMatch(
      /<odeBlockId>block-public<\/odeBlockId>[\s\S]*?<key>teacherOnly<\/key>\s*<value>false<\/value>/
    );
  });

  it("emits teacherOnly=true for blocks marked teacher-only", () => {
    expect(xml).toMatch(
      /<odeBlockId>block-teacher<\/odeBlockId>[\s\S]*?<key>teacherOnly<\/key>\s*<value>true<\/value>/
    );
  });

  it("emits component-level teacherOnly only when the iDevice carries the flag", () => {
    const teacherIdev = xml.match(
      /<odeIdeviceId>idev-3<\/odeIdeviceId>[\s\S]*?<\/odeComponentsProperties>/
    );
    expect(teacherIdev).not.toBeNull();
    expect(teacherIdev![0]).toMatch(/<key>teacherOnly<\/key>\s*<value>true<\/value>/);

    const ordinaryIdev = xml.match(
      /<odeIdeviceId>idev-1<\/odeIdeviceId>[\s\S]*?<\/odeComponentsProperties>/
    );
    expect(ordinaryIdev).not.toBeNull();
    expect(ordinaryIdev![0]).not.toMatch(/<key>teacherOnly<\/key>/);
  });
});
