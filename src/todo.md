[x] sync two games together
  - mvp of this: just players moving around
  - NetworkingHost component
    - handles incoming connections
    - Game component subscribes with `this.getComponent<NetworkingHost>.onPlayerAdded((player) => {...})`/removed
    - maybe separate HostGame and ClientGame components?
  - NetworkingClient component
    - can send data to host, e.g.
    - `this.getComponent<NetworkingClient>.sendKeys({...})`
    - maybe automatically subscribes to local inputter?
    - handles syncing data received to registered entities
      - what determines which data is synced?
      - maybe a list, like `new Sync(['Physical.center', 'Player.isMoving'])`
      - maybe some sort of annotation?
  - NetworkingHost/NetworkingClient get passed `peer` and use it directly
[x] handle destroying networked objects
  - need to remove from map of networked objects
  - scenarios: pearl.entities.destroy() called...
    - inject component with onDestroy hook?
    - alternatively in serialize(): if object.isDestroyed...
[ ] improve prefab system
  - pass arguments to prefab constructor?
[ ] how will we serialize references between components or objects
  - ID?
  - (de)serialize() can sorta handle this for now
    - e.g. if Bullet has a reference to Player to see who created...
    - just serialize player ID or object ID, and deserialize manually
[ ] port over tile map system
  - TileMap component on world or session object
    - also have a separate World or Session object
  - TileMapEntity component? maybe? should have ref to TileMap either way
  - handling tweens between tiles
  - child objects of world will ref parent by 


[ ] handle parent/child relationships on networked objects
  - also probably just use object ID
  - update pearl to allow setting a child/parent relationship without addChild()?
  - but also update createNetworkedPrefab() to accept a parent object
  - cases i'm worried about
    - when a parent is deleted, and then snapshot sync happens, will there be any issues if delete happens out of order? couldn't onDestroy() end up called twice??? :(

[ ] todo refactors
  - need to clarify Game/Session/World relationships
  - really would like parent-child relationships
    - world -> {enemy, player, bullet}
    - session -> world
    - synced on client!!

## fancy version:

creation:
  on host:
    serialize GameObject metadata (ID, name)
    serialize a list of Components that can be mapped back to the the component objects, somehow (some sort of registry?)
    serialize the current *serializable state* of each component
      i have no idea what this looks like yet. maybe just special case tbh
      create (de)serialize() methods for each game object?
  on client:
    instantiate all components with default settings
    set state from serialized state

update:
  on host:
    just snapshot serializable state of all GameObjects and send over, I guess, idk

## dumb version

NetworkingHost and NetworkingClient just have a whole bunch of non-magic boilerplate

onNewLevel:
  NetworkingClient instantiates World GameObject object
onSnapshot:
  NetworkingClient just diffs snapshot against current entities attached to World


CREATION IS DUUUMB RIGHT NOW

what it does currently is sync the whole object over and instantiate if it's missing, but this is really awkward if you have data you want to set once and not sync every frame
would be nicer to instead send a `created` message with `creationOptions`

# animations

- texturepacker spritesheets https://github.com/thomasboyt/two-minute-triathlon/blob/master/src/client/util/TexturePackerSpriteSheet.ts
- new SpriteSheet(loadedImage, jsonAtlas)
- can load images through AssetManager but it feels kinda wonky