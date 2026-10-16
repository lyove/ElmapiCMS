import { richTextToHtml } from "@/lib/rich-text";

type RichTextProps = {
  value: string | null | undefined;
  className?: string;
};

export function RichText({ value, className }: RichTextProps) {
  const html = richTextToHtml(value);
  if (!html) return null;

  return (
    <div
      className={className ? `rich-text ${className}` : "rich-text"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
