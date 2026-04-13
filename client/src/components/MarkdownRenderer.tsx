import { lazy, Suspense } from "react";

const Streamdown = lazy(async () => {
  const mod = await import("streamdown");
  return { default: mod.Streamdown };
});

type MarkdownRendererProps = {
  content: string;
  className?: string;
};

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const fallback = (
    <div className={className}>
      <p className="whitespace-pre-wrap text-sm">{content}</p>
    </div>
  );

  return (
    <Suspense fallback={fallback}>
      <div className={className}>
        <Streamdown>{content}</Streamdown>
      </div>
    </Suspense>
  );
}