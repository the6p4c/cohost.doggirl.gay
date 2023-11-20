import { ReactNode } from "react";

import { Post } from "@/common/job";

import styles from "./DebugTable.module.css";

export default function DebugTable({
  projectHandle,
  slug,
  post,
  imageUrl,
}: {
  projectHandle: string;
  slug: string;
  post: Post;
  imageUrl: string;
}) {
  return (
    <>
      <strong>request</strong>
      <Table>
        <Row name="projectHandle">{projectHandle}</Row>
        <Row name="slug">{slug}</Row>
      </Table>

      <strong>post meta</strong>
      <Table>
        <Row name="themeColor">{post.meta.themeColor}</Row>
        <Row name="siteName">{post.meta.siteName}</Row>
        <Row name="title">{post.meta.title}</Row>
        <Row name="description">{post.meta.description}</Row>
        <LinkRow name="authorUrl" href={post.meta.authorUrl} />
        <LinkRow name="url" href={post.meta.url} />
        <TagsRow name="tags" tags={post.meta.tags} />
        <ImageRows name="imageUrl" src={post.meta.imageUrl} />
      </Table>

      <strong>post screenshot</strong>
      <Table>
        <CodeRow name="base64">{post.screenshot.base64}</CodeRow>
        <Row name="mimeType">{post.screenshot.mimeType}</Row>
        <ImageRows name="imageUrl" src={imageUrl} />
      </Table>
    </>
  );
}

function Table({ children }: { children: ReactNode }) {
  return (
    <table className={styles.debugTable}>
      <tbody>{children}</tbody>
    </table>
  );
}

function Row({ name, children }: { name: string; children: ReactNode }) {
  return (
    <tr>
      <th scope="row">{name}</th>
      <td>{children}</td>
    </tr>
  );
}

function LinkRow({ name, href }: { name: string; href: string }) {
  return (
    <Row name={name}>
      <a href={href}>{href}</a>
    </Row>
  );
}

function TagsRow({ name, tags }: { name: string; tags: string[] }) {
  return (
    <Row name={name}>
      <div className={styles.tags}>
        {tags.map((tag) => (
          <span key={tag} className={styles.tag}>
            {tag}
          </span>
        ))}
      </div>
    </Row>
  );
}

function ImageRows({ name, src }: { name: string; src: string }) {
  return (
    <>
      <LinkRow name={name} href={src} />
      <Row name={`[${name}]`}>
        <a href={src}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" />
        </a>
      </Row>
    </>
  );
}

function CodeRow({ name, children }: { name: string; children: ReactNode }) {
  return (
    <Row name={name}>
      <code>{children}</code>
    </Row>
  );
}
