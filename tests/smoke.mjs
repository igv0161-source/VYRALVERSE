import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));

try {
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  assert.match(await page.title(), /VYRALVERSE/i);
  await page.locator('.hero').waitFor();
  assert.equal(await page.locator('.portal').count(), 6, 'Home should show exactly six original worlds');

  await page.locator('#surprise').click();
  await page.locator('#modal.open').waitFor();
  await page.locator('#dismiss').click();

  await page.locator('[data-open-category="play"]').click();
  assert.equal(await page.locator('#play').evaluate(el => el.open), true);
  await page.locator('#arcadeCanvas').waitFor();

  await page.locator('[data-open-category="connect"]').click();
  assert.equal(await page.locator('#connect').evaluate(el => el.open), true);

  await page.goto('http://127.0.0.1:4173/nexus-visual-builder.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#canvas .canvas-section').first().waitFor();
  const initial = await page.locator('#canvas .canvas-section').count();
  await page.locator('[data-add="text"]').click();
  assert.equal(await page.locator('#canvas .canvas-section').count(), initial + 1, 'Visual builder should add a section');
  await page.locator('#undo').click();
  assert.equal(await page.locator('#canvas .canvas-section').count(), initial, 'Undo should remove the added section');
  await page.locator('#redo').click();
  assert.equal(await page.locator('#canvas .canvas-section').count(), initial + 1, 'Redo should restore the section');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#exportHtml').click()
  ]);
  assert.match(download.suggestedFilename(), /\.html$/i);

  await page.goto('http://127.0.0.1:4173/nexus-studio.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#htmlCode').waitFor();
  await page.locator('#htmlCode').fill('<h1 id="smoke-check">NEXUS PREVIEW WORKS</h1>');
  await page.locator('#run').click();
  await page.frameLocator('#preview').locator('#smoke-check').waitFor();
  assert.equal(await page.frameLocator('#preview').locator('#smoke-check').textContent(), 'NEXUS PREVIEW WORKS');

  if (pageErrors.length) throw new Error('Browser runtime errors: ' + pageErrors.join(' | '));
  console.log('PASS: homepage, Surprise Me, category navigation, Visual Builder add/undo/redo/export, Code Studio live preview.');
} finally {
  await browser.close();
}
