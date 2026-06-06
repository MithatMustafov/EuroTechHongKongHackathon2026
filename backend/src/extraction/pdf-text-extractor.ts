import { createRequire } from 'node:module';
import { inflateSync } from 'node:zlib';
import { normalizeText, toLines } from './normalizers';

export type PdfTextExtractionResult = {
  text: string;
  lines: string[];
  warnings: string[];
  scannedOrImageOnly: boolean;
};

type PdfStream = {
  dictionary: string;
  bytes: Uint8Array;
};

const latin1Decoder = new TextDecoder('latin1');
const utf8Decoder = new TextDecoder('utf-8');
const requireOptional = createRequire(__filename);

export async function extractPdfText(
  pdf: Uint8Array,
): Promise<PdfTextExtractionResult> {
  const warnings: string[] = [];
  const textFromLibrary = await tryPdfParse(pdf, warnings);
  const fallbackText = extractTextWithBuiltInParser(pdf);
  const text = chooseBestText(textFromLibrary, fallbackText);
  const normalizedText = normalizeText(text);
  const lines = toLines(normalizedText);
  const scannedOrImageOnly =
    looksLikePdfWithImages(pdf) && !hasPdfTextOperators(pdf);

  if (scannedOrImageOnly) {
    warnings.push(
      'PDF appears to be scanned or image-only; OCR is not implemented.',
    );
  } else if (lines.length === 0) {
    warnings.push('No extractable text was found in the PDF.');
  }

  return {
    text: scannedOrImageOnly ? '' : normalizedText,
    lines: scannedOrImageOnly ? [] : lines,
    warnings,
    scannedOrImageOnly,
  };
}

async function tryPdfParse(
  pdf: Uint8Array,
  warnings: string[],
): Promise<string> {
  try {
    const pdfParse = requireOptional('pdf-parse') as
      | ((buffer: Buffer) => Promise<{ text?: string }>)
      | { default?: (buffer: Buffer) => Promise<{ text?: string }> };
    const parse = typeof pdfParse === 'function' ? pdfParse : pdfParse.default;

    if (!parse) {
      return '';
    }

    const result = await parse(Buffer.from(pdf));
    return result.text || '';
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code?: unknown }).code)
        : '';

    if (code !== 'MODULE_NOT_FOUND') {
      warnings.push(`pdf-parse failed; built-in PDF text fallback was used.`);
    }

    return '';
  }
}

function chooseBestText(primary: string, fallback: string): string {
  const primaryLines = toLines(primary);
  const fallbackLines = toLines(fallback);

  if (primaryLines.length >= fallbackLines.length) {
    return primary;
  }

  return fallback;
}

function extractTextWithBuiltInParser(pdf: Uint8Array): string {
  const binary = latin1Decoder.decode(pdf);
  const streams = extractPdfStreams(binary, pdf);
  const textChunks = [extractPdfTextOperators(binary)];
  const readableChunks = [extractReadableText(binary)];

  for (const stream of streams) {
    const streamBytes = decodePdfStream(stream);
    const streamText = latin1Decoder.decode(streamBytes);
    textChunks.push(extractPdfTextOperators(streamText));
    readableChunks.push(extractReadableText(streamText));
  }

  const text = textChunks.filter(Boolean).join('\n');

  if (toLines(text).length > 0) {
    return text;
  }

  return readableChunks.filter(Boolean).join('\n');
}

function extractPdfStreams(binary: string, pdf: Uint8Array): PdfStream[] {
  const streams: PdfStream[] = [];
  let searchFrom = 0;

  while (searchFrom < binary.length) {
    const streamKeywordIndex = binary.indexOf('stream', searchFrom);

    if (streamKeywordIndex === -1) {
      break;
    }

    let streamStart = streamKeywordIndex + 'stream'.length;

    if (binary[streamStart] === '\r' && binary[streamStart + 1] === '\n') {
      streamStart += 2;
    } else if (binary[streamStart] === '\n' || binary[streamStart] === '\r') {
      streamStart += 1;
    }

    const streamEnd = binary.indexOf('endstream', streamStart);

    if (streamEnd === -1) {
      break;
    }

    const dictionaryStart = binary.lastIndexOf('<<', streamKeywordIndex);
    const dictionaryEnd = binary.lastIndexOf('>>', streamKeywordIndex);
    const dictionary =
      dictionaryStart !== -1 && dictionaryEnd > dictionaryStart
        ? binary.slice(dictionaryStart, dictionaryEnd + 2)
        : '';

    streams.push({
      dictionary,
      bytes: pdf.slice(streamStart, trimStreamEnd(binary, streamEnd)),
    });

    searchFrom = streamEnd + 'endstream'.length;
  }

  return streams;
}

function trimStreamEnd(binary: string, streamEnd: number): number {
  if (binary[streamEnd - 2] === '\r' && binary[streamEnd - 1] === '\n') {
    return streamEnd - 2;
  }

  if (binary[streamEnd - 1] === '\n' || binary[streamEnd - 1] === '\r') {
    return streamEnd - 1;
  }

  return streamEnd;
}

