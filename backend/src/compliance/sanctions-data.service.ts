import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import * as fs from 'node:fs';
import * as path from 'node:path';

@Injectable()
export class SanctionsDataService implements OnModuleInit {
  private readonly logger = new Logger(SanctionsDataService.name);
  private names: string[] = [];

  onModuleInit() {
    const dataDir = path.resolve(__dirname, '../../../data/sanctions');
    this.names = [
      ...this.loadEu(path.join(dataDir, 'sanctions-eu.xml')),
      ...this.loadUn(path.join(dataDir, 'sanctions-un.xml')),
    ];
    this.logger.log(`Loaded ${this.names.length} sanctioned names from local data`);
  }

  /** Returns the number of sanction list hits for a given query name. */
  screen(query: string): number {
    const q = this.normalize(query);
    if (q.length < 4) return 0;
    let hits = 0;
    for (const name of this.names) {
      if (this.matches(q, name)) hits++;
    }
    return hits;
  }

  private matches(q: string, s: string): boolean {
    if (q === s) return true;
    // containment (both directions, guard against trivial short strings)
    if (q.length >= 6 && s.includes(q)) return true;
    if (s.length >= 6 && q.includes(s)) return true;
    // token overlap: ≥60% of the shorter set's meaningful tokens (≥4 chars) must match
    const qToks = q.split(' ').filter(t => t.length >= 4);
    const sToks = s.split(' ').filter(t => t.length >= 4);
    if (qToks.length === 0 || sToks.length === 0) return false;
    const sSet = new Set(sToks);
    const overlap = qToks.filter(t => sSet.has(t)).length;
    const shorter = Math.min(qToks.length, sToks.length);
    return overlap / shorter >= 0.6;
  }

  private normalize(s: string): string {
    return s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // strip diacritics
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')        // punctuation → space
      .replace(/\s+/g, ' ')
      .trim();
  }

  private add(names: string[], raw: unknown) {
    if (typeof raw === 'string' && raw.trim().length > 2) {
      names.push(this.normalize(raw.trim()));
    }
  }

  // ── EU sanctions XML ──────────────────────────────────────────────────────

  private loadEu(filePath: string): string[] {
    const names: string[] = [];
    try {
      const xml = fs.readFileSync(filePath, 'utf-8');
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
      const doc = parser.parse(xml) as Record<string, unknown>;
      const root = doc['export'] as Record<string, unknown> | undefined;
      if (!root) return names;

      const entities = this.toArray(root['sanctionEntity']);
      for (const entity of entities) {
        const e = entity as Record<string, unknown>;
        const aliases = this.toArray(e['nameAlias']);
        for (const alias of aliases) {
          const a = alias as Record<string, string>;
          this.add(names, a['@_wholeName']);
          const full = [a['@_firstName'], a['@_middleName'], a['@_lastName']]
            .filter(Boolean).join(' ');
          this.add(names, full);
        }
      }
    } catch (e) {
      this.logger.warn(`Failed to load EU sanctions: ${(e as Error).message}`);
    }
    return names;
  }

  // ── UN sanctions XML ──────────────────────────────────────────────────────

  private loadUn(filePath: string): string[] {
    const names: string[] = [];
    try {
      const xml = fs.readFileSync(filePath, 'utf-8');
      const parser = new XMLParser({ ignoreAttributes: false });
      const doc = parser.parse(xml) as Record<string, unknown>;
      const root = doc['CONSOLIDATED_LIST'] as Record<string, unknown> | undefined;
      if (!root) return names;

      // Individuals
      const individualsBlock = root['INDIVIDUALS'] as Record<string, unknown> | undefined;
      for (const ind of this.toArray(individualsBlock?.['INDIVIDUAL'])) {
        const i = ind as Record<string, unknown>;
        const full = [i['FIRST_NAME'], i['SECOND_NAME'], i['THIRD_NAME'], i['FOURTH_NAME']]
          .filter(v => typeof v === 'string' && v.trim().length > 0)
          .join(' ');
        this.add(names, full);
        for (const alias of this.toArray(i['INDIVIDUAL_ALIAS'])) {
          this.add(names, (alias as Record<string, unknown>)['ALIAS_NAME']);
        }
      }

      // Entities
      const entitiesBlock = root['ENTITIES'] as Record<string, unknown> | undefined;
      for (const ent of this.toArray(entitiesBlock?.['ENTITY'])) {
        const e = ent as Record<string, unknown>;
        this.add(names, e['FIRST_NAME']);
        for (const alias of this.toArray(e['ENTITY_ALIAS'])) {
          this.add(names, (alias as Record<string, unknown>)['ALIAS_NAME']);
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to load UN sanctions: ${(err as Error).message}`);
    }
    return names;
  }

  private toArray(v: unknown): unknown[] {
    if (Array.isArray(v)) return v;
    if (v !== undefined && v !== null) return [v];
    return [];
  }
}
