const hasImageData = typeof globalThis.ImageData === "function";

if (!hasImageData) {
  type ImageDataConstructorLike = new (
    dataOrWidth: Uint8ClampedArray | number,
    widthOrHeight?: number,
    height?: number,
  ) => ImageData;

  class PolyfillImageData implements ImageData {
    readonly data: Uint8ClampedArray;
    readonly width: number;
    readonly height: number;
    readonly colorSpace: PredefinedColorSpace;

    constructor(
      dataOrWidth: Uint8ClampedArray | number,
      widthOrHeight?: number,
      height?: number,
    ) {
      if (typeof dataOrWidth === "number") {
        const width = dataOrWidth;
        const heightValue = widthOrHeight;

        if (!Number.isInteger(width) || width <= 0) {
          throw new RangeError("ImageData width must be a positive integer.");
        }
        if (
          typeof heightValue !== "number" ||
          !Number.isInteger(heightValue) ||
          heightValue <= 0
        ) {
          throw new RangeError("ImageData height must be a positive integer.");
        }

        this.width = width;
        this.height = heightValue;
        this.data = new Uint8ClampedArray(width * heightValue * 4);
        this.colorSpace = "srgb";
        return;
      }

      if (!(dataOrWidth instanceof Uint8ClampedArray)) {
        throw new TypeError(
          "ImageData expected pixel data to be an Uint8ClampedArray.",
        );
      }
      if (
        typeof widthOrHeight !== "number" ||
        !Number.isInteger(widthOrHeight) ||
        widthOrHeight <= 0
      ) {
        throw new RangeError("ImageData width must be a positive integer.");
      }

      const width = widthOrHeight;
      const computedHeight = height ?? dataOrWidth.length / (width * 4);

      if (!Number.isFinite(computedHeight) || computedHeight <= 0) {
        throw new RangeError("ImageData height must be greater than zero.");
      }
      if (!Number.isInteger(computedHeight)) {
        throw new RangeError(
          "ImageData height must be an integer that matches the data length.",
        );
      }
      if (dataOrWidth.length !== width * computedHeight * 4) {
        throw new RangeError(
          "ImageData pixel data length does not align with width and height.",
        );
      }

      this.data = dataOrWidth;
      this.width = width;
      this.height = computedHeight;
      this.colorSpace = "srgb";
    }
  }

  Object.defineProperty(globalThis, "ImageData", {
    value: PolyfillImageData as ImageDataConstructorLike,
    configurable: true,
    writable: true,
  });
}
