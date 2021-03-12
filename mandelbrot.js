p5.disableFriendlyErrors = true;

const escapeRadius = 256;
const escapeRadiusLog = Math.log2(Math.log2(escapeRadius));
const bigLog = Math.log(100000);
let zoomManager;
let mandelbrot;


function setup() {
  createCanvas(600, 600);
  pixelDensity(1);
  loadPixels();
  zoomManager = new ZoomManager(-2.2, 2.2, -2.2, 2.2);
  mandelbrot = new Mandelbrot(1000, DefaultPalette);
  mandelbrot.draw(zoomManager.getZoomLevel());
}


function draw() {}


function keyPressed() {
  if ((key == 'R') || (key == 'r')) {
    mandelbrot.maxIterations -= 20;
    mandelbrot.draw(zoomManager.zoomOut());
  }
}


function mousePressed() {
  mandelbrot.draw(zoomManager.zoomIn(mouseX, mouseY));
  mandelbrot.maxIterations += 20;
}


class Mandelbrot {
  constructor(maxIterations, palette) {
    this.maxIterations = maxIterations;
    this.palette = palette;
  }
  
  draw(zoomLevel) {
    let pixelIndex = 0;
    for (let y = 0; y < height; ++y) {
      for (let x = 0; x < width; ++x) {
        let ca = zoomLevel.scaleX(x), cb = zoomLevel.scaleY(y);
        let [isDiverging, n, za, zb] = this.testDivergence(ca, cb);

        if (isDiverging) {
          let c = this.palette.pickColor(n, za, zb);
          pixels[pixelIndex++] = c[0]; // Red
          pixels[pixelIndex++] = c[1]; // Green
          pixels[pixelIndex++] = c[2]; // Blue
          pixels[pixelIndex++] = 128;  // Alpha
        } else {
          pixels[pixelIndex++] = 0;  
          pixels[pixelIndex++] = 0;   
          pixels[pixelIndex++] = 0;   
          pixels[pixelIndex++] = 255; 
        }
      }
    }
    updatePixels();
  }
  
  testDivergence(ca, cb) {
    // Tests whether f(z) = z^2 + c diverges through repeated applications.
    let za = 0, zb = 0, zaSquared = 0, zbSquared = 0;
    let n = 0, isDiverging = false;
    
    while (n < this.maxIterations && !isDiverging) {
      zb = 2 * za * zb + cb;
      za = zaSquared - zbSquared + ca;

      zaSquared = za * za;
      zbSquared = zb * zb;
      
      isDiverging = zaSquared + zbSquared > escapeRadius;
      ++n;
    }
    
    return [isDiverging, n, za, zb];
  }
}


class DefaultPalette {
  static pickColor(numIterations, za, zb) {
    let s = smoothIterationCount(numIterations, za, zb);
    let p = log(s) / bigLog;
    let angle;
    if (p < 0.5) {
      p = 1 - 1.5 * p;
      angle = 1 - p;
    } else {
      p = 1.5 * p - 0.5;
      angle = p;
    }

    let radius = sqrt(p);
    if (floor(s) % 2) radius *= 0.6;

    let hue = 0.4 + 0.55 * fractionalPart(5 * angle);
    let saturation = fractionalPart(radius);
    let value = 0.9 + 0.1 * fractionalPart(Math.log10(complexMagnitude(za, zb)));

    return hsvToRgb(hue, saturation, value);
  }
}


class ZoomManager {
  constructor(xMin, xMax, yMin, yMax) {
    this.zoomHistory = cons(new ZoomLevel(xMin, xMax, yMin, yMax), null);
  }
  
  getZoomLevel() {
    return car(this.zoomHistory);
  }
  
  zoomIn(x, y) {
    // Create a new zoom level centered at the (x, y) screen coordinate. Domain width is divided by 4.
    let currentZoom = this.getZoomLevel();
    let xOrigin = currentZoom.scaleX(x), yOrigin = currentZoom.scaleY(y);
    let xWidth = currentZoom.xWidth(), yWidth = currentZoom.yWidth();
    let newZoom = new ZoomLevel(xOrigin - xWidth / 4, xOrigin + xWidth / 4, yOrigin - yWidth / 4, yOrigin + yWidth / 4);
    this.zoomHistory = cons(newZoom, this.zoomHistory);
    return newZoom;
  }
 
  zoomOut() {
    // Reset to previous zoom level.
    if (cdr(this.zoomHistory)) {
      this.zoomHistory = cdr(this.zoomHistory);
      return this.getZoomLevel();
    }
  }
}


class ZoomLevel {
  constructor(xMin, xMax, yMin, yMax) {
    this.xMin = xMin;
    this.xMax = xMax;
    this.yMin = yMin;
    this.yMax = yMax;
  }
  
  xWidth() {
    return this.xMax - this.xMin;
  }
  
  yWidth() {
    return this.yMax - this.yMin;
  }
  
  scaleX(x) {
    // Map screen x-coordinate onto domain.
    return map(x, 0, width, this.xMin, this.xMax);
  }
  
  scaleY(y) {
    // Map screen y-coordinate onto domain.
    return map(y, 0, height, this.yMin, this.yMax);
  }
}


// ----------------
// Helper Functions
// ----------------

function cons(car, cdr) {
  // Construct a pair.
  return {
    car: car,
    cdr: cdr
  };
}


function car(pair) {
  return pair.car;
}


function cdr(pair) {
  return pair.cdr;
}


function complexMagnitude(za, zb) {
  return sqrt(sq(za) + sq(zb));
}


function complexAngle(za, zb) {
  return atan(zb / za);
}


function fractionalPart(r) {
  return r - floor(r);
}


function smoothIterationCount(numIterations, za, zb) {
  let log_z = Math.log2(za * za + zb * zb) / 2; // equal to log(|z|)
  return numIterations + Math.log2(log_z) - escapeRadiusLog;
}


function hsvToRgb(h, s, v) {
  let r, g, b;
  let i = Math.floor(h * 6);
  let f = h * 6 - i;
  let p = v * (1 - s);
  let q = v * (1 - f * s);
  let t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
  }
  
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}