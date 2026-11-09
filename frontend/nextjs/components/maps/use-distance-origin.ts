"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/components/auth/use-session";
import { coordinates, profileApi, type Coordinates } from "@/lib/locations";
import { useLocation } from "./location-provider";

export function useDistanceOrigin() {
  const { user } = useSession();
  const { point } = useLocation();
  const userId = user?.userId;
  const [home, setHome] = useState<{ userId: number; point: Coordinates | null } | null>(null);

  useEffect(() => {
    let active = true;
    setHome(null);
    if (userId !== undefined) {
      profileApi.addresses().then(addresses => {
        if (active) setHome({ userId, point: coordinates(addresses.find(address => address.isDefault)) });
      }).catch(() => {});
    }
    return () => { active = false; };
  }, [userId]);

  const homePoint = home?.userId === userId ? home?.point : null;
  return { origin: homePoint ?? point, fromHome: Boolean(homePoint) };
}
