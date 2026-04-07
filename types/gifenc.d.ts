declare module "gifenc" {
  interface GIFEncoderInstance {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options?: { palette?: number[][]; delay?: number; transparent?: boolean }
    ): void;
    finish(): void;
    bytes(): Uint8Array;
  }

  export function GIFEncoder(): GIFEncoderInstance;
  export function quantize(
    data: Uint8ClampedArray,
    maxColors: number,
    options?: { format?: string }
  ): number[][];
  export function applyPalette(
    data: Uint8ClampedArray,
    palette: number[][],
    format?: string
  ): Uint8Array;
}
