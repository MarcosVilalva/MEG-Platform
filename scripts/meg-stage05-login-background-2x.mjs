import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const source = resolve('apps/web/public/meg-web-evolution/login-background.webp');
const target = resolve('apps/web/public/meg-web-evolution/login-background@2x.webp');
const encoded = readFileSync(source).toString('base64');
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROME_PATH || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  const result = await page.evaluate(async (base64) => {
    const picture = new Image();
    picture.src = `data:image/webp;base64,${base64}`;
    await picture.decode();
    const canvas = document.createElement('canvas');
    canvas.width = picture.naturalWidth * 2;
    canvas.height = picture.naturalHeight * 2;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('CANVAS_CONTEXT_NOT_AVAILABLE');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(picture, 0, 0, canvas.width, canvas.height);
    return { data: canvas.toDataURL('image/webp', .9), width: canvas.width, height: canvas.height };
  }, encoded);
  if (result.width !== 4096 || result.height !== 2286 || !result.data.startsWith('data:image/webp;base64,')) throw new Error('UNEXPECTED_BACKGROUND_DIMENSIONS');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, Buffer.from(result.data.split(',')[1], 'base64'));
  console.log(`LOGIN_BACKGROUND_2X ${result.width}x${result.height}, bytes=${readFileSync(target).length}`);
} finally { await browser.close(); }
