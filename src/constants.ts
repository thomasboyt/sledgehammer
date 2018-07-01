export const lobbyServer = process.env.LOBBY_SERVER || 'localhost:3000';

export const WIDTH = 640;
export const HEIGHT = 480;

export const TILE_SIZE = 16;
export const WORLD_SIZE_WIDTH = 39;
export const WORLD_SIZE_HEIGHT = 23;

export const START_COUNTDOWN_MS = 3000;
// export const START_COUNTDOWN_MS = 0;

function getParameterByName(name: string): string | null {
  var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
  return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

export const DEBUG_GOD_MODE = getParameterByName('godmode');
export const DEBUG_RENDER_SIGHTLINES = getParameterByName('rendersightlines');
