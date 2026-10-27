import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACCORDIV_SYMBOL_SVG, ACCORDIV_LOGO_SVG, ACCORDIV_LOGO_LIGHT_SVG, DEMO_WATERMARK_OPACITY, SYMBOL_SIZE, demoWatermarkBackground } from '../src/config/branding.js';
import { createDemoData } from '../src/data/createDemoData.js';
import { buildInvoicePdfDefinition, invoicePdfDefinition } from '../src/services/invoicePdf.js';

test('brand assets are matching outlined vectors without raster images, text or remote resources', () => {
  for (const [name, expected] of [['accordiv-symbol.svg', ACCORDIV_SYMBOL_SVG], ['accordiv-logo.svg', ACCORDIV_LOGO_SVG], ['accordiv-logo-light.svg', ACCORDIV_LOGO_LIGHT_SVG]]) {
    const actual = readFileSync(new URL('../src/assets/' + name, import.meta.url), 'utf8').trim();
    assert.equal(actual, expected);
    assert.doesNotMatch(actual, /<image|<text|<script|<rect|(?:href|font-family)=|data:image/i);
    assert.match(actual, /<path/);
  }
  const paths = svg => [...svg.matchAll(/<path[^>]+>/g)].slice(0, 2).map(match => [match[0].match(/\bfill="([^"]+)"/)[1], match[0].match(/\bd="([^"]+)"/)[1]]);
  assert.deepEqual(paths(ACCORDIV_LOGO_SVG), paths(ACCORDIV_SYMBOL_SVG));
  assert.deepEqual(paths(ACCORDIV_LOGO_LIGHT_SVG), paths(ACCORDIV_SYMBOL_SVG));
  const favicon = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8');
  assert.deepEqual([...favicon.matchAll(/d="([^"]+)"/g)].map(m => m[1]), [...ACCORDIV_SYMBOL_SVG.matchAll(/d="([^"]+)"/g)].map(m => m[1]));
});

test('demo backgrounds preserve symbol proportions and page centre on every page size', () => {
  assert.ok(DEMO_WATERMARK_OPACITY >= 0.05 && DEMO_WATERMARK_OPACITY <= 0.08);
  for (const size of [{ width: 595.28, height: 841.89 }, { width: 841.89, height: 595.28 }]) {
    for (const page of [1, 2, 7]) {
      const background = demoWatermarkBackground(page, size);
      assert.ok(Math.abs(background.width / background.height - SYMBOL_SIZE.width / SYMBOL_SIZE.height) < 1e-12);
      assert.ok(Math.abs(background.absolutePosition.x + background.width / 2 - size.width / 2) < 1e-8);
      assert.ok(Math.abs(background.absolutePosition.y + background.height / 2 - size.height / 2) < 1e-8);
      assert.match(background.svg, /<g opacity="0.065">/);
      assert.ok(background.width < size.width && background.height < size.height);
    }
  }
});

test('demo-only background leaves charges, saved business details and owner presentation intact', () => {
  const data = createDemoData('2026-10-26');
  const invoice = data.invoices.find(record => record.status === 'issued');
  const before = structuredClone(data);
  const demo = invoicePdfDefinition(data, invoice.id, '2026-10-26');
  const owner = buildInvoicePdfDefinition(data, invoice.id, '2026-10-26', new Date(), false);
  assert.equal(typeof demo.background, 'function');
  assert.equal(owner.background, undefined);
  assert.deepEqual(demo.pageMargins, owner.pageMargins);
  assert.match(demo.content[0].svg, /<path/);
  assert.ok(JSON.stringify(owner.content).includes(invoice.issuerSnapshot.name));
  assert.deepEqual(data, before);
});
