import { richTextToHtml } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

type RichTextProps = {
  value: string | null | undefined;
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
