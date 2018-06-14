[ ] sync two games together
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
[ ] port over tile map system
  - TileMap component on session
  - TileMapEntity component? maybe? should have ref to TileMap either way
  - handling tweens between tiles

how do we sync GameObjects??

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