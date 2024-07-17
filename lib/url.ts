const VALID_PROTOCOLS = ["http:", "https:"];
const VALID_HOSTS = ["cohost.org", "www.cohost.org"];

export type Post = {
  projectHandle: string;
  slug: string;
  draftNonce?: string;
  commentUuid?: string;
};

export function parsePostUrl(urlString: string): Post {
  const url = new URL(urlString);
  if (!VALID_PROTOCOLS.includes(url.protocol)) throw "invalid protocol";
  if (!VALID_HOSTS.includes(url.host)) throw "invalid host";

  const [projectHandle, post, slug, draftNonce] = url.pathname
    .split("/")
    .slice(1);
  if (post != "post") throw "not a post url";
  if (!projectHandle || !slug) throw "missing projectHandle or slug";

  const commentPrefix = "#comment-";
  const commentUuid = url.hash.startsWith(commentPrefix)
    ? url.hash.slice(commentPrefix.length)
    : undefined;

  return {
    projectHandle,
    slug,
    draftNonce,
    commentUuid,
  };
}

export function buildPostUrl(post: Post): string {
  let url = `https://cohost.org/${post.projectHandle}/post/${post.slug}`;

  if (post.draftNonce) {
    url += `/${post.draftNonce}`;
  }

  return url;
}
