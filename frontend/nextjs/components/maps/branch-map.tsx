"use client";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { Coordinates } from "@/lib/locations";
import styles from "./maps.module.css";
export type MapPoint = Coordinates & { id: string; label: string };
export type BranchMapProps = { points?: MapPoint[]; selectedId?: string; focusRequest?: number; onSelect?: (id: string) => void; pin?: Coordinates | null; onPick?: (point: Coordinates) => void; origin?: Coordinates | null; originLabel?: string; coverage?: Coordinates & { radiusKm: number } };
const MapboxMap = dynamic(() => import("./mapbox-map"), { ssr: false });
export function BranchMap(props: BranchMapProps) {
  const t = useTranslations("maps");
  return <div className={styles.map} role="region" aria-label={t("mapLabel")}><MapboxMap {...props} /></div>;
}
