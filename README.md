# sledgehammer

hey this thing sucks rn don't look at it

### what is this

sledgehammer ([working title](https://www.youtube.com/watch?v=OJWJE0x7T4Q)) is a browser-based game for 1-4 players, featuring peer-to-peer multiplayer. it's basically a clone of [crossroads for the c64](http://www.dessgeega.com/crossroads.html).

originally i was building it with no framework, trying to use a redux-ish control flow, but eventually i got really frustrated with how difficult i was finding that to architect, and instead rebuilt it in [pearl](https://github.com/thomasboyt/pearl), a [component-entity](http://gameprogrammingpatterns.com/component.html) game framework. this has been going okay, but has involved building a lot of scaffolding on top of pearl to support online networking, and it's currently pretty hacky.

it uses 

### how do i run it

to run:

```
npm install
npm run dev
```

you'll also need a [groovejet](https://github.com/thomasboyt/groovejet) server running

### what's left to figure out

this is a long-term-ish planning list and not meant as todos; that's living in a workflowy document.

#### enemy AI

so crossroads has the concept of "sightlines" which is pretty important to AI. basically, there are enemies that can only see a few tiles in front of themselves, but will chase you once they see you, stuff like that.

this is a really interesting challenge. the naive way to do this would be something like:

```typescript
class ChasingEnemy {
  canSeePlayer = false;

  findNextTile() {
    const player = this.pearl.entities.find('player');

    if (this.sawPlayer || this.canSeePlayer(player)) {
      // TODO: maybe like debounce this or something so you're not re-finding on every frame
      // also would make enemy "lag behind" slightly which might be nice
      const playerTile = player.getComponent(TileEntity).tilePosition;
      return pathFind(this.getComponent(TileEntity), playerTile);
    } else {
      // use normal AI
    }
  }

  canSeePlayer(player): boolean {
    // get bounding box forward from current tile...
    const boundingBox = this.getComponent(TileEntity).project(3)  // n = number of tiles to project
    // if player collides with bounding box, we can see them
    return player.getComponent(PolygonCollider).isColliding(boundingBox);
  }
}
```

i think this is fine but should only happen like 5 times a second or something?

#### how to only send changes over network

goals: less data sent, less cpu used updating, allow memoized rendering to work on the client w/o special logic

- store shallow of each serialized component
- diff copies against each other
- maybe do deep copies for e.g. vectors? but eh
- watch out for arrays/lists - unity has a special SyncList[PrimitiveType] class for this
- unity serialization happens on NetworkBehaviour: https://docs.unity3d.com/Manual/UNetStateSync.html
- unity also passes a `initialState` bool to both serialize and deserialize functions to differentiate between initial serialization and subsequent updates
  - this would work for World/TileMap, since session destroys and recreates it!
- godot just has like first class rpc stuff which, idk, seems neat, but requires manual sychronization of everything as far as i can tell http://docs.godotengine.org/en/3.0/tutorials/networking/high_level_multiplayer.html#synchronizing-the-game

also a big thing here is potentially using udp-like semantics, since webrtc gives you a choice. this would be good for snapshots, but not so good for RPC-like things (e.g. if i end up adding separate "entity created/destroyed" messages, or player input messages). think i could create two different channels per peer to solve this?

#### how to maintain object hierarchy

goals: allow e.g. world to own entities, make cleanup of scenes easier