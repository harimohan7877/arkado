import HomeClient from "@/components/HomeClient";
import { getHomeData } from "@/lib/home-data";
import { DEFAULT_SETTINGS } from "@/lib/default-settings";

/**
 * Homepage — async Server Component.
 *
 * All public datasets (courses, featured, new arrivals, slider, categories,
 * settings) are fetched ONCE on the server in a single parallel batch and
 * rendered into the HTML. A fresh phone visit no longer waits for the JS
 * bundle + 6 client-side API round trips before seeing content.
 *
 * ISR: the rendered page is cached at the edge for 60s. Admin-panel edits
 * (new course, featured picks, settings) go live within a minute without
 * any manual rebuild.
 */
export const revalidate = 60;

export default async function HomePage() {
  let data;
  try {
    data = await getHomeData();
  } catch (err) {
    console.error("[homepage] getHomeData failed:", err);
    data = {
      courses: [],
      featured: [],
      newArrivals: [],
      sliderCourses: [],
      categories: [],
      settings: DEFAULT_SETTINGS,
    };
  }

  return (
    <HomeClient
      courses={data.courses}
      featured={data.featured}
      newArrivals={data.newArrivals}
      sliderCourses={data.sliderCourses}
      categories={data.categories}
      settings={data.settings}
    />
  );
}
