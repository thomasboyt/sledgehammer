export default function showRoomLink(roomCode: string) {
  const roomLink = document.getElementById('room-link');
  console.log('roomCode:', roomCode);
  const url =
    document.location.origin +
    document.location.pathname +
    `?roomCode=${roomCode}`;
  console.log('link', url);

  if (roomLink) {
    roomLink.style.display = 'block';
    const a = roomLink.querySelector('a')!;
    a.href = url;
    a.innerText = url;
  }
}
