import { describe, expect, it } from "vitest";
import { parseCsv, stringifyCsv, detectDelimiter, neutralizeFormula } from "../src/csv";
import { decodeBytes } from "../src/encoding";
import { diffCsv, diffToRows } from "../src/diff";

describe("csv", () => {
  it("引用符・改行・エスケープを処理する", () => {
    expect(parseCsv('a,"b,1","c\n2","d""e"\r\nx,y,z')).toEqual([["a", "b,1", "c\n2", 'd"e'], ["x", "y", "z"]]);
  });
  it("BOMと末尾改行なしを扱う", () => {
    expect(parseCsv("﻿a,b\n1,2")).toEqual([["a", "b"], ["1", "2"]]);
  });
  it("空入力は空配列", () => expect(parseCsv("")).toEqual([]));
  it("区切り文字を判定する", () => {
    expect(detectDelimiter("a\tb\tc\n1\t2\t3")).toBe("\t");
    expect(detectDelimiter("abc")).toBe(",");
  });
  it("往復で内容が保たれる", () => {
    const rows = [["a", 'b"c', "d,e", "f\ng"], ["1", "", "3", "4"]];
    expect(parseCsv(stringifyCsv(rows))).toEqual(rows);
  });
  it("数式インジェクションを無害化する(負数は除く)", () => {
    expect(neutralizeFormula("=1+1")).toBe("'=1+1");
    expect(neutralizeFormula("-5")).toBe("-5");
    expect(neutralizeFormula("-cmd")).toBe("'-cmd");
    expect(stringifyCsv([["@x"]], { safe: true })).toBe("'@x\r\n");
  });
});

describe("encoding", () => {
  // 「日本語」を Shift_JIS で符号化したバイト列
  const sjis = new Uint8Array([0x93, 0xfa, 0x96, 0x7b, 0x8c, 0xea]);
  it("autoでShift_JISを判定する", () => expect(decodeBytes(sjis)).toEqual({ text: "日本語", used: "shift_jis" }));
  it("autoでUTF-8を判定する", () => {
    expect(decodeBytes(new TextEncoder().encode("日本語")).used).toBe("utf-8");
  });
  it("明示指定が優先される", () => expect(decodeBytes(sjis, "shift_jis").text).toBe("日本語"));
});

describe("diff", () => {
  const a = parseCsv("id,name,price\n1,りんご,100\n2,みかん,80\n3,ぶどう,300");
  const b = parseCsv("price,id,name\n100,1,りんご\n90,2,みかん\n500,4,もも");
  it("追加・削除・変更を検出し、列順は無視する", () => {
    const d = diffCsv(a, b, ["id"]);
    expect(d.removed.map((r) => r.id)).toEqual(["3"]);
    expect(d.added.map((r) => r.id)).toEqual(["4"]);
    expect(d.changed).toEqual([{ key: "2", changes: [{ column: "price", before: "80", after: "90" }] }]);
    expect(d.unchanged).toBe(1);
  });
  it("複合キーに対応する", () => {
    const x = parseCsv("a,b,v\n1,1,x\n1,2,y");
    const y = parseCsv("a,b,v\n1,1,x\n1,2,z");
    expect(diffCsv(x, y, ["a", "b"]).changed[0].key).toBe("1 / 2");
  });
  it("キー列が無ければエラー", () => {
    expect(() => diffCsv(a, b, ["zzz"])).toThrow();
    expect(() => diffCsv(a, b, [])).toThrow();
  });
  it("重複キーと列の増減を警告・報告する", () => {
    const x = parseCsv("id,v\n1,a\n1,b");
    const y = parseCsv("id,w\n1,a");
    const d = diffCsv(x, y, ["id"]);
    expect(d.warnings.length).toBe(1);
    expect(d.columnsAdded).toEqual(["w"]);
    expect(d.columnsRemoved).toEqual(["v"]);
  });
  it("空ファイル(ヘッダなし)はキー列エラー", () => expect(() => diffCsv([], [], ["id"])).toThrow());
  it("レポート行を生成する", () => {
    const rows = diffToRows(diffCsv(a, b, ["id"]), ["id"]);
    expect(rows[0]).toEqual(["種別", "キー", "列", "旧", "新"]);
    expect(rows.length).toBe(4);
  });
  it("10万行でも実用時間で終わる", () => {
    const big = (n: number) => [["id", "v"], ...Array.from({ length: n }, (_, i) => [String(i), String(i)])];
    const t = Date.now();
    expect(diffCsv(big(100000), big(100000), ["id"]).unchanged).toBe(100000);
    expect(Date.now() - t).toBeLessThan(5000);
  });
});
