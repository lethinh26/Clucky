"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import mapboxgl from "mapbox-gl";

type Point = [number, number];

function positionAlongRoute(route: Point[], progress: number): Point {
  if (route.length < 2) return route[0] ?? [0, 0];
  const distance = (a: Point, b: Point): number => {
    const lat1 = a[1] * Math.PI / 180;
    const lat2 = b[1] * Math.PI / 180;
    const dy = lat2 - lat1;
    const dx = (b[0] - a[0]) * Math.PI / 180;
    const h = Math.sin(dy / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dx / 2) ** 2;
    return 12742000 * Math.asin(Math.min(1, Math.sqrt(h)));
  };
  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    total += distance(route[i - 1], route[i]);
    lengths.push(total);
  }
  const target = total * Math.min(1, Math.max(0, progress));
  const nextIndex = lengths.findIndex(length => length >= target);
  if (nextIndex < 0) return route[route.length - 1];
  const before = nextIndex === 0 ? 0 : lengths[nextIndex - 1];
  const segment = lengths[nextIndex] - before;
  const t = segment === 0 ? 0 : (target - before) / segment;
  return [
    route[nextIndex][0] + (route[nextIndex + 1][0] - route[nextIndex][0]) * t,
    route[nextIndex][1] + (route[nextIndex + 1][1] - route[nextIndex][1]) * t,
  ];
}

export default function MockDeliveryMap({ route, progress }: { route: Point[]; progress: number }) {
  const vi = useLocale() === "vi";
  const container = useRef<HTMLDivElement | null>(null);
  const rider = useRef<mapboxgl.Marker | null>(null);
  const [problem, setProblem] = useState("");
  const routeKey = JSON.stringify(route);

  useEffect(() => {
    if (!container.current) return;
    const points: Point[] = JSON.parse(routeKey);
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
    if (!token.startsWith("pk.")) {
      setProblem(vi ? "Thiếu Mapbox public token để hiển thị lộ trình." : "Mapbox public token is missing; the route cannot be shown.");
      return;
    }
    if (!mapboxgl.supported() || points.length < 2) {
      setProblem(vi ? "Bản đồ không được hỗ trợ trên thiết bị này." : "Maps are not supported on this device.");
      return;
    }

    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container: container.current,
        accessToken: token,
        style: "mapbox://styles/mapbox/streets-v12",
        center: points[0],
        zoom: 13,
        attributionControl: false,
        cooperativeGestures: true,
      });
    } catch {
      setProblem(vi ? "Không thể khởi tạo bản đồ theo dõi." : "Unable to initialize the tracking map.");
      return;
    }

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
    map.on("load", () => {
      map.addSource("mock-delivery-route", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: points } },
      });
      map.addLayer({
        id: "mock-delivery-route-line",
        type: "line",
        source: "mock-delivery-route",
        paint: { "line-color": "#971b21", "line-width": 5, "line-opacity": 0.82 },
      });
      new mapboxgl.Marker({ color: "#206647" }).setLngLat(points[0]).addTo(map);
      new mapboxgl.Marker({ color: "#c47b16" }).setLngLat(points[points.length - 1]).addTo(map);
      rider.current = new mapboxgl.Marker({ color: "#9b1c25", scale: 1.2 })
        .setLngLat(positionAlongRoute(points, progress)).addTo(map);
      rider.current.getElement().title = vi ? "Vị trí trên lộ trình" : "Position along the route";
      const bounds = new mapboxgl.LngLatBounds();
      points.forEach(point => bounds.extend(point));
      map.fitBounds(bounds, { padding: 36, maxZoom: 15, duration: 0 });
      setProblem("");
    });
    map.on("error", () => setProblem(vi ? "Không thể tải bản đồ Mapbox." : "Unable to load the Mapbox map."));
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      rider.current = null;
      map.remove();
    };
    // Rebuild the route only when coordinates change, never on every animation frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey, vi]);

  useEffect(() => {
    if (rider.current && route.length >= 2) {
      rider.current.setLngLat(positionAlongRoute(route, progress));
    }
  }, [route, progress]);

  return (
    <div style={{ position: "relative", width: "100%", height: 230 }}>
      <div ref={container} style={{ width: "100%", height: "100%", borderRadius: 12 }} aria-label={vi ? "Bản đồ theo dõi lộ trình giao hàng" : "Delivery route tracking map"} />
      {problem && <p role="status" style={{ position: "absolute", bottom: 4, left: 8, right: 8, background: "#fff8f0", padding: 8, borderRadius: 8 }}>{problem}</p>}
    </div>
  );
}
