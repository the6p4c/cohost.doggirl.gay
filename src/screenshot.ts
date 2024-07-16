import { Locator, Page } from "playwright";

import logger from "./logger";

export default async function takeScreenshot(
  page: Page,
  config: Config,
  projectHandle: string,
  slug: string
): Promise<Buffer> {
  const url = `https://cohost.org/${projectHandle}/post/${slug}`;
  logger.info(`requested screenshot of ${url}`);
  await page.goto(url);

  const thread = page.locator(".co-post-box");
  const threadHeader = page.locator(".co-thread-header");
  const threadFooter = page.locator(".co-thread-footer");

  for (const action of actions) {
    const run = action.runIf ? action.runIf(config) : true;
    if (run) {
      logger.debug(`running prepare action: ${action.name}`);
      await action.func({
        page,
        thread,
        threadHeader,
        threadFooter,
        config,
      });
    } else {
      logger.debug(`skipped prepare action: ${action.name}`);
    }
  }

  return await thread.screenshot({ type: "png" });
}

export type Config = {
  colorScheme: "dark" | "light";
  hideThreadHeader: boolean;
};

type ActionArgs = {
  page: Page;
  thread: Locator;
  threadHeader: Locator;
  threadFooter: Locator;
  config: Config;
};

const actions = [
  {
    name: "set color scheme",
    async func({ page, config }: ActionArgs) {
      await page.emulateMedia({ colorScheme: config.colorScheme });
    },
  },
  {
    name: "delete header bar",
    // the header bar can overlap with tall threads when the thread is scrolled into view before
    // taking the screenshot; removing the header bar allows us to use as much of the viewport as
    // possible
    async func({ page }: ActionArgs) {
      await page.locator("header.fixed").evaluate(remove);
    },
  },
  {
    name: "remove rounded corners",
    // the page background is visible behind the thread when rounded corners are present
    async func({ thread, threadHeader, threadFooter }: ActionArgs) {
      await Promise.all([
        thread.evaluate((el) => (el.style.borderRadius = "0")),
        threadHeader.evaluate((el) => (el.style.borderRadius = "0")),
        threadFooter.evaluate((el) => (el.style.borderRadius = "0")),
      ]);
    },
  },
  {
    name: "remove meatball menu",
    async func({ threadHeader }: ActionArgs) {
      await threadHeader
        // delete the path from inside the svg so as to retain the header height
        .locator(".co-action-button path")
        // in a reply to an ask, the ask balloon is also a .co-action-button so we take the last
        .last()
        .evaluate(remove);
    },
  },
  {
    name: "remove log in icon",
    // since we retrieve posts without being logged into an account, a log in button appears in the
    // thread footer where the like and rebug buttons would usually appear
    async func({ threadFooter }: ActionArgs) {
      await threadFooter.locator(".co-action-button path").evaluate(remove);
    },
  },
  {
    name: "expand content warnings and 18+ content",
    async func({ thread }: ActionArgs) {
      await thread
        .locator(".co-filled-button", {
          hasText: /^(show post|I am 18\+)$/,
        })
        .evaluateAll(click);
    },
  },
  {
    name: "remove 'hide post' buttons",
    // after expanding content warnings or 18+ content, "hide post" buttons appear which are useless
    // in a screenshot. this also gives the post title more space. importantly, this doesn't hide
    // the the list of content warnings or "18+" indicator
    async func({ thread }: ActionArgs) {
      await thread
        .locator(".co-filled-button", { hasText: "hide post" })
        .evaluateAll(remove);
    },
  },
  {
    name: "hide thread header",
    // the thread header contains information that is either mostly irrelevant (e.g. who rebugged
    // the final post in the thread) or duplicated (e.g. the users of the second-last and last posts
    // in the thread), so it can be nice to hide it
    //
    // TODO: detect if the link is to a rebug that only adds tags, since then the user who rebugged
    // the final post in the thread *is* relevant
    runIf: (config: Config) => config.hideThreadHeader,
    async func({ threadHeader }: ActionArgs) {
      await threadHeader.evaluate(remove);
    },
  },
];

function remove(el: Element | Element[]) {
  if (Array.isArray(el)) {
    el.forEach((el) => el.remove());
  } else {
    remove([el]);
  }
}

function click(el: Element | Element[]) {
  if (Array.isArray(el)) {
    // playwright doesn't have a multi-element .click(), and doing a naive .all() and then .click()
    // on each Locator causes issues if the element is removed from the DOM after being clicked. the
    // Locators returned from .all() use .first() and .nth(n) to target each element, which break
    // when the DOM is modified.
    el.forEach((el) => el.dispatchEvent(new Event("click", { bubbles: true })));
  } else {
    click([el]);
  }
}
