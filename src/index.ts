import fs from "node:fs/promises";
import process from "node:process";
import { BrowserContext, chromium } from "playwright";

import logger from "./logger";
import takeScreenshot, { Config } from "./screenshot";

async function main() {
  const args = process.argv.slice(2);
  if (args.length != 2 && args.length != 3) {
    console.log("usage: ??? <path to screenshot> <post url> [config JSON]");
    process.exit(1);
  }

  const [screenshotPath, postUrl, configString] = args;

  const POST_URL_REGEXP =
    /^https?:\/\/(www\.)?cohost\.org\/(?<projectHandle>[a-z0-9\-]+)\/post\/(?<slug>.*)/i;

  const match = postUrl.match(POST_URL_REGEXP);
  if (!match || !match.groups) {
    console.log("error: invalid post url");
    process.exit(1);
  }

  const projectHandle = match.groups.projectHandle;
  const slug = match.groups.slug;

  const defaultConfig: Config = {
    colorScheme: "dark",
    collapseParentPosts: false,
    hideThreadHeader: true,
  };
  const config = {
    ...defaultConfig,
    ...(configString ? JSON.parse(configString) : {}),
  };

  await withBrowser()(async (browser) => {
    await withPage(browser)(async (page) => {
      const screenshot = await takeScreenshot(
        page,
        config,
        projectHandle,
        slug
      );
      await fs.writeFile(screenshotPath, screenshot);

      logger.info(`wrote screenshot to ${screenshotPath}`);
    });
  });
}

function withBrowser() {
  return withObject(
    async () => {
      logger.info("launching browser");
      return await chromium.launchPersistentContext("/data/userDataDir", {
        viewport: { width: 430, height: 5000 },
        deviceScaleFactor: 2,
      });
    },
    async (browser) => {
      logger.info("closing browser");
      await browser.close();
    }
  );
}

function withPage(browser: BrowserContext) {
  return withObject(
    async () => {
      logger.info("creating page");
      return await browser.newPage();
    },
    async (page) => {
      logger.info("closing page");
      await page.close();
    }
  );
}

function withObject<T>(
  ctor: () => Promise<T>,
  dtor: (obj: T) => Promise<void>
): (func: (obj: T) => Promise<void>) => Promise<void> {
  return async (func) => {
    const obj = await ctor();
    try {
      return await func(obj);
    } catch (e) {
      logger.error(`exception: ${e}`);
    } finally {
      await dtor(obj);
    }
  };
}

main();
