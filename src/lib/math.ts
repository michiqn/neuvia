/**
 * Normalizes AI output before rendering:
 * - converts \( \) and \[ \] delimiters to $ and $$, which remark-math understands
 * - repairs LaTeX commands whose backslash was swallowed as a JSON escape or doubled
 * - inserts an opening "$" the model forgot and wraps plain-text subscripts like K_p
 *   ("\theta" parsed as tab + "heta", "\frac" as form feed + "rac", ...)
 */
export function normalizeMath(text: string): string {
  const repaired = text
    .replace(/\t(?=[a-zA-Z])/g, "\\t")
    .replace(/\f(?=[a-zA-Z])/g, "\\f")
    // eslint-disable-next-line no-control-regex -- matching a backspace swallowed from "\b..." is the point
    .replace(/\x08(?=[a-zA-Z])/g, "\\b")
    .replace(/\r(?=[a-zA-Z])/g, "\\r")
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => `$$${m}$$`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => `$${m}$`)
    // Inside math, "\\theta" or "\\," is over-escaped (a real line break is never followed by a letter or spacing command here)
    .replace(/\$\$[\s\S]+?\$\$|\$[^$]+?\$/g, (math) =>
      math
        .replace(/\\\\(?=[a-zA-Z,;:!])/g, "\\")
        // "\neq", "\nabla", ... whose "\n" was parsed as a line break
        .replace(/\n(?=(?:eq|eg|abla|ot|e)\b)/g, "\\n")
    );
  return wrapBareSubscripts(addMissingOpeningDollars(repaired));
}

/**
 * Models sometimes drop an opening "$" ("the parameters $a_i$, \alpha_i$, $d_i$"), which shifts every
 * following pair so text renders as math and vice versa. A LaTeX command that ends in "$" while we are
 * outside math can only be missing its opening "$", so insert it.
 */
function addMissingOpeningDollars(text: string): string {
  const token = /(^|[\s(,;:])(\\[a-zA-Z]+[^\s$]*)\$(?!\$)/g;
  let result = "";
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = token.exec(text))) {
    const before = result + text.slice(last, match.index);
    const singleDollars = (before.replace(/\$\$/g, "").match(/\$/g) ?? []).length;
    if (singleDollars % 2 === 0) {
      result = before + match[1] + "$" + match[2] + "$";
      last = match.index + match[0].length;
    }
  }
  return result + text.slice(last);
}

/**
 * Wraps simple subscripts the model left as plain text ("gains K_p, K_i", "a_{i-1}") in "$...$".
 * Code blocks, inline code and existing math are left untouched; only single-letter bases are
 * matched, so snake_case words stay as they are.
 */
function wrapBareSubscripts(text: string): string {
  const protectedParts = /```[\s\S]*?```|`[^`\n]*`|\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g;
  const bareSubscript = /(?<![\w$\\])([A-Za-z])_(\{[^{}$\s]+\}|[A-Za-z0-9]{1,3})(?![\w{])/g;
  let result = "";
  let last = 0;
  for (const match of text.matchAll(protectedParts)) {
    result += text.slice(last, match.index).replace(bareSubscript, "$$$1_$2$$") + match[0];
    last = match.index + match[0].length;
  }
  return result + text.slice(last).replace(bareSubscript, "$$$1_$2$$");
}

/**
 * Text of the current selection with every rendered formula replaced by its LaTeX source ("$s_1$"),
 * instead of KaTeX's visible and screen-reader copies run together ("s1s 1").
 */
export function getSelectedTextWithMath(selection: Selection | null): string {
  if (!selection || selection.rangeCount === 0) return "";

  const range = selection.getRangeAt(0).cloneRange();
  const enclosingFormula = (node: Node) => (node instanceof Element ? node : node.parentElement)?.closest(".katex");
  const startFormula = enclosingFormula(range.startContainer);
  if (startFormula) range.setStartBefore(startFormula);
  const endFormula = enclosingFormula(range.endContainer);
  if (endFormula) range.setEndAfter(endFormula);

  const container = document.createElement("div");
  container.appendChild(range.cloneContents());
  container.querySelectorAll(".katex").forEach((formula) => {
    const tex = formula.querySelector('annotation[encoding="application/x-tex"]')?.textContent;
    formula.replaceWith(tex ? `$${tex.trim()}$` : formula.textContent ?? "");
  });
  return (container.textContent ?? "").replace(/\s+/g, " ").trim();
}
