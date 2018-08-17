import { Component, SpriteSheet } from 'pearl';
import { Assets } from '../assets';
import memoize from 'micro-memoize';

export default class AssetManager extends Component<Assets> {
  assets!: Assets;

  create(assets: Assets) {
    this.assets = assets;
  }

  private _getSpriteSheet(
    name: string,
    spriteWidth: number,
    spriteHeight: number
  ) {
    const image = this.assets.images.get(name);

    if (!image) {
      throw new Error(
        `no image asset named ${name} to create sprite sheet from`
      );
    }

    return new SpriteSheet(image, spriteWidth, spriteHeight);
  }

  getSpriteSheet = memoize(this._getSpriteSheet);
}
