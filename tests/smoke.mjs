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
  const duplicateIds = await page.locator('[id]').evaluateAll(nodes => {
    const seen = new Set(), duplicates = [];
    for (const node of nodes) { if (seen.has(node.id)) duplicates.push(node.id); seen.add(node.id); }
    return duplicates;
  });
  assert.deepEqual(duplicateIds, [], 'Home must not contain duplicate element IDs');
  assert.equal(await page.locator('#play').evaluate(el => el.open), false, 'Feature groups should start collapsed for a clean home screen');
  assert.equal(await page.locator('#play').isVisible(), false, 'Feature sections should remain hidden behind the entry gate');
  await page.locator('#surprise').click();
  await page.locator('#modal.open').waitFor();
  await page.locator('#dismiss').click();
  await page.locator('#enterVerseHero').click();
  await page.locator('body.verse-entered').waitFor({ timeout: 5000 });
  await page.locator('.portal[data-title="Mind Mirror"]').click();
  await page.locator('input[name="a"][value="curiosity"]').check();
  await page.locator('input[name="b"][value="logic"]').check();
  await page.locator('input[name="c"][value="heart"]').check();
  await page.locator('#mindForm button[type="submit"]').click();
  await page.locator('#mindResult').getByText('THE FRONTIER SOUL').waitFor();
  await page.locator('#dismiss').click();

  await page.locator('[data-open-category="play"]').click();
  assert.equal(await page.locator('#play').evaluate(el => el.open), true);
  await page.locator('#arcadeCanvas').waitFor();
  assert.equal(await page.locator('#riftStart').count(), 1, 'Single-player rift control must be unique');
  assert.equal(await page.locator('#roomRiftStart').count(), 1, 'Shared-room rift control must have its own unique ID');
  assert.equal(await page.locator('#riftStatus').count(), 1);
  assert.equal(await page.locator('#roomRiftStatus').count(), 1);

  await page.locator('[data-open-category="connect"]').click();
  assert.equal(await page.locator('#connect').evaluate(el => el.open), true);
  await page.locator('#commandLauncher').click();
  await page.locator('#commandSearch').fill('GODSEYE');
  await page.locator('.command-item').first().click();
  assert.equal(await page.locator('#discover').evaluate(el => el.open), true, 'Command deck should open the Discover section before navigating');
  await page.waitForFunction(() => document.getElementById('godseyeStatus')?.textContent !== 'CONNECTING TO PUBLIC DATA', null, { timeout: 10000 });

  await page.goto('http://127.0.0.1:4173/nexus-visual-builder.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#canvas .canvas-section').first().waitFor();
  const initial = await page.locator('#canvas .canvas-section').count();
  await page.locator('[data-add="text"]').click();
  assert.equal(await page.locator('#canvas .canvas-section').count(), initial + 1, 'Visual builder should add a section');
  await page.locator('#undo').click();
  assert.equal(await page.locator('#canvas .canvas-section').count(), initial, 'Undo should remove the added section');
  await page.locator('#redo').click();
  assert.equal(await page.locator('#canvas .canvas-section').count(), initial + 1, 'Redo should restore the section');
  const firstBeforeDrag = await page.locator('#canvas .canvas-section').first().locator('h1,h2').first().textContent();
  await page.locator('[data-add="button"]').dragTo(page.locator('#canvas .canvas-section').first());
  assert.equal(await page.locator('#canvas .canvas-section').count(), initial + 2, 'Dragging a palette block onto a section should add one block');
  assert.equal(await page.locator('#canvas .canvas-section').first().locator('h1,h2').first().textContent(), firstBeforeDrag, 'Palette drop must not reorder an existing section');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#exportHtml').click()
  ]);
  assert.match(download.suggestedFilename(), /\.html$/i);

  await page.goto('http://127.0.0.1:4173/nexus-studio.html', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-template="app"]').click();
  const studioFrame = page.frameLocator('#preview');
  await studioFrame.locator('#taskInput').fill('Smoke test task');
  await studioFrame.locator('#taskForm button').click();
  assert.equal(await studioFrame.locator('#tasks li').count(), 1, 'Focus Board template should add a task inside the sandbox');
  await studioFrame.locator('#tasks li input[type="checkbox"]').check();
  assert.equal(await studioFrame.locator('#tasks li').getAttribute('class'), 'done', 'Focus Board task should toggle complete');
  await studioFrame.locator('#tasks li button.remove').click();
  assert.equal(await studioFrame.locator('#tasks li').count(), 0, 'Focus Board should remove a task');

  await page.locator('[data-template="game"]').click();
  await studioFrame.locator('#arena').waitFor();
  await studioFrame.locator('#start').click();

  await page.locator('#htmlCode').waitFor();
  await page.locator('#htmlCode').fill('<h1 id="smoke-check">NEXUS PREVIEW WORKS</h1>');
  await page.locator('#run').click();
  await page.frameLocator('#preview').locator('#smoke-check').waitFor();
  assert.equal(await page.frameLocator('#preview').locator('#smoke-check').textContent(), 'NEXUS PREVIEW WORKS');

  if (pageErrors.length) throw new Error('Browser runtime errors: ' + pageErrors.join(' | '));
  console.log('PASS: homepage, Surprise Me, category navigation, portal mini-experience, category navigation, unique room controls, Visual Builder add/undo/redo/drag/export, Focus Board task actions, Star Catcher startup and Code Studio live preview.');
} finally {
  await browser.close();
}
