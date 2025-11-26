export function createChartTooltip(container: HTMLElement): HTMLDivElement {
  const toolTip = container.ownerDocument.createElement('div');
  toolTip.style.position = 'absolute';
  toolTip.style.display = 'none';
  toolTip.style.pointerEvents = 'none';
  toolTip.style.padding = '8px 10px';
  toolTip.style.borderRadius = '6px';
  toolTip.style.background = 'rgba(255, 255, 255, 0.95)';
  toolTip.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  toolTip.style.border = '1px solid rgba(209, 213, 219, 0.8)';
  toolTip.style.color = '#111827';
  toolTip.style.fontSize = '14px';
  toolTip.style.lineHeight = '1.5';
  toolTip.style.zIndex = '30';
  toolTip.style.whiteSpace = 'nowrap';
  container.appendChild(toolTip);
  return toolTip;
}

export interface TooltipPositionParams {
  point: { x: number; y: number };
  tooltipEl: HTMLElement;
  container: HTMLElement;
}

/**
 * Position a tooltip so it avoids the current crosshair line and stays in-bounds.
 */
export function positionTooltipAvoidingCrosshair({
  point,
  tooltipEl,
  container,
  chart,
}: TooltipPositionParams) {
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  // Force layout recalculation to get accurate dimensions after innerHTML update
  // Accessing offsetWidth triggers a reflow, ensuring clientWidth is current
  tooltipEl.offsetWidth;

  const tooltipWidth = tooltipEl.clientWidth;
  const tooltipHeight = tooltipEl.clientHeight;

  // Calculate the offset between container coordinates and chart content coordinates
  // The chart's point.x is measured from the left edge of the chart CONTENT area
  // (excluding the left price scale), so we need to add the left scale width
  let contentAreaOffsetX = 0;

  try {
    // Find the tv-lightweight-charts div (the main chart container)
    const tvChart = container.querySelector('.tv-lightweight-charts');
    if (tvChart) {
      // Look through the chart's elements to find the left price scale
      // The left price scale is typically the leftmost element with width between 40-150px
      const allElements = tvChart.querySelectorAll('*');

      for (const el of allElements) {
        const htmlEl = el as HTMLElement;
        const rect = htmlEl.getBoundingClientRect();
        const parentRect = tvChart.getBoundingClientRect();
        const relativeLeft = rect.left - parentRect.left;
        const width = rect.width;

        // If this element is at the left edge and has a reasonable width for a price scale
        if (Math.abs(relativeLeft) < 2 && width > 40 && width < 150) {
          contentAreaOffsetX = Math.round(width);
          break;
        }
      }
    }
  } catch (e) {
    // If we can't detect the offset, fall back to 0
    contentAreaOffsetX = 0;
  }

  // Adjust point.x from chart coordinates to container coordinates
  const adjustedPointX = point.x + contentAreaOffsetX;

  // Calculate both possible horizontal positions
  const rightPosition = adjustedPointX + 12; // Place tooltip to the right of crosshair
  const leftPosition = adjustedPointX - tooltipWidth - 12; // Place tooltip to the left of crosshair

  // Check if each position is valid (within container bounds)
  const rightPositionValid = rightPosition + tooltipWidth <= containerWidth;
  const leftPositionValid = leftPosition >= 0;

  // Determine which side of the container we're on (using adjusted position)
  const isLeftHalf = adjustedPointX < containerWidth / 2;

  // Choose position: prefer the side we're on, fallback to other side, then clamp
  let left: number;
  if (isLeftHalf) {
    // On left half, prefer placing to the right
    if (rightPositionValid) {
      left = rightPosition;
    } else if (leftPositionValid) {
      left = leftPosition;
    } else {
      // Neither side works, clamp to container
      left = Math.max(0, Math.min(rightPosition, containerWidth - tooltipWidth));
    }
  } else {
    // On right half, prefer placing to the left
    if (leftPositionValid) {
      left = leftPosition;
    } else if (rightPositionValid) {
      left = rightPosition;
    } else {
      // Neither side works, clamp to container
      left = Math.max(0, Math.min(leftPosition, containerWidth - tooltipWidth));
    }
  }

  // Handle vertical positioning
  let top = point.y + 12;
  if (top + tooltipHeight > containerHeight) {
    top = point.y - tooltipHeight - 12;
  }

  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${Math.max(0, top)}px`;
}
