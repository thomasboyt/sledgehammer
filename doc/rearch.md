problems currently being faced:

1. the code base is getting really complex on the host
2. don't know how to handle animations on the client without involving host (client side state)
3. don't know how to send partial snapshots 

sending partial snapshots will require some sort of entity ID system


calculating animations on the client involves client-local state. animations include both, like, particle effects, but also things like walk cycles attached to a specific entity.

in general, the logic for triggering an animation for an entity would look something like

```
if player has started moving:
  set isWalking = true

if isWalking is true:
  create a timer that, in 100 ms, we should switch to the next animation frame
```

this could almost be like a coroutine type thing:

```
*animateWalking() {
  while (true) {
    this.animationState = 'walk-1';
    yield waitMs(100);
    this.animationState = 'walk-2';
    yield waitMs(100);
  }
}
```

in the past I've had entity objects that had "animation managers." this just held the animation state, and cycled through animation frames as appropriate.

this could be handled by the host, but it feels weird. I think maybe the host could handle setting animation state, but then the client should handle cycling through frames.

so maybe the state shape for an entity now looks like

```
players = [{
  center: [0, 0],
  // ...
  animation: 'walking',
}]
```

and then there's some new localUpdate() hook

```
localUpdate(dt: number, newState, prevState) {
  const playerStates = [newState.players, prevState.players].zip(); // TODO: zip by id instead of idx

  for (let [newPlayerState, prevPlayerState] of playerStates) {
    if (newPlayerState.animation !== prevPlayerState.animation) {
      this.animationManager.setAnimation(playerId, newPlayerState.animation)
    }
  }
}
```

and then render looks something like

```
renderPlayer(animations, playerId) {
  const animation = animations.get(playerId);
  const sprite = animation.sprite;
  // render sprite
}
```

particle effects are more confusing. they should definitely be computed on the client and the host should only be in charge of instantiating them. maybe they are an entity unto themselves, captured in the snapshot, but the only "state" is calculated in the render() hook?

I think in general there needs to be a cleaner way of interacting with "entities" instead of this weird bespoke thing there is now. Maybe the state shape becomes


```
{
  // id is an opaque ID
  playerToEntityID: Map<playerId, entityId>

  // entities are just "things that get updated"
  entities: Map<id, Entity>

  // level data is different in that it's *static*. it does get updated, but only on level shift.
  levelData: Level;

  // this should only contain state clients need! host should store elsewhere
  players: Map<playerId, Player>
}
```

UPDATE snapshots then look like:

```
{
  entities: Map<id, Entity>,
}
```

at first this snapshot might completely replace the old one, but in the future partial diffs (at least at the entity resolution) would be possible if there was an easy way to track on the server which entities are changed

to cycle level, a RESET snapshot is used, containing all the state

there are three types of "state," then:

* *Synced state* is the state that travels through snapshots.
* *Host state* is state relevant only to the host. Examples: timers, player metadata (inputters, sockets).
* *Client state* is state relevant only to a specific client (but the host itself _is_ a client, so). Examples: animation state, predictive movement.

The entity ID is used to allow denormalized state to prevent mixing these things, potentially. An object graph could also potentially work.