export type DimensionRequest = {
  width?: number | null
  height?: number | null
}

export type Dimensions = {
  width: number
  height: number
}

const round = (value: number) => Math.max(1, Math.round(value))

export const resolveDimensions = (
  original: Dimensions,
  request: DimensionRequest
): Dimensions => {
  const requestedWidth = request.width ?? null
  const requestedHeight = request.height ?? null

  const hasWidth = typeof requestedWidth === 'number' && requestedWidth > 0
  const hasHeight = typeof requestedHeight === 'number' && requestedHeight > 0

  if (!hasWidth && !hasHeight) {
    throw new Error('Either width or height must be provided and greater than zero')
  }

  if (hasWidth && hasHeight) {
    return {
      width: round(requestedWidth!),
      height: round(requestedHeight!)
    }
  }

  const aspect = original.width / original.height

  if (hasWidth) {
    return {
      width: round(requestedWidth!),
      height: round(requestedWidth! / aspect)
    }
  }

  return {
    width: round(requestedHeight! * aspect),
    height: round(requestedHeight!)
  }
}
