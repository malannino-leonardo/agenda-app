/**
 * Measures the exact client coordinates of the text caret in an <input> element.
 */
export function getInputCaretCoordinates(input: HTMLInputElement): { x: number; y: number } {
  const rect = input.getBoundingClientRect();
  const selectionStart = input.selectionStart ?? input.value.length;

  let textWidth = 0;
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const computed = window.getComputedStyle(input);
      ctx.font = `${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
      
      const textBeforeCursor = input.type === 'password'
        ? '•'.repeat(selectionStart)
        : input.value.substring(0, selectionStart);

      textWidth = ctx.measureText(textBeforeCursor).width;
    }
  } catch {
    textWidth = selectionStart * 8;
  }

  const computed = window.getComputedStyle(input);
  const paddingLeft = parseFloat(computed.paddingLeft) || 12;

  // Exact X position in viewport
  const rawX = rect.left + paddingLeft + textWidth - input.scrollLeft;
  const clampedX = Math.min(rect.right - 12, Math.max(rect.left + paddingLeft, rawX));
  const caretY = rect.top + rect.height / 2;

  return { x: clampedX, y: caretY };
}
