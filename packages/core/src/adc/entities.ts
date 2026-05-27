/**
 * Decode the entity flavours that appear in ADC source data: standard XML
 * named entities, HTML `&nbsp;`, and both decimal (`&#233;`) and hex
 * (`&#xE9;`) numeric character references. ADC's `courseInfo.xml` emits
 * numeric refs for non-ASCII letters which `fast-xml-parser` leaves untouched.
 *
 * Lives in `adc/` so both `read-adc-native.ts` and `normalize-adc.ts` can
 * share one implementation.
 */
export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
