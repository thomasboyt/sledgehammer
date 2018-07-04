### fun game todos

- [x] move bottom-screen text to mid-screen
- [x] initial enemies should spawn in after players
- [x] add slight delay for shooting enemies
- [x] add a ready-up system
  - shows ready state under the player
  - host can ignore?
- [ ] a few more enemy types?
  - enemies that take multiple hits
- [ ] more enemy interactions
- [ ] power-ups
  - bubble shield
- [ ] add more levels
- [ ] add difficulty curve
  - every level: more enemies to start with, faster spawning
  - different distributions of enemy types?

### architecture

- [ ] instead of diffing against snapshot, add explicit createObject() and removeObject() messages
- [ ] simplify serialization logic
  - using this `component.constructor.name` trick, maybe?
  - basically have like `const syncList: (keyof )[] = ['center', 'vel', 'angle']` and then pass this syncList to the prefab somehow?
- [ ] improve prefab system
  - pass arguments to prefab constructor?
- [ ] automagically handle references to other objects
  - on host: `if (typeof component[field] === 'object') { serialized[field] = networkIdFor(component[field])}`
  - on client: IDK this is trickier :(
  - maybe need some sort of decorator/metadata magic...
- [ ] handle parent/child relationships on networked objects
  - also probably just use object ID
  - update pearl to allow setting a child/parent relationship without addChild()?
  - but also update createNetworkedPrefab() to accept a parent object
  - cases i'm worried about
    - when a parent is deleted, and then snapshot sync happens, will there be any issues if delete happens out of order? couldn't onDestroy() end up called twice??? :(
  - really would like parent-child relationships
    - world -> {enemy, player, bullet}
    - session -> world
    - synced on client!!