function decodePdfStream(stream: PdfStream): Uint8Array {
  const filters = findStreamFilters(stream.dictionary);
  let bytes = stream.bytes;

  for (const filter of filters) {
    try {
      if (filter === 'ASCII85Decode' || filter === 'A85') {
        bytes = decodeAscii85(bytes);
      } else if (filter === 'FlateDecode' || filter === 'Fl') {
        bytes = inflateSync(bytes);
      }
    } catch {
      return stream.bytes;
    }
  }

  return bytes;
}

function findStreamFilters(dictionary: string): string[] {
  const filterSection = dictionary.match(
    /\/Filter\s*(\[[^\]]+\]|\/[A-Za-z0-9]+)/,
  );

  if (!filterSection) {
    return [];
  }

  return [...filterSection[1].matchAll(/\/([A-Za-z0-9]+)/g)].map(
    (match) => match[1],
  );
}

function decodeAscii85(bytes: Uint8Array): Uint8Array {
  const encoded = latin1Decoder
    .decode(bytes)
    .replace(/^<~/, '')
    .replace(/~>[\s\S]*$/, '')
    .replace(/\s/g, '');
  const decoded: number[] = [];
  let group = '';

  for (const char of encoded) {
    if (char === 'z' && group.length === 0) {
      decoded.push(0, 0, 0, 0);
      continue;
    }

    group += char;

    if (group.length === 5) {
      decoded.push(...decodeAscii85Group(group, 4));
      group = '';
    }
  }

  if (group.length > 0) {
    decoded.push(...decodeAscii85Group(group.padEnd(5, 'u'), group.length - 1));
  }

  return new Uint8Array(decoded);
}

function decodeAscii85Group(group: string, outputLength: number): number[] {
  let value = 0;

  for (const char of group) {
    value = value * 85 + (char.charCodeAt(0) - 33);
  }

  return [
    (value >>> 24) & 255,
    (value >>> 16) & 255,
    (value >>> 8) & 255,
    value & 255,
  ].slice(0, outputLength);
}

function extractPdfTextOperators(content: string): string {
  const chunks: string[] = [];
  const operatorPattern =
    /(\((?:\\.|[^\\()])*\)|<[\dA-Fa-f\s]+>|\[(?:\s*(?:\((?:\\.|[^\\()])*\)|<[\dA-Fa-f\s]+>|-?\d+(?:\.\d+)?)\s*)+\])\s*(?:Tj|'|"|TJ)\b/g;
  let match: RegExpExecArray | null;

  while ((match = operatorPattern.exec(content)) !== null) {
    chunks.push(decodePdfTextToken(match[1]));
  }

  return chunks.join('\n');
}

function decodePdfTextToken(token: string): string {
  if (token.startsWith('[')) {
    const innerTokens =
      token.match(/\((?:\\.|[^\\()])*\)|<[\dA-Fa-f\s]+>/g) || [];

    return innerTokens.map(decodePdfTextToken).join('');
  }

  if (token.startsWith('<')) {
    return decodeHexPdfString(token);
  }

  return decodeLiteralPdfString(token);
}

function decodeLiteralPdfString(token: string): string {
  const value = token.slice(1, -1);

  return value.replace(
    /\\([nrtbf()\\]|[0-7]{1,3}|\r?\n|\r)/g,
    (_match: string, escaped: string) => {
      if (escaped === 'n') {
        return '\n';
      }
      if (escaped === 'r') {
        return '\r';
      }
      if (escaped === 't') {
        return '\t';
      }
      if (escaped === 'b') {
        return '\b';
      }
      if (escaped === 'f') {
        return '\f';
      }
      if (/^[0-7]{1,3}$/.test(escaped)) {
        return String.fromCharCode(Number.parseInt(escaped, 8));
      }
      if (escaped === '\n' || escaped === '\r' || escaped === '\r\n') {
        return '';
      }

      return escaped;
    },
  );
}

function decodeHexPdfString(token: string): string {
  const hex = token.slice(1, -1).replace(/\s/g, '');
  const paddedHex = hex.length % 2 === 0 ? hex : `${hex}0`;
  const bytes = new Uint8Array(paddedHex.length / 2);

  for (let index = 0; index < paddedHex.length; index += 2) {
    bytes[index / 2] = Number.parseInt(paddedHex.slice(index, index + 2), 16);
  }

  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return decodeUtf16Be(bytes.slice(2));
  }

  return utf8Decoder.decode(bytes);
}

function decodeUtf16Be(bytes: Uint8Array): string {
  let text = '';

  for (let index = 0; index + 1 < bytes.length; index += 2) {
    text += String.fromCharCode((bytes[index] << 8) | bytes[index + 1]);
  }

  return text;
}

function extractReadableText(content: string): string {
  return [...content]
    .map((char) => {
      const code = char.charCodeAt(0);

      return code === 9 ||
        code === 10 ||
        code === 13 ||
        (code >= 32 && code <= 126)
        ? char
        : ' ';
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function looksLikePdfWithImages(pdf: Uint8Array): boolean {
  const binary = latin1Decoder.decode(pdf.slice(0, 20000));

  return /\/Subtype\s*\/Image\b/i.test(binary);
}

function hasPdfTextOperators(pdf: Uint8Array): boolean {
  const binary = latin1Decoder.decode(pdf);

  return /\b(?:Tj|TJ)\b/.test(binary);
}
