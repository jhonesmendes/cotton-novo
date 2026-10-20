// Gera um .xlsx de verdade (Office Open XML) no próprio navegador, sem
// biblioteca de planilha: o .xlsx é um zip com alguns XMLs. O zip é montado sem
// compressão ("stored"), o que basta para listas de cadastro.
type Valor = string | number | null | undefined;

const escapar = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    // Caracteres de controle são inválidos em XML (exceto tab/quebra de linha).
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

// Coluna 0 → A, 25 → Z, 26 → AA...
function coluna(i: number) {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

function celula(v: Valor, ref: string, estilo = '') {
  if (v == null || v === '') return '';
  if (typeof v === 'number') return `<c r="${ref}"${estilo}><v>${v}</v></c>`;
  return `<c r="${ref}" t="inlineStr"${estilo}><is><t xml:space="preserve">${escapar(v)}</t></is></c>`;
}

function planilha(cabecalho: string[], linhas: Valor[][]) {
  const todas: Valor[][] = [cabecalho, ...linhas];
  const larguras = cabecalho.map((_, c) => Math.min(60, Math.max(10, ...todas.map((l) => String(l[c] ?? '').length + 2))));
  const rows = todas.map((l, r) =>
    `<row r="${r + 1}">${l.map((v, c) => celula(v, `${coluna(c)}${r + 1}`, r === 0 ? ' s="1"' : '')).join('')}</row>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols>${larguras.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>
<sheetData>${rows}</sheetData>
</worksheet>`;
}

function arquivosXlsx(aba: string, cabecalho: string[], linhas: Valor[][]): [string, string][] {
  // Nome de aba: até 31 caracteres, sem : \ / ? * [ ]
  const nomeAba = escapar(aba.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31) || 'Planilha');
  return [
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${nomeAba}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`],
    // Estilo 0 = padrão; estilo 1 = negrito (cabeçalho).
    ['xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>
</styleSheet>`],
    ['xl/worksheets/sheet1.xml', planilha(cabecalho, linhas)],
  ];
}

const TABELA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(dados: Uint8Array) {
  let c = 0xffffffff;
  for (const b of dados) c = TABELA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Zip mínimo sem compressão: cabeçalho local + dados de cada arquivo, depois o diretório central.
export function zipSemCompressao(arquivos: [string, string][]): Uint8Array {
  const enc = new TextEncoder();
  const partes: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const [nome, conteudo] of arquivos) {
    const nomeB = enc.encode(nome);
    const dados = enc.encode(conteudo);
    const crc = crc32(dados);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // nomes em UTF-8
    local.setUint32(14, crc, true);
    local.setUint32(18, dados.length, true);
    local.setUint32(22, dados.length, true);
    local.setUint16(26, nomeB.length, true);
    partes.push(new Uint8Array(local.buffer), nomeB, dados);

    const dir = new DataView(new ArrayBuffer(46));
    dir.setUint32(0, 0x02014b50, true);
    dir.setUint16(4, 20, true);
    dir.setUint16(6, 20, true);
    dir.setUint16(8, 0x0800, true);
    dir.setUint32(16, crc, true);
    dir.setUint32(20, dados.length, true);
    dir.setUint32(24, dados.length, true);
    dir.setUint16(28, nomeB.length, true);
    dir.setUint32(42, offset, true);
    central.push(new Uint8Array(dir.buffer), nomeB);
    offset += 30 + nomeB.length + dados.length;
  }
  const tamanhoCentral = central.reduce((s, p) => s + p.length, 0);
  const fim = new DataView(new ArrayBuffer(22));
  fim.setUint32(0, 0x06054b50, true);
  fim.setUint16(8, arquivos.length, true);
  fim.setUint16(10, arquivos.length, true);
  fim.setUint32(12, tamanhoCentral, true);
  fim.setUint32(16, offset, true);

  const todas = [...partes, ...central, new Uint8Array(fim.buffer)];
  const saida = new Uint8Array(todas.reduce((s, p) => s + p.length, 0));
  let pos = 0;
  for (const p of todas) { saida.set(p, pos); pos += p.length; }
  return saida;
}

export function gerarXlsx(aba: string, cabecalho: string[], linhas: Valor[][]) {
  return zipSemCompressao(arquivosXlsx(aba, cabecalho, linhas));
}

export function exportarXlsx(arquivo: string, aba: string, cabecalho: string[], linhas: Valor[][]) {
  const blob = new Blob([gerarXlsx(aba, cabecalho, linhas).buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${arquivo}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
