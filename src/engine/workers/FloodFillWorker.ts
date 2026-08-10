/**
 * A Web Worker for performing fast flood fill operations on ImageData.
 * This prevents blocking the main UI thread during expensive raster manipulations.
 */

export interface FloodFillRequest {
  id: string;
  imageData: ImageData;
  startX: number;
  startY: number;
  fillColor: { r: number; g: number; b: number; a: number };
  tolerance: number;
}

export interface FloodFillResponse {
  id: string;
  imageData?: ImageData;
  error?: string;
  bounds?: { minX: number; minY: number; maxX: number; maxY: number };
}

self.onmessage = (e: MessageEvent<FloodFillRequest>) => {
  const { id, imageData, startX, startY, fillColor, tolerance } = e.data;
  
  try {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    // Bounds for the modified region
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    const startPos = (startY * width + startX) * 4;
    const startR = data[startPos];
    const startG = data[startPos + 1];
    const startB = data[startPos + 2];
    const startA = data[startPos + 3];
    
    // If we're clicking on the exact color we are trying to fill, do nothing
    if (
      Math.abs(startR - fillColor.r) <= tolerance &&
      Math.abs(startG - fillColor.g) <= tolerance &&
      Math.abs(startB - fillColor.b) <= tolerance &&
      Math.abs(startA - fillColor.a) <= tolerance
    ) {
      self.postMessage({ id, imageData, bounds: undefined } as unknown as FloodFillResponse);
      return;
    }
    
    const colorsMatch = (pos: number) => {
      const r = data[pos];
      const g = data[pos + 1];
      const b = data[pos + 2];
      const a = data[pos + 3];
      
      // Calculate color distance
      // Simple distance
      const dist = Math.abs(r - startR) + Math.abs(g - startG) + Math.abs(b - startB) + Math.abs(a - startA);
      return dist <= tolerance * 4; 
    };

    const setColor = (pos: number) => {
      data[pos] = fillColor.r;
      data[pos + 1] = fillColor.g;
      data[pos + 2] = fillColor.b;
      data[pos + 3] = fillColor.a;
    };
    
    // Use an iterative BFS queue
    // Optimization: instead of array shift (which is O(n)), use an array with a read pointer
    // For large images, we might use a Uint32Array for the queue to save memory
    const queue = new Int32Array(width * height * 2);
    let qHead = 0;
    let qTail = 0;
    
    // Visited array to prevent infinite loops (using 1 bit per pixel)
    const visited = new Uint8Array(width * height);
    
    // Push start node
    queue[qTail++] = startX;
    queue[qTail++] = startY;
    visited[startY * width + startX] = 1;
    
    while (qHead < qTail) {
      const x = queue[qHead++];
      const y = queue[qHead++];
      const pos = (y * width + x) * 4;
      
      setColor(pos);
      
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      
      // Check neighbors (up, down, left, right)
      // Left
      if (x > 0 && !visited[y * width + (x - 1)] && colorsMatch(pos - 4)) {
        queue[qTail++] = x - 1;
        queue[qTail++] = y;
        visited[y * width + (x - 1)] = 1;
      }
      
      // Right
      if (x < width - 1 && !visited[y * width + (x + 1)] && colorsMatch(pos + 4)) {
        queue[qTail++] = x + 1;
        queue[qTail++] = y;
        visited[y * width + (x + 1)] = 1;
      }
      
      // Up
      if (y > 0 && !visited[(y - 1) * width + x] && colorsMatch(pos - width * 4)) {
        queue[qTail++] = x;
        queue[qTail++] = y - 1;
        visited[(y - 1) * width + x] = 1;
      }
      
      // Down
      if (y < height - 1 && !visited[(y + 1) * width + x] && colorsMatch(pos + width * 4)) {
        queue[qTail++] = x;
        queue[qTail++] = y + 1;
        visited[(y + 1) * width + x] = 1;
      }
    }
    
    const hasModifications = minX <= maxX && minY <= maxY;
    
    self.postMessage({ 
      id, 
      imageData,
      bounds: hasModifications ? { minX, minY, maxX, maxY } : null
    } as FloodFillResponse);
    
  } catch (err: any) {
    self.postMessage({ id, error: err.message } as FloodFillResponse);
  }
};
