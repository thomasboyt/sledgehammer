i want this thing to be a relatively pure functional game, eventually. i think this will look something like:

- use something like immer, but hopefully supporting sets/maps
- update hook is like

```js
let newState = this.state;

// move players & shoot
newState = handlePlayerInput(newState)

newState = updateEnemies(newState)

newState = updateBullets(newState)

// resolve collisions
// this should use some sort of "entities" concept i think
// which might just be like
// entities = [...state.bullets, ...state.players.values(), ...state.enemies]
newState = resolveCollisions(newState)

sendSnapshot(newState)
render(newState)

this.state = newState
```