import type { MetadataRoute } from "next";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { AREAS } from "@/lib/taxonomy";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://japan-coupon-five.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/coupons",
    "/nearby",
    "/ranking",
    "/guide",
    "/notices",
    "/board",
    "/about",
    "/partnership",
    "/support",
    "/terms",
    "/privacy",
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
  }));

  const areaRoutes = AREAS.map((area) => ({
    url: `${SITE_URL}/areas/${area.value}`,
    lastModified: new Date(),
  }));

  const today = new Date().toISOString().slice(0, 10);
  const { data: coupons } = await supabaseAdmin
    .from("coupons")
    .select("id, created_at, stores!inner(is_active)")
    .eq("is_active", true)
    .eq("stores.is_active", true)
    .gte("valid_to", today);

  const couponRoutes = (coupons ?? []).map((coupon) => ({
    url: `${SITE_URL}/coupons/${coupon.id}`,
    lastModified: new Date(coupon.created_at),
  }));

  return [...staticRoutes, ...areaRoutes, ...couponRoutes];
}
