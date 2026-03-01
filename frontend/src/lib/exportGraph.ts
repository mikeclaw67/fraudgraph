/**
 * FraudGraph — Sigma.js graph PNG export utility.
 *
 * Uses the afterRender + synchronous drawImage pattern to capture
 * WebGL canvases before the GPU clears the backbuffer.
 * Sigma v3 sets preserveDrawingBuffer: false — naive toDataURL()
 * returns blank. This is the only working approach.
 */

type SigmaExportable = {
  getCanvases: () => Record<string, HTMLCanvasElement>;
  getContainer: () => HTMLElement;
  refresh: () => void;
  on: (event: string, cb: () => void) => void;
  removeListener: (event: string, cb: () => void) => void;
};

export function exportSigmaAsPNG(
  sigma: SigmaExportable,
  filename: string,
  bgColor = "#263238",
): void {
  const onAfterRender = () => {
    sigma.removeListener("afterRender", onAfterRender);

    const canvases = sigma.getCanvases();
    const container = sigma.getContainer();
    const w = container.offsetWidth;
    const h = container.offsetHeight;

    const offscreen = document.createElement("canvas");
    offscreen.width = w;
    offscreen.height = h;
    const ctx = offscreen.getContext("2d")!;

    // Fill background (WebGL is transparent by default)
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);

    // Composite in render order — MUST be synchronous
    const LAYER_ORDER = ["edges", "edgeLabels", "nodes", "labels"];
    LAYER_ORDER.forEach((layer) => {
      const canvas = canvases[layer];
      if (canvas) ctx.drawImage(canvas, 0, 0, w, h);
    });

    const dataURL = offscreen.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  sigma.on("afterRender", onAfterRender);
  sigma.refresh(); // Force a fresh render to populate WebGL buffers
}
