import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { normalizeMath } from "@/lib/math";

interface MathTextProps {
  children: string | null | undefined;
  /** Render without paragraph wrappers, for use inside labels and single lines */
  inline?: boolean;
  className?: string;
}

/** Renders AI-generated text with markdown and LaTeX math ($...$ inline, $$...$$ block). */
export function MathText({ children, inline = false, className }: MathTextProps) {
  if (!children) return null;

  const markdown = (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={inline ? { p: ({ children }) => <>{children}</> } : undefined}
    >
      {normalizeMath(children)}
    </ReactMarkdown>
  );

  return inline ? <span className={className}>{markdown}</span> : <div className={className}>{markdown}</div>;
}
