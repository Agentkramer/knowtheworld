import type { WorldMap, MapVariant } from "./types";

const SVG_NS = "http://www.w3.org/2000/svg";
const MAX_SCALE = 9;
const POINT_PAD = 34; // padding (map units) around member points when zooming

export type ZoomLevel = "world" | "region" | "subregion";

interface VariantLayer {
  g: SVGGElement;
  paths: Map<string, SVGPathElement>;
  points: Record<string, [number, number]>;
}

interface MapOptions {
  interactive?: boolean;
  onSelect?: (cca3: string) => void;
  getName?: (cca3: string) => string;
}

// Builds the world map once per variant; highlight() and setZoom() then only
// toggle classes and apply a CSS transform, so switching countries is cheap.
export class MapView {
  private layers: { standard: VariantLayer; pacific: VariantLayer };
  private variant: "standard" | "pacific" = "standard";
  private marker: SVGGElement;
  private zoomWrap: SVGGElement;
  private active: string | null = null;
  private width: number;
  private height: number;
  private k = 1;
  private cx: number;
  private cy: number;
  private tooltip: HTMLDivElement | null = null;

  constructor(container: HTMLElement, map: WorldMap, opts: MapOptions = {}) {
    this.width = map.width;
    this.height = map.height;
    this.cx = map.width / 2;
    this.cy = map.height / 2;

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", map.viewBox);
    svg.setAttribute("class", "world-map");
    svg.setAttribute("aria-hidden", "true");

    this.zoomWrap = document.createElementNS(SVG_NS, "g");
    this.zoomWrap.setAttribute("class", "map-zoom-wrap");
    svg.appendChild(this.zoomWrap);

    const buildLayer = (data: MapVariant): VariantLayer => {
      const g = document.createElementNS(SVG_NS, "g");
      const add = (d: string, cls: string): SVGPathElement => {
        const p = document.createElementNS(SVG_NS, "path");
        p.setAttribute("d", d);
        p.setAttribute("class", cls);
        g.appendChild(p);
        return p;
      };
      add(data.sphere, "map-sphere");
      add(data.graticule, "map-graticule");
      const paths = new Map<string, SVGPathElement>();
      for (const c of data.countries) {
        const p = add(c.d, "map-country");
        p.dataset.code = c.id;
        paths.set(c.id, p);
      }
      this.zoomWrap.appendChild(g);
      return { g, paths, points: data.points };
    };

    this.layers = { standard: buildLayer(map.standard), pacific: buildLayer(map.pacific) };
    this.layers.pacific.g.setAttribute("visibility", "hidden");

    this.marker = document.createElementNS(SVG_NS, "g");
    this.marker.setAttribute("class", "map-marker");
    this.marker.innerHTML =
      '<circle class="map-marker-ring" r="14"/><circle class="map-marker-dot" r="5"/>';
    this.marker.style.display = "none";
    svg.appendChild(this.marker);

    container.appendChild(svg);

    if (opts.interactive) {
      svg.classList.add("clickable");
      svg.addEventListener("click", (e) => {
        const code = (e.target as SVGElement).dataset?.code;
        if (code) opts.onSelect?.(code);
      });
      this.tooltip = document.createElement("div");
      this.tooltip.className = "map-tooltip";
      this.tooltip.hidden = true;
      container.appendChild(this.tooltip);
      svg.addEventListener("pointermove", (e) => {
        const code = (e.target as SVGElement).dataset?.code;
        if (code && opts.getName) {
          this.tooltip!.textContent = opts.getName(code);
          this.tooltip!.hidden = false;
          const box = container.getBoundingClientRect();
          this.tooltip!.style.left = `${e.clientX - box.left}px`;
          this.tooltip!.style.top = `${e.clientY - box.top}px`;
        } else {
          this.tooltip!.hidden = true;
        }
      });
      svg.addEventListener("pointerleave", () => {
        if (this.tooltip) this.tooltip.hidden = true;
      });
    }
  }

  private get layer(): VariantLayer {
    return this.layers[this.variant];
  }

