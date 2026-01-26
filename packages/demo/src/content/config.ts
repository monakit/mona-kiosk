import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { PayableMetadata } from "mona-kiosk";

const chapterRef = z.object({
  slug: z.string(),
  title: z.string(),
  free: z.boolean().optional(),
});

const partDef = z.object({
  title: z.string(),
  chapters: z.array(chapterRef),
});

const blog = defineCollection({
  loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string(),
        description: z.string(),
        pubDate: z.coerce.date(),
        updatedDate: z.coerce.date().optional(),
        heroImage: image().optional(),
      })
      .merge(PayableMetadata),
});

const courses = defineCollection({
  loader: glob({
    base: "./src/content/courses",
    pattern: "**/toc.{md,mdx}",
  }),
  schema: z
    .object({
      title: z.string(),
      description: z.string(),
      author: z.string().optional(),
      tags: z.array(z.string()).optional(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      structure: z.array(z.union([chapterRef, partDef])),
    })
    .merge(PayableMetadata),
});

const courseChapters = defineCollection({
  loader: glob({
    base: "./src/content/courses",
    pattern: "**/[0-9][0-9]-*.{md,mdx}",
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

export const collections = { blog, courses, courseChapters };
