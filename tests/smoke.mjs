import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

try {
  // Clean entry screen, original worlds and the gated experience.
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  assert.match(await page.title(), /VYRALVERSE/i);
  await page.locator('body.ready').waitFor({ timeout: 15000 });
  assert.equal(await page.locator('.portal').count(), 6, 'Home should show exactly six original worlds');
  assert.equal(await page.locator('#play').isVisible(), false, 'Feature sections should stay hidden behind the entry gate');
  const duplicateIds = await page.locator('[id]').evaluateAll(nodes => {
    const seen = new Set(), duplicates = [];
    for (const node of nodes) { if (seen.has(node.id)) duplicates.push(node.id); seen.add(node.id); }
    return duplicates;
  });
  assert.deepEqual(duplicateIds, [], 'Home must not contain duplicate element IDs');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Entry screen must fit a mobile viewport');
  await page.setViewportSize({ width: 1365, height: 900 });

  await page.locator('#surprise').click();
  await page.locator('#modal.open').waitFor();
  await page.locator('#dismiss').click();
  await page.locator('#enterVerseHero').click();
  await page.locator('body.verse-entered').waitFor({ timeout: 5000 });

  // A real portal experience and today's seeded daily puzzle.
  await page.locator('.portal[data-title="Mind Mirror"]').click();
  await page.locator('input[name="a"][value="curiosity"]').check();
  await page.locator('input[name="b"][value="logic"]').check();
  await page.locator('input[name="c"][value="heart"]').check();
  await page.locator('#mindForm button.play-button').click();
  await page.locator('#mindResult').getByText('THE FRONTIER SOUL').waitFor();
  await page.locator('#dismiss').click();

  await page.locator('.portal[data-title="Roast Reactor"]').click();
  await page.locator('#roastName').fill('Smoke Tester');
  await page.locator('#roastGo').click();
  await page.locator('#roastResult').getByText('Smoke Tester,').waitFor();
  await page.locator('#dismiss').click();

  await page.locator('.portal[data-title="Future Frame"]').click();
  await page.locator('#futureGoal').fill('Build a kinder and more creative future');
  await page.locator('#futureGo').click();
  await page.locator('#futureResult').getByText('LOCAL CONCEPT DRAFT').waitFor();
  await page.locator('#dismiss').click();

  await page.locator('.portal[data-title="Mystery Drop"]').click();
  await page.locator('#riddleHint').click();
  await page.locator('#riddleResult').getByText('fold me').waitFor();
  await page.locator('#riddleAnswer').fill('map');
  await page.locator('#riddleGo').click();
  await page.locator('#riddleResult').getByText('CORRECT').waitFor();
  await page.locator('#dismiss').click();

  await page.locator('.portal[data-title="Dream Studio"]').click();
  await page.locator('#dreamIdea').fill('A floating garden above a quiet ocean');
  await page.locator('#dreamGo').click();
  await page.locator('#dreamResult').getByText('YOUR CONCEPT SEED').waitFor();
  await page.locator('#dismiss').click();

  await page.locator('.portal[data-title="Friend Quests"]').click();
  await page.locator('#questGo').click();
  await page.locator('#questResult button').getByText('SHARE QUEST').waitFor();
  await page.locator('#dismiss').click();

  await page.locator('[data-open-category="play"]').click();
  await page.locator('#answer').fill('ORBIT');
  await page.locator('#answerForm button').click();
  await page.locator('#signalStatus').getByText('SIGNAL DECODED').waitFor();

  // Account and recovery UI must open without pretending the visitor is signed in.
  await page.locator('#accountButton').click();
  assert.equal(await page.locator('#accountModal').evaluate(el => el.classList.contains('open')), true);
  await page.locator('#accountSwitch').click();
  await page.locator('#passwordRecoveryLink').click();
  assert.match(await page.locator('#accountTitle').textContent(), /Reset your password/i);
  await page.locator('#accountClose').click();

  // Navigation must open the correct collapsed feature group.
  await page.locator('[data-open-category="connect"]').click();
  assert.equal(await page.locator('#connect').evaluate(el => el.open), true);
  for (const target of ['top', 'portals', 'play', 'create', 'connect', 'discover']) {
    await page.locator('.vv-tab[data-target="' + target + '"]').click();
    if (['play', 'connect', 'discover'].includes(target)) {
      assert.equal(await page.locator('#' + target).evaluate(el => el.open), true, target + ' dock item should open its feature group');
    }
  }
  await page.locator('.vv-tab[data-target="profile"]').click();
  assert.equal(await page.locator('#accountModal').evaluate(el => el.classList.contains('open')), true, 'Profile dock item should open account identity');
  await page.locator('#accountClose').click();
  await page.locator('[data-open-category="connect"]').click();
  await page.locator('#discussionMessages .discussion-empty').waitFor({ timeout: 15000 });
  await page.locator('#communityFeed').getByText('No public creations yet').waitFor({ timeout: 15000 });
  assert.equal(await page.locator('#roomTitle').isDisabled(), true, 'Private rooms must require an authenticated explorer');
  assert.equal(await page.locator('#discussionInput').isDisabled(), true, 'Posting to public chat must require authentication');
  await page.locator('#commandLauncher').click();
  await page.locator('#commandSearch').fill('GODSEYE');
  await page.locator('.command-item').first().click();
  assert.equal(await page.locator('#discover').evaluate(el => el.open), true, 'Command deck should open Discover before navigating');
  await page.waitForFunction(() => { const t = document.getElementById('godseyeStatus')?.textContent || ''; return !t.includes('CONNECTING') && !t.includes('SYNCING'); }, null, { timeout: 25000 });
  assert.ok(Number(await page.locator('#godseyeQuakes').textContent()) > 0, 'USGS feed should return real earthquake records');
  assert.ok(Number(await page.locator('#godseyeEvents').textContent()) > 0, 'GDACS feed should return real disaster records');
  assert.notEqual(await page.locator('#godseyeLat').textContent(), '—', 'ISS position should load');
  await page.locator('#godseyeCity').fill('Pune');
  await page.locator('#godseyeWeatherForm button').click();
  await page.waitForFunction(() => document.getElementById('godseyeWeather')?.textContent.includes('°C'), null, { timeout: 30000 });

  // Visual Builder: add/edit history, palette drag/drop, safe project import, exports and auth gate.
  await page.goto('http://127.0.0.1:4173/nexus-visual-builder.html', { waitUntil: 'domcontentloaded' });
  await page.locator('#canvas .canvas-section').first().waitFor();
  const initial = await page.locator('#canvas .canvas-section').count();
  await page.locator('[data-add="text"]').click();
  assert.equal(await page.locator('#canvas .canvas-section').count(), initial + 1);
  await page.locator('#undo').click();
  assert.equal(await page.locator('#canvas .canvas-section').count(), initial);
  await page.locator('#redo').click();
  assert.equal(await page.locator('#canvas .canvas-section').count(), initial + 1);
  const firstBeforeDrag = await page.locator('#canvas .canvas-section').first().locator('h1,h2').first().textContent();
  await page.locator('[data-add="button"]').dragTo(page.locator('#canvas .canvas-section').first());
  assert.equal(await page.locator('#canvas .canvas-section').count(), initial + 2);
  assert.equal(await page.locator('#canvas .canvas-section').first().locator('h1,h2').first().textContent(), firstBeforeDrag);

  const [htmlDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#exportHtml').click()
  ]);
  assert.match(htmlDownload.suggestedFilename(), /\.html$/i);
  const unsafeProject = {
    format: 'vyralverse-visual-project', version: 1, title: 'Import safety check',
    bg: 'red; background:url(javascript:alert(1))', color: '#172033',
    elements: [{ type: 'button', title: 'Safe import', body: 'Imported text', button: 'Open',
      href: 'javascript:alert(1)', bg: '#ffffff', color: '#172033', align: 'center' }]
  };
  await page.locator('#importFile').setInputFiles({
    name: 'vyralverse-project.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(unsafeProject))
  });
  await page.locator('#status').getByText('PROJECT IMPORTED').waitFor();
  assert.equal(await page.locator('#canvas a').getAttribute('href'), '#', 'Unsafe imported links must be neutralized');
  await page.locator('#saveLocal').click();
  await page.reload();
  assert.equal(await page.locator('#projectTitle').inputValue(), 'Import safety check', 'Visual Builder local project should restore after reload');
  assert.equal(await page.locator('#canvas a').getAttribute('href'), '#', 'Restored local project must retain sanitized links');
  await page.locator('#cloudSave').click();
  assert.equal(await page.locator('#authOverlay').evaluate(el => el.classList.contains('open')), true, 'Cloud save must request real authentication');
  await page.locator('#authClose').click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Visual Builder must not overflow mobile width');

  // NEXUS Code Studio: real mini-app form, game restart, sandbox preview, import/export and local save.
  await page.goto('http://127.0.0.1:4173/nexus-studio.html', { waitUntil: 'domcontentloaded' });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Code Studio header must fit mobile width');
  await page.locator('[data-template="app"]').click();
  const studioFrame = page.frameLocator('#preview');
  await studioFrame.locator('#taskInput').fill('Smoke test task');
  await studioFrame.locator('#taskForm button').click();
  assert.equal(await studioFrame.locator('#tasks li').count(), 1, 'Focus Board should create a task');
  await studioFrame.locator('#tasks li input[type="checkbox"]').check();
  assert.equal(await studioFrame.locator('#tasks li').getAttribute('class'), 'done');
  await studioFrame.locator('#tasks li button.remove').click();
  assert.equal(await studioFrame.locator('#tasks li').count(), 0);

  await page.locator('[data-template="game"]').click();
  await studioFrame.locator('#arena').waitFor();
  await studioFrame.locator('#start').click();
  await page.waitForTimeout(120);
  await studioFrame.locator('#start').click(); // Restart must not throw or retain old game state.
  await page.locator('#htmlCode').fill('<h1 id="smoke-check">NEXUS PREVIEW WORKS</h1>');
  await page.locator('#run').click();
  await page.frameLocator('#preview').locator('#smoke-check').waitFor();
  assert.equal(await page.frameLocator('#preview').locator('#smoke-check').textContent(), 'NEXUS PREVIEW WORKS');

  await page.locator('#save').click();
  await page.locator('#saveState').getByText('SAVED LOCALLY').waitFor();
  await page.reload();
  assert.equal(await page.locator('#htmlCode').inputValue(), '<h1 id="smoke-check">NEXUS PREVIEW WORKS</h1>', 'Code Studio source should restore after reload');
  const [jsonDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#exportProject').click()
  ]);
  assert.match(jsonDownload.suggestedFilename(), /\.json$/i);
  await page.locator('#projectFile').setInputFiles({
    name: 'nexus-project.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({
      format: 'vyralverse-nexus-project', version: 1,
      files: { html: '<h1 id="import-check">Imported project works</h1>', css: '', js: '' }
    }))
  });
  await page.locator('#run').click();
  await page.frameLocator('#preview').locator('#import-check').waitFor();

  if (pageErrors.length || consoleErrors.length) {
    throw new Error('Browser errors: ' + [...pageErrors, ...consoleErrors].join(' | '));
  }
  console.log('PASS: clean gated home, six worlds, Mind Mirror, daily puzzle, account/recovery UI, feature navigation, USGS + GDACS + ISS feeds, Open-Meteo lookup, Visual Builder edit/undo/redo/drag/import safety/export/auth gate/mobile layout, Focus Board, Star Catcher restart, sandboxed code preview, JSON import/export and local save.');
} finally {
  await browser.close();
}
