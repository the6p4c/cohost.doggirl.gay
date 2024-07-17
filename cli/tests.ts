const tests: { [key: string]: TestCase } = {
  thread1: {
    description: "thread of one post",
    url: "https://cohost.org/bark-test/post/6905139-long-thread-post-1",
  },
  thread2: {
    description: "thread of two posts",
    url: "https://cohost.org/bark-test/post/6905144-long-thread-post",
  },
  thread3: {
    description: "thread of three posts",
    url: "https://cohost.org/bark-test/post/6905147-and-without-further",
  },

  "thread1-rebug": {
    description: "thread of one post, transparent rebug",
    url: "https://cohost.org/bark-test-2/post/6906926-empty",
  },
  "thread2-rebug": {
    description: "thread of two posts, transparent rebug",
    url: "https://cohost.org/bark-test-2/post/6906947-empty",
  },
  "thread3-rebug": {
    description: "thread of three posts, transparent rebug",
    url: "https://cohost.org/bark-test-2/post/6906948-empty",
  },

  "thread1-rebug-tagged": {
    description: "one post, rebugged with tags",
    url: "https://cohost.org/bark-test-2/post/6906685-empty",
  },
  "thread2-rebug-tagged": {
    description: "thread of two posts, rebugged with tags",
    url: "https://cohost.org/bark-test-2/post/6906502-empty",
  },
  "thread3-rebug-tagged": {
    description: "thread of three posts, rebugged with tags",
    url: "https://cohost.org/bark-test-2/post/6906506-empty",
  },

  draft: {
    description: "unpublished/draft post",
    url: "https://cohost.org/bark-test/post/6916231-woah/c910e8b1f880498ab05b0d16e798bcff",
  },

  "expand-cw": {
    description: "thread of two posts, each with content warnings",
    url: "https://cohost.org/bark-test/post/3771667-cw-post-2-headline",
  },
  "expand-18": {
    description: "thread of two posts, each marked as 18+ content",
    url: "https://cohost.org/bark-test/post/3771515-18-post-2-headline",
  },
};

export default tests;

export type TestCase = {
  description: string;
  url: string;
};
