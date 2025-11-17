import { defineCollection, z } from "astro:content";
import { PayableMetadata } from "mona-kiosk";

const blog = defineCollection({
  type: "content",
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

export const collections = { blog };
