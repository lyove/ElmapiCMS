import { transformerCopyButton } from "@rehype-pretty/transformers";
import remarkGfm from "remark-gfm";
import remarkGithubBlockquoteAlert from "remark-github-blockquote-alert";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import {
  cmsOriginFromApiBase,
  rehypeAbsolutizeCmsMedia,
  rewriteCmsMediaUrlsInHtml,
} from "@/lib/cms-media";
import { normalizeMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";

async function renderMarkdown(markdown: string): Promise<string> {
  const origin = cmsOriginFromApiBase(process.env.ELMAPI_BASE_URL);

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkGithubBlockquoteAlert)
    // MDXEditor stores resized images as raw HTML <img> — keep them.
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeAbsolutizeCmsMedia(origin))
    .use(rehypeSlug)
    .use(rehypePrettyCode, {
      theme: {
        light: "vitesse-light",
        dark: "vitesse-dark",
      },
      keepBackground: false,
      defaultLang: "text",
      transformers: [
        transformerCopyButton({
          visibility: "hover",
          feedbackDuration: 2_500,
        }),
      ],
    })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown);

  return String(file);
}

type MarkdownProps = {
  value: string | null | undefined;
  className?: string;
};

export async function Markdown({ value, className }: MarkdownProps) {
  const markdown = normalizeMarkdown(value);
  if (!markdown) return null;

  const origin = cmsOriginFromApiBase(process.env.ELMAPI_BASE_URL);

  if (markdown.startsWith("<") && /<\/[a-z]/i.test(markdown)) {
    const html = markdown.replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/i, "");
    return (
      <div
        className={cn("docs-md", className)}
        dangerouslySetInnerHTML={{
          __html: origin ? rewriteCmsMediaUrlsInHtml(html, origin) : html,
        }}
      />
    );
  }

  const html = await renderMarkdown(markdown);

  return (
    <div
      className={cn("docs-md", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
