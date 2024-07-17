import fs from "node:fs/promises";
import process from "node:process";
import { BrowserContext, chromium } from "playwright";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import logger from "./logger";
import takeScreenshot, { Config } from "./screenshot";
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
  const urlParsed = parsePostUrl(url);
  if (!urlParsed) {
    console.log("error: invalid post url");
    process.exit(1);
  }

  await withBrowser()(async (browser) => {
    await withPage(browser)(async (page) => {
      const screenshot = await takeScreenshot(
        page,
        config,
        urlParsed.projectHandle,
        urlParsed.slug
      );
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
      const testCase = tests[name];
      console.log(`running test case ${name}`);
      console.log(`  ${testCase.description}`);

      const parsedUrl = parsePostUrl(testCase.url);
      if (!parsedUrl) throw "oof";

      await withPage(browser)(async (page) => {
        const screenshot = await takeScreenshot(
          page,
          config,
          parsedUrl.projectHandle,
          parsedUrl.slug
        );

        await fs.writeFile(`tests/${name}.png`, screenshot);
      });
    }
  });
}

function parsePostUrl(
  url: string
): { projectHandle: string; slug: string } | undefined {
  const URL_REGEXP =
    /^https?:\/\/(www\.)?cohost\.org\/(?<projectHandle>[a-z0-9\-]+)\/post\/(?<slug>.*)/i;

  const groups = url.match(URL_REGEXP)?.groups;
  if (!groups) return undefined;

  return {
    projectHandle: groups.projectHandle,
    slug: groups.slug,
  };
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
