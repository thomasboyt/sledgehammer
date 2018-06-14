type EntityID = number;

interface SerializedEntity<T, S extends {}> {
  id: EntityID;
  type: T;
  state: S;
}

type EntityMap = {
  [_: string]: new (id: EntityID, state: any) => Entity<any>;
};

abstract class Entity<S extends {}> {
  state: S;
  id: EntityID;
  abstract readonly type: string;

  constructor(id: EntityID, initialState: S) {
    this.state = initialState;
    this.id = id;
  }

  /**
   * called on creation
   */
  abstract onCreate(): void;

  /**
   * called on the host to update entity state
   */
  abstract onHostTick(dt: number): void;

  updateState(state: S) {
    this.state = state;
  }

  /**
   * serialize into object for sending to client
   */
  serialize(): SerializedEntity<any, any> {
    return {
      id: this.id,
      type: this.type,
      state: this.state,
    };
  }
}

interface EnemyState {
  center: [number, number];
}

class Enemy extends Entity<EnemyState> {
  readonly type = 'enemy';

  onCreate() {}

  onHostTick() {}
}

class Player extends Entity<EnemyState> {
  readonly type = 'player';

  onCreate() {}

  onHostTick() {}
}

const entityForType = {
  enemy: Enemy,
  // player: Player,
};

interface EntityTypeMap {
  player: Player;
  enemy: Enemy;
}
type EntityTypes = EntityTypeMap[keyof EntityTypeMap];

const entities = new Map<number, EntityTypes>();

const findByType = <T extends keyof EntityTypeMap>(type: T) => (
  entity: EntityTypes
): entity is EntityTypeMap[T] => entity.type === type;

function filterEntities<T extends keyof EntityTypeMap>(
  entities: Map<number, EntityTypes>,
  type: T
) {
  return [...entities.values()].filter(findByType('player'));
}

const filtered = filterEntities(entities, 'player');

// function filterEntities<T extends keyof EntityTypeMap>(entities: EntityTypes[], type: T) {
// }

// const entity = filterEntities([...entities.values()], 'enemy');

// for (let entity of entities.values()) {
//   if (entity.type === 'enemy') {
//     console.log(entity);
//   }
// }

// const filtered = [...entities.values()].filter(
//   (entity): entity is T => entity instanceof T
// );
