import type { WorldMap } from "./types";

const SVG_NS = "http://www.w3.org/2000/svg";

// Builds the world map once; highlight() then just toggles classes and
// moves the marker, so switching countries is cheap.
export class MapView {
  private paths = new Map<string, SVGPathElement>();
  private marker: SVGGElement;
  private active: SVGPathElement | null = null;
  private points: Record<string, [number, number]>;

  constructor(container: HTMLElement, map: WorldMap) {
    this.points = map.points;

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", map.viewBox);
    svg.setAttribute("class", "world-map");
    svg.setAttribute("aria-hidden", "true");

    const add = (d: string, cls: string): SVGPathElement => {
      const p = document.createElementNS(SVG_NS, "path");
      p.setAttribute("d", d);
      p.setAttribute("class", cls);
      svg.appendChild(p);
      return p;
    };

    add(map.sphere, "map-sphere");
    add(map.graticule, "map-graticule");
    for (const c of map.countries) {
      this.paths.set(c.id, add(c.d, "map-country"));
    }

    this.marker = document.createElementNS(SVG_NS, "g");
    this.marker.setAttribute("class", "map-marker");
    this.marker.innerHTML =
      '<circle class="map-marker-ring" r="14"/><circle class="map-marker-dot" r="5"/>';
    this.marker.style.display = "none";
    svg.appendChild(this.marker);

    container.appendChild(svg);
  }

  highlight(cca3: string): void {
    this.active?.classList.remove("active");
    this.active = this.paths.get(cca3) ?? null;
    if (this.active) {
      this.active.classList.add("active");
      // Keep the highlighted country above its neighbours' strokes.
      this.active.parentNode?.insertBefore(this.active, this.marker);
    }
    const pt = this.points[cca3];
    if (pt) {
      this.marker.style.display = "";
      this.marker.setAttribute("transform", `translate(${pt[0]} ${pt[1]})`);
    } else {
      this.marker.style.display = "none";
    }
  }
}
