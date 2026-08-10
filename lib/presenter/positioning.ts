export interface UnionRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  cx: number;
  cy: number;
}

export interface Viewport {
  vw: number;
  vh: number;
  streamOpen: boolean;
}

export interface CardSize {
  cw: number;
  ch: number;
}

export type CardSide = 'left' | 'right' | 'top' | 'bottom' | 'center';

export interface CardPlacement {
  left: number;
  top: number;
  side: CardSide; // which EDGE OF THE CARD the arrow attaches to (or 'center' = no arrow)
  arrowOffset: number; // px offset from the card's origin edge to the arrow center
}

const SIDEBAR_W = 384;
const MARGIN = 18;
const GAP = 26;

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

export function computeCardPlacement(
  rect: UnionRect | null,
  viewport: Viewport,
  card: CardSize,
): CardPlacement {
  const vw = viewport.vw - (viewport.streamOpen ? SIDEBAR_W : 0);
  const vh = viewport.vh;
  const { cw, ch } = card;
  const m = MARGIN;
  const gap = GAP;

  if (rect === null) {
    return {
      side: 'center',
      left: Math.round((vw - cw) / 2),
      top: Math.round((vh - ch) / 2),
      arrowOffset: 0,
    };
  }

  let side: CardSide;
  let left: number;
  let top: number;

  if (rect.right + gap + cw <= vw - m) {
    side = 'left';
    left = rect.right + gap;
    top = clamp(rect.cy - ch / 2, m + 60, vh - ch - m);
  } else if (rect.left - gap - cw >= m) {
    side = 'right';
    left = rect.left - gap - cw;
    top = clamp(rect.cy - ch / 2, m + 60, vh - ch - m);
  } else if (rect.top - gap - ch >= m + 60) {
    side = 'bottom';
    top = rect.top - gap - ch;
    left = clamp(rect.cx - cw / 2, m, vw - cw - m);
  } else {
    side = 'top';
    top = clamp(rect.bottom + gap, m + 60, vh - ch - m);
    left = clamp(rect.cx - cw / 2, m, vw - cw - m);
  }

  const arrowOffset =
    side === 'left' || side === 'right'
      ? clamp(rect.cy - top - 8, 14, ch - 30)
      : clamp(rect.cx - left - 8, 14, cw - 30);

  return { side, left: Math.round(left), top: Math.round(top), arrowOffset };
}
