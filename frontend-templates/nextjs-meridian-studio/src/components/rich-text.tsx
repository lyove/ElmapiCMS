import { richTextToHtml } from "@/lib/rich-text";

type RichTextProps = {
  value: string | null | undefined;
  className?: string;
};

/** Renders Elmapi richtext (HTML from API, or markdown when returned as a string). */
export function RichText({ value, className }: RichTextProps) {
  const html = richTextToHtml(value);
  if (!html) return null;

  return (
    <div
      className={["rich-text", className].filter(Boolean).join(" ")}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
