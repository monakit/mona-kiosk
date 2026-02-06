import { getRelativeLocaleUrl } from "astro:i18n";
import rss from "@astrojs/rss";
import { m } from "@/paraglide/messages.js";
import { baseLocale } from "@/paraglide/runtime.js";

export async function GET(context) {
  const { getCollection } = await import("astro:content");
  const locale = context.currentLocale ?? baseLocale;
  const posts = await getCollection("blog", ({ id }) =>
    id.startsWith(`${locale}/`),
  );
  return rss({
    title: m.site_title({}, { locale }),
    description: m.site_description({}, { locale }),
    site: context.site,
    items: posts.map((post) => ({
      ...post.data,
      link: getRelativeLocaleUrl(
        locale,
        `blog/${post.id.startsWith(`${locale}/`) ? post.id.slice(locale.length + 1) : post.id}`,
      ),
    })),
  });
}
