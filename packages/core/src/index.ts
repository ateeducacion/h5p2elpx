export * from "./h5p/h5p-types.ts";
export * from "./h5p/library-ref.ts";
export { readH5p } from "./h5p/read-h5p.ts";
export { parseH5pJson } from "./h5p/parse-h5p-json.ts";
export { parseContentJson } from "./h5p/parse-content-json.ts";
export { detectMainLibrary } from "./h5p/detect-library.ts";
export {
  AssetCollector,
  buildUrlRewriters,
  extractAssets
} from "./h5p/asset-extractor.ts";
export type { AssetPlanEntry } from "./h5p/asset-extractor.ts";

export * from "./normalize/nodes.ts";
export { normalizePackage } from "./normalize/normalize.ts";
export {
  adaptH5pSubContent,
  listRegisteredMachines
} from "./normalize/adapters/index.ts";

export type { AdcPackage, AdcFlavor, AdcComponent, AdcAsset } from "./adc/types.ts";
export { readAdc } from "./adc/read-adc.ts";
export { readAdcJson } from "./adc/read-adc-json.ts";
export { readAdcNative } from "./adc/read-adc-native.ts";
export { sniffAdcZip, sniffLoadedZip } from "./adc/sniff.ts";
export type { AdcSniffResult } from "./adc/sniff.ts";
export { decompressNtxCaf, extractNtxCafBase64 } from "./adc/decompress-ntxcaf.ts";
export { planAdcAssets } from "./adc/asset-plan.ts";
export { normalizeAdcPackage } from "./normalize/normalize-adc.ts";

export * from "./exe/model.ts";
export { wrapCdata, escapeCdataInner } from "./exe/cdata.ts";
export { buildContentXml, CONTENT_DTD } from "./exe/content-xml.ts";
export { writeElpx } from "./exe/elpx-writer.ts";
export { validateElpx } from "./exe/validate.ts";
export * from "./exe/idevices/index.ts";
export { newOdeId } from "./exe/ids.ts";

export * from "./convert/conversion-options.ts";
export { convert } from "./convert/convert.ts";
export type { ConvertInput, ConvertResult } from "./convert/convert.ts";
export { buildCompatibilityPreview } from "./convert/conversion-plan.ts";
export type { CompatibilityEntry } from "./convert/conversion-plan.ts";

export * from "./report/conversion-report.ts";
