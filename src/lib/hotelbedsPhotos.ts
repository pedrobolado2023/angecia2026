/** Wait for the official photos used by the cards and galleries before publishing the results. */
export async function prepareHotelbedsPhotos(
  urls: (string | undefined)[],
  signal: AbortSignal
): Promise<Set<string>> {
  const queue = [...new Set(urls.filter((url): url is string =>
    typeof url === "string" && url.startsWith("https://photos.hotelbeds.com/giata/")
  ))];
  const loaded = new Set<string>();
  let next = 0;

  function load(url: string): Promise<boolean> {
    if (signal.aborted) return Promise.resolve(false);
    return new Promise((resolve) => {
      const image = new Image();
      const finish = (ok: boolean) => {
        clearTimeout(timer);
        signal.removeEventListener("abort", cancel);
        image.onload = image.onerror = null;
        if (!ok) image.removeAttribute("src");
        resolve(ok);
      };
      const cancel = () => finish(false);
      const timer = setTimeout(cancel, 8000);
      signal.addEventListener("abort", cancel, { once: true });
      image.onload = () => finish(image.naturalWidth > 0);
      image.onerror = cancel;
      image.src = url;
    });
  }

  await Promise.all(Array.from({ length: Math.min(16, queue.length) }, async () => {
    while (!signal.aborted && next < queue.length) {
      const url = queue[next++];
      if (await load(url)) loaded.add(url);
    }
  }));
  return loaded;
}
