import fs from "node:fs/promises";
import process from "node:process";
import { BrowserContext, chromium } from "playwright";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import takeScreenshot, { Config } from "../lib";
import logger from "../lib/logger";
import { parsePostUrl } from "../lib/url";
import tests from "./tests";

function main() {
  yargs(hideBin(process.argv))
    .command(
      "get <path> <url>",
      "capture a screenshot of a post",
      (yargs) =>
        yargs
          .positional("path", {
            describe: "path to screenshot",
            type: "string",
            demandOption: true,
          })
          .positional("url", {
            describe: "cohost post URL",
            type: "string",
            demandOption: true,
          }),
      (argv) => commandGet(argv.path, argv.url, argv.config as Config)
    )
    .command(
      "test [names...]",
      "run test cases",
      (yargs) =>
        yargs.positional("names", {
          array: true,
          type: "string",
          choices: Array.from(Object.keys(tests)),
          default: Array.from(Object.keys(tests)),
        }),
      (argv) => commandTest(argv.names, argv.config as Config)
    )
    .option("config", {
      type: "string",
      default: "{}",
      coerce: (s) => ({
        // default config
        colorScheme: "dark",
        collapseParentPosts: true,
        hideThreadHeader: false,
        // overlay provided config
        ...eval(`(${s})`),
      }),
    })
    .parse();
}

async function commandGet(path: string, url: string, config: Config) {
  const post = parsePostUrl(url);

  await withBrowser()(async (browser) => {
    await withPage(browser)(async (page) => {
      const screenshot = await takeScreenshot(page, config, post);

      await fs.writeFile(path, screenshot);
      logger.info(`wrote screenshot to ${path}`);
    });
  });
}

async function commandTest(names: string[], config: Config) {
  console.log("running test cases:");
  for (const name of names) {
    console.log(`  - ${name}`);
  }

  await withBrowser()(async (browser) => {
    for (const name of names) {
      const { description, url } = tests[name];
      console.log(`running test case ${name}`);
      console.log(`  description: ${description}`);
      console.log(`  url: ${url}`);

      const post = parsePostUrl(url);

      await withPage(browser)(async (page) => {
        const screenshot = await takeScreenshot(page, config, post);

        const path = `tests/${name}.png`;
        await fs.writeFile(path, screenshot);
        logger.info(`wrote screenshot to ${path}`);
      });
    }
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
