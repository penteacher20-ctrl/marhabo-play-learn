export function FloatingDeco() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <span className="absolute top-10 left-[8%] text-3xl float-anim">⭐</span>
      <span className="absolute top-32 right-[12%] text-4xl float-anim-slow">🪐</span>
      <span className="absolute bottom-24 left-[20%] text-3xl float-anim-slow">✨</span>
      <span className="absolute top-1/2 right-[6%] text-2xl float-anim">💫</span>
      <span className="absolute bottom-10 right-[30%] text-3xl wiggle">🎈</span>
      <span className="absolute top-20 right-[40%] text-2xl float-anim">🌟</span>
    </div>
  );
}
