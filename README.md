# sledgehammer

hey this thing sucks rn don't look at it

### what is this

sledgehammer ([working title](https://www.youtube.com/watch?v=OJWJE0x7T4Q)) is a browser-based game for 1-4 players, featuring peer-to-peer multiplayer. it's basically a clone of [crossroads for the c64](http://www.dessgeega.com/crossroads.html).

originally i was building it with no framework, trying to use a redux-ish control flow, but eventually i got really frustrated with how difficult i was finding that to architect, and instead rebuilt it in [pearl](https://github.com/thomasboyt/pearl), a [component-entity](http://gameprogrammingpatterns.com/component.html) game framework. this has been going okay, but has involved building a lot of scaffolding on top of pearl to support online networking, and it's currently pretty hacky.

it uses webrtc for networking, powered by [simple-peer](https://github.com/feross/simple-peer) and a lobby server i wrote called [groovejet](https://github.com/thomasboyt/groovejet).

## how do i play it

it's currently live at [http://sledgehammer.surge.sh/](http://sledgehammer.surge.sh/).

### how do i run it

to run:

```
npm install
npm run dev
```

you'll also need a [groovejet](https://github.com/thomasboyt/groovejet) server running

### what's left to figure out

this is a long-term-ish planning list and not meant as todos; that's living in a workflowy document.

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

#### thoughts on collision

i'd like **semi-automated collision stuff**. basically have some concept of collision layers, and some sort of collision protocol? and _possibly_ automated collision resolution (by preventing collisions from happening in the first place)?

* collision protocol
  * so a preresiquite for automated collision pairing is that I need to be able to say `obj1.isColliding(obj2)`, which isn't a concept that currently exists right now
  * basically need an `obj.getCollider()`
  * maybe this is something like `obj.registerCollider(component)`, then `obj.getCollider()`
  * `obj.registerCollider` could happen within collider creation. could also check for existing collider and error out if there is one
  * then if `obj1.isColliding(obj2)` is passed, it actually calls `obj1.getCollider().isColliding(obj2.getCollider())`
  * this does mean that in some cases you'd end up with "obj1's collider knows how to handle obj2's collider, but not vice versa", which is really tricky :\
  * maybe won't be an issue if tileMap walls get turned into collidable entities...
* can _maybe_ consider automated collision resolution but it'd be a stretch, especially in a tile-based world
  * would probably have to be a move-and-collide strategy like godot? http://docs.godotengine.org/en/3.0/tutorials/physics/physics_introduction.html
  * this pacman unity tutorial also sorta relevant https://noobtuts.com/unity/2d-pacman-game
* collision layers...
