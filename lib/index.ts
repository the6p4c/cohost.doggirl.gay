import util from "node:util";
import { Locator, Page } from "playwright";

import logger from "./logger";
import { Post, buildPostUrl } from "./url";

export default async function takeScreenshot(
  page: Page,
  config: Config,
  post: Post
): Promise<Buffer> {
  const url = buildPostUrl(post);
  logger.info(
    `requested screenshot of ${url} with config ${util.inspect(config)}`
  );
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
  collapseParentPosts: boolean;
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
    name: "collapse thread",
    runIf: (config: Config) =>
      config.hideThreadHeader || config.collapseParentPosts,
    async func({ thread, threadHeader, config }: ActionArgs) {
      // this collection includes rebugs with tags
      const items = thread.locator("> div");
      // this collection only includes proper posts
      const posts = thread.locator("> div:not([class])");

      const [itemCount, postCount] = await Promise.all([
        items.count(),
        posts.count(),
      ]);

      // as soon as there is more than one post in a thread or a post is rebugged with tags (i.e.,
      // there is more than one "item" in the thread), we earn redundancy between the thread header
      // and post headers and thus need to do work
      if (itemCount <= 1) return;

      if (config.hideThreadHeader && config.collapseParentPosts) {
        // remove everything except for the last post in the thread, and a potential rebug with tags
        await Promise.all([
          threadHeader.evaluate(remove),
          posts.evaluateAll((posts) => {
            posts.pop();
            posts.forEach((el) => el.remove());
          }),
        ]);
      } else if (config.hideThreadHeader) {
        await threadHeader.evaluate(remove);
      } else if (config.collapseParentPosts) {
        // if this is a top-level post, we don't have anything to collapse (we have to check since
        // we might've got here if the post was rebugged with tags)
        if (postCount <= 1) return;

        await posts.evaluateAll((posts) => {
          const lastPost = posts.pop();
          const parentPosts = posts;

          // if lastPost is undefined, there are somehow no posts in the thread
          if (!lastPost || !lastPost.parentElement) throw "oof";

          const arrow =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="mr-1 inline-block w-4"><path fill-rule="evenodd" d="M12 2.25a.75.75 0 01.75.75v16.19l6.22-6.22a.75.75 0 111.06 1.06l-7.5 7.5a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 111.06-1.06l6.22 6.22V3a.75.75 0 01.75-.75z" clip-rule="evenodd"></path></svg>';
          const hiddenPosts = document.createElement("button");
          hiddenPosts.className =
            "co-link-button w-full cursor-pointer text-center font-bold";
          hiddenPosts.type = "button";
          hiddenPosts.innerHTML =
            parentPosts.length == 1
              ? `${arrow}1 hidden post`
              : `${arrow}${parentPosts.length} hidden posts`;

          const hairline = document.createElement("hr");
          hairline.className = "co-hairline";

          const hairlineWithMargin = document.createElement("hr");
          hairlineWithMargin.className = "co-hairline my-1";

          parentPosts.forEach((el) => el.remove());
          lastPost.parentElement.insertBefore(hiddenPosts, lastPost);
          lastPost.parentElement.insertBefore(hairline, lastPost);
          lastPost.parentElement.insertBefore(hairlineWithMargin, lastPost);
          lastPost.parentElement.insertBefore(hairline.cloneNode(), lastPost);
        });
      }
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
