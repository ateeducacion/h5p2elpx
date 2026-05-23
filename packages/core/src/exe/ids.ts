/**
 * eXeLearning uses ids of the form `<kind>-<base36 ms>-<random>`, e.g.
 * `idevice-1779549856454-un949rhzb`. We mimic the pattern so the produced
 * .elpx looks indistinguishable from one authored in eXe.
 */
function exeId(kind: string): string {
  const ms = Date.now();
  const rand = Math.random().toString(36).slice(2, 12);
  return `${kind}-${ms}-${rand}`;
}

export const newProjectId = () => exeId("proj");
export const newPageId = () => exeId("page");
export const newBlockId = () => exeId("block");
export const newIdeviceId = () => exeId("idevice");
