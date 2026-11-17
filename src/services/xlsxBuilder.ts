/**
 * xlsxBuilder.ts
 * Pure TypeScript OpenXML (.xlsx) workbook generator for KasuPilot.
 * Produces ECMA-376 compliant workbooks with styles, merged cells, frozen panes,
 * autofilter, formulas and data bars. Runs fully on-device with no native dependencies.
 */

// CRC-32 Lookup Table
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function calculateCrc32(bytes: Uint8Array): number {
  let crc = 0 ^ -1;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.length;
  const CHUNK_SIZE = 8192;
  for (let i = 0; i < len; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, len));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return globalThis.btoa(binary);
}

const NOW = new Date();
// A zero DOS date is invalid (month 0 / day 0); use the real current date.
const DOS_TIME = (NOW.getHours() << 11) | (NOW.getMinutes() << 5) | (NOW.getSeconds() >> 1);
const DOS_DATE = ((NOW.getFullYear() - 1980) << 9) | ((NOW.getMonth() + 1) << 5) | NOW.getDate();

/** Builds a PKZip archive (stored / uncompressed), which Excel opens natively. */
export function buildZipArchive(
  files: Array<{ name: string; data: string | Uint8Array }>
): Uint8Array {
  const enc = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const dataBytes = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
    const crc = calculateCrc32(dataBytes);
    const size = dataBytes.length;

    const lh = new Uint8Array(30 + nameBytes.length);
    const lview = new DataView(lh.buffer);
    lview.setUint32(0, 0x04034b50, true);
    lview.setUint16(4, 20, true);
    lview.setUint16(6, 0x0800, true); // UTF-8 names
    lview.setUint16(8, 0, true); // STORED
    lview.setUint16(10, DOS_TIME, true);
    lview.setUint16(12, DOS_DATE, true);
    lview.setUint32(14, crc, true);
    lview.setUint32(18, size, true);
    lview.setUint32(22, size, true);
    lview.setUint16(26, nameBytes.length, true);
    lview.setUint16(28, 0, true);
    lh.set(nameBytes, 30);

    localParts.push(lh, dataBytes);

    const ch = new Uint8Array(46 + nameBytes.length);
    const cview = new DataView(ch.buffer);
    cview.setUint32(0, 0x02014b50, true);
    cview.setUint16(4, 20, true);
    cview.setUint16(6, 20, true);
    cview.setUint16(8, 0x0800, true);
    cview.setUint16(10, 0, true);
    cview.setUint16(12, DOS_TIME, true);
    cview.setUint16(14, DOS_DATE, true);
    cview.setUint32(16, crc, true);
    cview.setUint32(20, size, true);
    cview.setUint32(24, size, true);
    cview.setUint16(28, nameBytes.length, true);
    cview.setUint16(30, 0, true);
    cview.setUint16(32, 0, true);
    cview.setUint16(34, 0, true);
    cview.setUint16(36, 0, true);
    cview.setUint32(38, 0, true);
    cview.setUint32(42, offset, true);
    ch.set(nameBytes, 46);

    centralParts.push(ch);
    offset += lh.length + dataBytes.length;
  }

  const centralSize = centralParts.reduce((acc, p) => acc + p.length, 0);
  const centralOffset = offset;

  const eocd = new Uint8Array(22);
  const eview = new DataView(eocd.buffer);
  eview.setUint32(0, 0x06054b50, true);
  eview.setUint16(4, 0, true);
  eview.setUint16(6, 0, true);
  eview.setUint16(8, files.length, true);
  eview.setUint16(10, files.length, true);
  eview.setUint32(12, centralSize, true);
  eview.setUint32(16, centralOffset, true);
  eview.setUint16(20, 0, true);

  const out = new Uint8Array(offset + centralSize + 22);
  let pos = 0;
  for (const part of [...localParts, ...centralParts, eocd]) {
    out.set(part, pos);
    pos += part.length;
  }
  return out;
}

/** Escapes XML and strips characters illegal in XML 1.0 (SMS text often contains them). */
function xmlEscape(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '')
    .replace(/(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '$1')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Excel sheet names: max 31 chars, none of \ / ? * [ ] : */
function safeSheetName(name: string): string {
  return name.replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31) || 'Sheet';
}

