function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (evt) => reject(evt.error);
    img.src = src;
  });
}

function objectToMap<T>(obj: { [key: string]: T }): Map<string, T> {
  const entries = Object.keys(obj).map((key): [string, T] => [key, obj[key]]);
  return new Map(entries);
}

async function loadImages(imageSrcs: {
  [_: string]: string;
}): Promise<Map<string, HTMLImageElement>> {
  const nameToSrcMap = objectToMap(imageSrcs);

  const entryPromises = [...nameToSrcMap.entries()].map(
    async ([name, src]): Promise<[string, HTMLImageElement]> => {
      const img = await loadImage(src);
      return [name, img];
    }
  );

  const entries = await Promise.all(entryPromises);
  return new Map(entries);
}

interface AssetPaths {
  images: { [_: string]: string };
}

export interface Assets {
  images: Map<string, HTMLImageElement>;
}

export async function loadAssets(assetPaths: AssetPaths): Promise<Assets> {
  return {
    images: await loadImages(assetPaths.images),
  };
}