  highlight(cca3: string): void {
    for (const l of Object.values(this.layers)) {
      if (this.active) l.paths.get(this.active)?.classList.remove("active");
      const p = l.paths.get(cca3);
      if (p) {
        p.classList.add("active");
        // Keep the highlighted country above its neighbours' strokes.
        p.parentNode?.appendChild(p);
      }
    }
    this.active = cca3;
    this.placeMarker();
  }

  /** Zoom to the bounding box of the given member countries (their marker
      points, padded), always including the active country's full shape. */
  setZoom(level: ZoomLevel, members: string[]): void {
    if (level === "world" || !members.length) {
      this.setVariant("standard");
      this.applyTransform(1, this.width / 2, this.height / 2);
      return;
    }

    // Compute the zoom box in both variants and use whichever is tighter —
    // regions and country shapes crossing the antimeridian (Fiji, Oceania)
    // blow up to near-full-width in the standard projection but stay
    // compact in the pacific-centered one.
    const computeBox = (v: VariantLayer): [number, number, number, number] | null => {
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const m of members) {
        const pt = v.points[m];
        if (!pt) continue;
        x0 = Math.min(x0, pt[0] - POINT_PAD);
        y0 = Math.min(y0, pt[1] - POINT_PAD);
        x1 = Math.max(x1, pt[0] + POINT_PAD);
        y1 = Math.max(y1, pt[1] + POINT_PAD);
      }
      // The shown country must be fully visible, however large it is.
      const activePath = this.active ? v.paths.get(this.active) : null;
      if (activePath) {
        const b = activePath.getBBox();
        x0 = Math.min(x0, b.x - 10);
        y0 = Math.min(y0, b.y - 10);
        x1 = Math.max(x1, b.x + b.width + 10);
        y1 = Math.max(y1, b.y + b.height + 10);
      }
      return Number.isFinite(x0) ? [x0, y0, x1, y1] : null;
    };

    const boxes = {
      standard: computeBox(this.layers.standard),
      pacific: computeBox(this.layers.pacific),
    };
    const area = (b: [number, number, number, number] | null): number =>
      b ? (b[2] - b[0]) * (b[3] - b[1]) : Infinity;
    const variant =
      area(boxes.pacific) < area(boxes.standard) * 0.85 ? "pacific" : "standard";
    const box = boxes[variant];
    if (!box) {
      this.setVariant("standard");
      this.applyTransform(1, this.width / 2, this.height / 2);
      return;
    }
    this.setVariant(variant);

    const [x0, y0, x1, y1] = box;
    const k = Math.min(this.width / (x1 - x0), this.height / (y1 - y0), MAX_SCALE);
    this.applyTransform(Math.max(1, k), (x0 + x1) / 2, (y0 + y1) / 2);
  }

  private setVariant(variant: "standard" | "pacific"): void {
    if (this.variant === variant) return;
    this.variant = variant;
    this.layers.standard.g.setAttribute("visibility", variant === "standard" ? "visible" : "hidden");
    this.layers.pacific.g.setAttribute("visibility", variant === "pacific" ? "visible" : "hidden");
    this.placeMarker();
  }

  private applyTransform(k: number, cx: number, cy: number): void {
    this.k = k;
    this.cx = cx;
    this.cy = cy;
    const tx = this.width / 2 - k * cx;
    const ty = this.height / 2 - k * cy;
    this.zoomWrap.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
    this.placeMarker();
  }

  private placeMarker(): void {
    const pt = this.active ? this.layer.points[this.active] : null;
    if (!pt) {
      this.marker.style.display = "none";
      return;
    }
    // The marker sits outside the zoom wrapper so it keeps its size;
    // apply the zoom transform to its position manually.
    const x = this.width / 2 + this.k * (pt[0] - this.cx);
    const y = this.height / 2 + this.k * (pt[1] - this.cy);
    if (x < -20 || x > this.width + 20 || y < -20 || y > this.height + 20) {
      this.marker.style.display = "none";
      return;
    }
    this.marker.style.display = "";
    this.marker.setAttribute("transform", `translate(${x} ${y})`);
  }
}
