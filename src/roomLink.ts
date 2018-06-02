export default function showRoomLink(roomCode: string) {
  const roomLink = document.getElementById('room-link');

  if (roomLink) {
    roomLink.style.display = 'block';
    const link = window.location.origin + `/?game=${roomCode}`;
    const a = roomLink.querySelector('a')!;
    a.href = link;
    a.innerText = link;
  }
}