/** Style ids = index into cellXfs in makeStylesXml. */
export type CellStyleId =
  | 0 // Normal text
  | 1 // Banner title
  | 2 // Banner subtitle
  | 3 // Table header
  | 4 // Text left
  | 5 // Text left zebra
  | 6 // Currency right
  | 7 // Currency right zebra
  | 8 // Subtotal label
  | 9 // Subtotal currency
  | 10 // Grand total label
  | 11 // Grand total currency
  | 12 // KPI income (green)
  | 13 // KPI expense (red)
  | 14 // KPI currency (blue)
  | 15 // KPI percent (blue)
  | 16 // Section header
  | 17 // Text centered
  | 18 // Percent right
  | 19 // Percent right zebra
  | 20 // Integer centered
  | 21 // Integer centered zebra
  | 22 // KPI caption
  | 23 // KPI integer (blue)
  | 24 // Grand total percent
  | 25 // Grand total integer
  | 26 // Insight label
  | 27 // Insight value text
  | 28 // Footnote
  | 29 // Subtotal percent
  | 30 // Subtotal integer
  | 31 // Credit currency (green)
  | 32 // Text centered zebra
  | 33 // Insight value currency
  | 34; // Text wrapped

export interface XlsxCell {
  value: string | number;
  type?: 'string' | 'number';
  style?: CellStyleId;
  /** Optional formula (without "="); `value` is stored as the cached result. */
  formula?: string;
}

export interface XlsxColumn {
  width: number;
}

export interface XlsxSheet {
  name: string;
  columns: XlsxColumn[];
  rows: XlsxCell[][];
  /** Merge ranges, e.g. "A1:F1". */
  merges?: string[];
  /** Freeze every row up to and including this 1-based row. */
  freezeRows?: number;
  /** Autofilter range, e.g. "A5:I100". */
  autoFilter?: string;
  /** Custom row heights (points) keyed by 1-based row number. */
  rowHeights?: Record<number, number>;
  /** Ranges that get in-cell data bars (values expected 0..1). */
  dataBars?: Array<{ range: string; color?: string }>;
  tabColor?: string;
  showGridLines?: boolean;
}

function makeContentTypesXml(sheetCount: number): string {
  let sheetsXml = '';
  for (let i = 1; i <= sheetCount; i++) {
    sheetsXml += `  <Override PartName="/xl/worksheets/sheet${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>\n`;
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
${sheetsXml}</Types>`;
}

function makeRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function makeCoreXml(): string {
  const iso = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>KasuPilot Monthly Report</dc:title><dc:creator>KasuPilot</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${iso}</dcterms:modified></cp:coreProperties>`;
}

function makeAppXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>KasuPilot</Application></Properties>`;
}

function makeWorkbookRelsXml(sheetCount: number): string {
  let rels = '';
  for (let i = 1; i <= sheetCount; i++) {
    rels += `  <Relationship Id="rId${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i}.xml"/>\n`;
  }
  rels += `  <Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>\n`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${rels}</Relationships>`;
}

