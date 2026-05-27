import JSZip from "jszip";
import type { AdcPackage } from "./types.ts";
import { sniffLoadedZip } from "./sniff.ts";
import { readAdcJson } from "./read-adc-json.ts";
import { readAdcNative } from "./read-adc-native.ts";

export type ReadAdcOptions = {
  sourceFilename?: string;
};

/**
 * Open any ADC (Aula Digital Canaria / "Content") ZIP and return an
 * `AdcPackage`. Sniffs the flavor, then dispatches to the matching reader.
 * Returns `null` when the ZIP isn't recognised as an ADC bundle, so callers
 * can fall through to other readers (e.g. H5P).
 */
export async function readAdc(
  data: Uint8Array | ArrayBuffer,
  options: ReadAdcOptions = {}
): Promise<AdcPackage | null> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    return null;
  }
  const sniff = await sniffLoadedZip(zip);
  if (!sniff) return null;
  if (sniff.flavor === "native") {
    return readAdcNative(zip, { sourceFilename: options.sourceFilename });
  }
  return readAdcJson(zip, { sourceFilename: options.sourceFilename, flavor: sniff.flavor });
}
