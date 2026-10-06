import { cn } from "@/lib/utils";
import { richTextToHtml } from "@/lib/rich-text";

type RichTextProps = {
  value?: string | null;
  className?: string;
};

export function RichText({ value, className }: RichTextProps) {
  const html = richTextToHtml(value);
  if (!html) return null;
  return (
    <div
      className={cn("rich-text", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
