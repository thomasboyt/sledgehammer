import { AssetBase, SpriteSheet } from 'pearl';

export default class SpriteSheetAsset extends AssetBase<SpriteSheet> {
  spriteWidth: number;
  spriteHeight: number;

  constructor(path: string, spriteWidth: number, spriteHeight: number) {
    super(path);
    this.spriteWidth = spriteWidth;
    this.spriteHeight = spriteHeight;
  }

  load(path: string) {
    return new Promise<SpriteSheet>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(this.createSpriteSheet(img));
      img.onerror = (evt) => reject(evt.error);
      img.src = path;
    });
  }

  private createSpriteSheet(img: HTMLImageElement): SpriteSheet {
    return new SpriteSheet(img, this.spriteWidth, this.spriteHeight);
  }
}
