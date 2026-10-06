import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import Handlebars from 'handlebars';
import { type Browser, chromium } from 'playwright-core';
import { AppConfig } from '../../config/app-config.js';
import { API_ROOT, ASSETS_DIR } from '../../config/paths.js';

/**
 * Renders Handlebars templates (assets/templates/*.hbs) to PDF with Chrome — Arabic shaping and RTL
 * are handled by the browser engine. Cairo is embedded as data URLs so output is self-contained.
 */
@Injectable()
export class PdfService implements OnModuleDestroy {
  private readonly logger = new Logger('PDF');
  private browser: Promise<Browser> | null = null;
  private readonly templates = new Map<string, HandlebarsTemplateDelegate>();
  private fontCss: string | null = null;
  private readonly templatesDir = path.join(ASSETS_DIR, 'templates');

  constructor(private readonly config: AppConfig) {}

  private async launch(): Promise<Browser> {
    const channel = this.config.env.PDF_BROWSER_CHANNEL;
    if (channel === 'sparticuz') {
      // Serverless Chromium (Vercel/Lambda): the binary is unpacked to /tmp on first use.
      // The Vercel build copies the packed binary to apps/api/chromium-bin (bundle tracing misses the package's own bin/).
      const { default: serverless } = await import('@sparticuz/chromium');
      const bin = path.join(API_ROOT, 'chromium-bin');
      return chromium.launch({ executablePath: await serverless.executablePath(existsSync(bin) ? bin : undefined), args: serverless.args, headless: true });
    }
    return chromium.launch({ channel: channel === 'chrome' ? 'chrome' : undefined, headless: true });
  }

  private getBrowser(): Promise<Browser> {
    this.browser ??= this.launch()
      .then((browser) => {
        // A serverless instance can be frozen and thawed with a dead browser; relaunch on the next render.
        browser.on('disconnected', () => (this.browser = null));
        return browser;
      })
      .catch((err: Error) => {
        this.browser = null;
        throw err;
      });
    return this.browser;
  }

  private async fonts(): Promise<string> {
    if (this.fontCss) return this.fontCss;
    const weights: [string, number][] = [
      ['Cairo_400Regular.ttf', 400],
      ['Cairo_600SemiBold.ttf', 600],
      ['Cairo_700Bold.ttf', 700],
      ['Cairo_800ExtraBold.ttf', 800],
    ];
    const faces: string[] = [];
    for (const [file, weight] of weights) {
      try {
        const buf = await readFile(path.join(ASSETS_DIR, 'fonts', file));
        faces.push(`@font-face{font-family:'Cairo';font-weight:${weight};src:url(data:font/ttf;base64,${buf.toString('base64')}) format('truetype');}`);
      } catch {
        this.logger.warn(`Cairo font ${file} not found; PDF will use a fallback font.`);
      }
    }
    this.fontCss = faces.join('\n');
    return this.fontCss;
  }

  private async template(name: string): Promise<HandlebarsTemplateDelegate> {
    const cached = this.templates.get(name);
    if (cached && !this.config.isDev) return cached;
    const [layout, body] = await Promise.all([
      readFile(path.join(this.templatesDir, 'layout.hbs'), 'utf8'),
      readFile(path.join(this.templatesDir, `${name}.hbs`), 'utf8'),
    ]);
    Handlebars.registerPartial('body', body);
    const tpl = Handlebars.compile(layout, { noEscape: false });
    this.templates.set(name, tpl);
    return tpl;
  }

  async renderHtml(template: string, data: Record<string, unknown>): Promise<string> {
    const tpl = await this.template(template);
    return tpl({ ...data, fontCss: await this.fonts() });
  }

  async render(template: string, data: Record<string, unknown>): Promise<Buffer> {
    const html = await this.renderHtml(template, data);
    if (this.config.env.PDF_BROWSER_CHANNEL !== 'sparticuz') {
      const browser = await this.getBrowser();
      return this.print(browser, html);
    }
    // Serverless Chromium runs --single-process: concurrent pages crash it, and a frozen instance can leave a
    // dead browser behind. Render one document at a time, each in its own short-lived browser.
    const run = this.serverlessQueue.then(async () => {
      const browser = await this.launch();
      try {
        return await this.print(browser, html);
      } finally {
        await browser.close().catch(() => undefined);
      }
    });
    this.serverlessQueue = run.catch(() => undefined);
    return run;
  }

  private serverlessQueue: Promise<unknown> = Promise.resolve();

  private async print(browser: Browser, html: string): Promise<Buffer> {
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'load', timeout: 20_000 });
      const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '14mm', bottom: '16mm', left: '12mm', right: '12mm' } });
      return Buffer.from(pdf);
    } finally {
      await page.close().catch(() => undefined);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browser) await (await this.browser).close().catch(() => undefined);
  }
}