function makeWorkbookXml(sheets: XlsxSheet[]): string {
  let sheetElements = '';
  sheets.forEach((s, idx) => {
    sheetElements += `    <sheet name="${xmlEscape(safeSheetName(s.name))}" sheetId="${idx + 1}" r:id="rId${idx + 1}"/>\n`;
  });
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000" activeTab="0"/></bookViews>
  <sheets>
${sheetElements}  </sheets>
</workbook>`;
}

/** xl/styles.xml. Children of <font> follow schema order (b, i, sz, color, name, family). */
function makeStylesXml(): string {
  const F = (o: { b?: boolean; i?: boolean; sz: number; color: string }) =>
    `<font>${o.b ? '<b/>' : ''}${o.i ? '<i/>' : ''}<sz val="${o.sz}"/><color rgb="${o.color}"/><name val="Calibri"/><family val="2"/></font>`;
  const fonts = [
    F({ sz: 10, color: 'FF1E293B' }), // 0 normal
    F({ b: true, sz: 10, color: 'FF0F172A' }), // 1 bold dark
    F({ b: true, sz: 10, color: 'FFFFFFFF' }), // 2 bold white
    F({ b: true, sz: 16, color: 'FFFFFFFF' }), // 3 title
    F({ b: true, sz: 14, color: 'FF15803D' }), // 4 kpi green
    F({ b: true, sz: 14, color: 'FFDC2626' }), // 5 kpi red
    F({ b: true, sz: 14, color: 'FF0369A1' }), // 6 kpi blue
    F({ b: true, sz: 11, color: 'FF0F172A' }), // 7 section
    F({ i: true, sz: 9, color: 'FF64748B' }), // 8 footnote
    F({ sz: 9, color: 'FFCBD5E1' }), // 9 subtitle
    F({ b: true, sz: 9, color: 'FF64748B' }), // 10 kpi caption
    F({ sz: 10, color: 'FF15803D' }), // 11 green regular
  ];
  const fill = (rgb: string) =>
    `<fill><patternFill patternType="solid"><fgColor rgb="${rgb}"/><bgColor indexed="64"/></patternFill></fill>`;
  const fills = [
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
    fill('FF0F172A'), // 2 navy
    fill('FF334155'), // 3 header slate
    fill('FFF8FAFC'), // 4 zebra
    fill('FFF1F5F9'), // 5 subtotal
    fill('FFE2E8F0'), // 6 section
    fill('FFDCFCE7'), // 7 green tint
    fill('FFFEE2E2'), // 8 red tint
    fill('FFE0F2FE'), // 9 blue tint
  ];
  const side = (n: string, st: string, c: string) => `<${n} style="${st}"><color rgb="${c}"/></${n}>`;
  const borders = [
    '<border><left/><right/><top/><bottom/><diagonal/></border>',
    `<border>${side('left', 'thin', 'FFCBD5E1')}${side('right', 'thin', 'FFCBD5E1')}${side('top', 'thin', 'FFCBD5E1')}${side('bottom', 'thin', 'FFCBD5E1')}<diagonal/></border>`,
    `<border><left/><right/>${side('top', 'thin', 'FF0F172A')}${side('bottom', 'double', 'FF0F172A')}<diagonal/></border>`,
  ];
  type Xf = { n?: number; f?: number; fl?: number; b?: number; h?: string; wrap?: boolean; indent?: number };
  const xf = (o: Xf) => {
    const al = `<alignment horizontal="${o.h ?? 'left'}" vertical="center"${o.wrap ? ' wrapText="1"' : ''}${o.indent ? ` indent="${o.indent}"` : ''}/>`;
    return `<xf numFmtId="${o.n ?? 0}" fontId="${o.f ?? 0}" fillId="${o.fl ?? 0}" borderId="${o.b ?? 0}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${al}</xf>`;
  };
  const CUR = 164;
  const PCT = 165;
  const INT = 3;
  const xfs = [
    xf({}), // 0
    xf({ f: 3, fl: 2, indent: 1 }), // 1 title
    xf({ f: 9, fl: 2, indent: 1 }), // 2 subtitle
    xf({ f: 2, fl: 3, b: 1, h: 'center', wrap: true }), // 3 header
    xf({ b: 1 }), // 4
    xf({ fl: 4, b: 1 }), // 5
    xf({ n: CUR, b: 1, h: 'right' }), // 6
    xf({ n: CUR, fl: 4, b: 1, h: 'right' }), // 7
    xf({ f: 1, fl: 5, b: 1 }), // 8
    xf({ n: CUR, f: 1, fl: 5, b: 1, h: 'right' }), // 9
    xf({ f: 2, fl: 2, b: 2 }), // 10
    xf({ n: CUR, f: 2, fl: 2, b: 2, h: 'right' }), // 11
    xf({ n: CUR, f: 4, fl: 7, b: 1, h: 'center' }), // 12
    xf({ n: CUR, f: 5, fl: 8, b: 1, h: 'center' }), // 13
    xf({ n: CUR, f: 6, fl: 9, b: 1, h: 'center' }), // 14
    xf({ n: PCT, f: 6, fl: 9, b: 1, h: 'center' }), // 15
    xf({ f: 7, fl: 6, b: 1 }), // 16
    xf({ b: 1, h: 'center' }), // 17
    xf({ n: PCT, b: 1, h: 'right' }), // 18
    xf({ n: PCT, fl: 4, b: 1, h: 'right' }), // 19
    xf({ n: INT, b: 1, h: 'center' }), // 20
    xf({ n: INT, fl: 4, b: 1, h: 'center' }), // 21
    xf({ f: 10, fl: 4, b: 1, h: 'center', wrap: true }), // 22
    xf({ n: INT, f: 6, fl: 9, b: 1, h: 'center' }), // 23
    xf({ n: PCT, f: 2, fl: 2, b: 2, h: 'right' }), // 24
    xf({ n: INT, f: 2, fl: 2, b: 2, h: 'center' }), // 25
    xf({ f: 1, fl: 5, b: 1 }), // 26
    xf({ b: 1, wrap: true }), // 27
    xf({ f: 8 }), // 28
    xf({ n: PCT, f: 1, fl: 5, b: 1, h: 'right' }), // 29
    xf({ n: INT, f: 1, fl: 5, b: 1, h: 'center' }), // 30
    xf({ n: CUR, f: 11, fl: 7, b: 1, h: 'right' }), // 31
    xf({ fl: 4, b: 1, h: 'center' }), // 32
    xf({ n: CUR, f: 1, b: 1, h: 'left' }), // 33
    xf({ b: 1, wrap: true }), // 34
  ];
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;₹&quot;#,##0.00"/><numFmt numFmtId="165" formatCode="0.0%"/></numFmts>
<fonts count="${fonts.length}">${fonts.join('')}</fonts>
<fills count="${fills.length}">${fills.join('')}</fills>
<borders count="${borders.length}">${borders.join('')}</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

function getColumnLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

function makeWorksheetXml(sheet: XlsxSheet, isFirst: boolean): string {
  const maxCols = Math.max(sheet.columns.length, ...sheet.rows.map((r) => r.length), 1);
  const lastRef = `${getColumnLetter(maxCols - 1)}${Math.max(sheet.rows.length, 1)}`;

  const sheetPr = `<sheetPr>${sheet.tabColor ? `<tabColor rgb="${sheet.tabColor}"/>` : ''}<pageSetUpPr fitToPage="1"/></sheetPr>`;

  let pane = '';
  if (sheet.freezeRows && sheet.freezeRows > 0) {
    const next = sheet.freezeRows + 1;
    pane = `<pane ySplit="${sheet.freezeRows}" topLeftCell="A${next}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${next}" sqref="A${next}"/>`;
  }
  const views = `<sheetViews><sheetView${sheet.showGridLines === false ? ' showGridLines="0"' : ''}${isFirst ? ' tabSelected="1"' : ''} workbookViewId="0">${pane}</sheetView></sheetViews>`;

  let colsXml = '';
  if (sheet.columns.length > 0) {
    colsXml = '<cols>';
    sheet.columns.forEach((col, idx) => {
      colsXml += `<col min="${idx + 1}" max="${idx + 1}" width="${col.width}" customWidth="1"/>`;
    });
    colsXml += '</cols>';
  }

  let rowsXml = '';
  sheet.rows.forEach((row, rowIdx) => {
    const rowNum = rowIdx + 1;
    const ht = sheet.rowHeights?.[rowNum];
    let cellsXml = '';
    row.forEach((cell, colIdx) => {
      const cellRef = `${getColumnLetter(colIdx)}${rowNum}`;
      const styleAttr = cell.style ? ` s="${cell.style}"` : '';
      if (typeof cell.value === 'number') {
        const num = Number.isFinite(cell.value) ? cell.value : 0;
        const f = cell.formula ? `<f>${xmlEscape(cell.formula)}</f>` : '';
        cellsXml += `<c r="${cellRef}"${styleAttr}>${f}<v>${num}</v></c>`;
      } else if (cell.value === '') {
        cellsXml += `<c r="${cellRef}"${styleAttr}/>`;
      } else {
        cellsXml += `<c r="${cellRef}"${styleAttr} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(cell.value)}</t></is></c>`;
      }
    });
    if (cellsXml || ht) {
      const htAttr = ht ? ` ht="${ht}" customHeight="1"` : '';
      rowsXml += `<row r="${rowNum}"${htAttr}>${cellsXml}</row>`;
    }
  });

  const autoFilter = sheet.autoFilter ? `<autoFilter ref="${sheet.autoFilter}"/>` : '';
  const merges =
    sheet.merges && sheet.merges.length
      ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>`
      : '';
  const bars = (sheet.dataBars || [])
    .map(
      (b, i) =>
        `<conditionalFormatting sqref="${b.range}"><cfRule type="dataBar" priority="${i + 1}"><dataBar><cfvo type="num" val="0"/><cfvo type="num" val="1"/><color rgb="${b.color || 'FF38BDF8'}"/></dataBar></cfRule></conditionalFormatting>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${sheetPr}<dimension ref="A1:${lastRef}"/>${views}<sheetFormatPr defaultRowHeight="18" customHeight="1"/>${colsXml}<sheetData>${rowsXml}</sheetData>${autoFilter}${merges}${bars}<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
}

/** Assembles worksheets into a complete .xlsx byte array. */
export function generateXlsxBinary(sheets: XlsxSheet[]): Uint8Array {
  const files: Array<{ name: string; data: string | Uint8Array }> = [
    { name: '[Content_Types].xml', data: makeContentTypesXml(sheets.length) },
    { name: '_rels/.rels', data: makeRelsXml() },
    { name: 'docProps/core.xml', data: makeCoreXml() },
    { name: 'docProps/app.xml', data: makeAppXml() },
    { name: 'xl/_rels/workbook.xml.rels', data: makeWorkbookRelsXml(sheets.length) },
    { name: 'xl/workbook.xml', data: makeWorkbookXml(sheets) },
    { name: 'xl/styles.xml', data: makeStylesXml() },
  ];
  sheets.forEach((sheet, idx) => {
    files.push({ name: `xl/worksheets/sheet${idx + 1}.xml`, data: makeWorksheetXml(sheet, idx === 0) });
  });
  return buildZipArchive(files);
}
