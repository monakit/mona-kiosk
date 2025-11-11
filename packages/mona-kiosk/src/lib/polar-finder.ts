type PolarPage<T> = {
  result?: {
    items?: T[];
  };
};

type ListFunction<T, TArgs> = (
  args: TArgs,
) => Promise<AsyncIterable<PolarPage<T>>>;

/**
 * Normalise metadata values so numeric/string forms can be compared.
 */
export function normaliseMetadataValue(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return null;
}

/**
 * Iterate through paginated Polar list responses and return the first item
 * that matches the provided predicate.
 */
export async function findFirstListItem<T, TArgs>(params: {
  list: ListFunction<T, TArgs>;
  args: TArgs;
  predicate?: (item: T) => boolean;
}): Promise<T | null> {
  const iterator = await params.list(params.args);

  for await (const page of iterator) {
    const items = page.result?.items ?? [];
    if (items.length === 0) {
      continue;
    }

    if (!params.predicate) {
      return items[0];
    }

    const match = items.find(params.predicate);
    if (match) {
      return match;
    }
  }

  return null;
}

/**
 * Search for an entity by checking multiple candidate metadata values.
 */
export async function findByMetadataCandidates<T, TArgs>(params: {
  list: ListFunction<T, TArgs>;
  buildArgs: (candidate: string) => TArgs;
  candidates: Iterable<string>;
  getMetadataValue: (item: T) => unknown;
  normalise?: (value: unknown) => string | null;
}): Promise<T | null> {
  const { list, buildArgs, candidates, getMetadataValue } = params;
  const normalise = params.normalise ?? normaliseMetadataValue;

  for (const candidate of candidates) {
    const iterator = await list(buildArgs(candidate));

    for await (const page of iterator) {
      const items = page.result?.items ?? [];
      const match = items.find((item) => {
        const value = normalise(getMetadataValue(item));
        return value === candidate;
      });

      if (match) {
        return match;
      }
    }
  }

  return null;
}
