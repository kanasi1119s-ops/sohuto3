export type Encoding = "auto" | "utf-8" | "shift_jis";

/** バイト列を文字列に変換。auto は BOM/UTF-8妥当性で判定し、不正なら Shift_JIS とみなす。 */
export function decodeBytes(bytes: Uint8Array, enc: Encoding = "auto"): { text: string; used: "utf-8" | "shift_jis" } {
  if (enc === "shift_jis") return { text: new TextDecoder("shift_jis").decode(bytes), used: "shift_jis" };
  if (enc === "utf-8") return { text: new TextDecoder("utf-8").decode(bytes), used: "utf-8" };
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), used: "utf-8" };
  } catch {
    return { text: new TextDecoder("shift_jis").decode(bytes), used: "shift_jis" };
  }
}
