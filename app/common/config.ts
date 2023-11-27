const production = process.env.NODE_ENV === "production";

const config = {
  logLevel: production ? "info" : "debug",

  baseUrl: process.env.BASE_URL,
  timeout: 20000,
  homeRedirect: "https://github.com/the6p4c/cohost-embed#readme",

  // based on an iPhone 14 Pro Max
  sizeDefault: {
    viewport: { width: 430, height: 932 },
    // height scaled by 2/3 to avoid very tall screenshots
    aspectRatio: { width: 430, height: Math.trunc(932 * (2 / 3)) },
  },
  sizeWidescreen: {
    viewport: { width: 1920, height: 1080 },
    aspectRatio: { width: 16, height: 9 * 2 },
  },
  deviceScaleFactor: 2,
};

export default config;
