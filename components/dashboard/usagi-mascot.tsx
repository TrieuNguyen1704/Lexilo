"use client";

import Image from "next/image";

interface UsagiMascotProps {
  mood: "cheering" | "happy" | "waiting";
  onClick?: () => void;
}

export function UsagiMascot({ mood, onClick }: UsagiMascotProps) {
  const isCheering = mood === "cheering";
  const imageSrc = isCheering ? "/usagi-cheer.png" : "/usagi-jump.png";

  return (
    <button
      type="button"
      onClick={onClick}
      className="tap-press group relative flex cursor-pointer items-center justify-center rounded-full p-1 select-none"
      title="Bấm vào Usagi để nghe lời nhắn!"
      aria-label="Tương tác với linh vật Usagi"
    >
      <div
        className={`pointer-events-none absolute -inset-3 rounded-full blur-2xl transition-all duration-700 ${
          isCheering
            ? "animate-pulse bg-amber-300/80 opacity-90"
            : "bg-orange-200/60 opacity-70 group-hover:opacity-100"
        }`}
      />

      <div
        className={`relative transition-all duration-300 group-hover:scale-105 ${
          isCheering ? "animate-bounce" : "hover:-translate-y-1.5"
        }`}
      >
        <Image
          src={imageSrc}
          alt={isCheering ? "Usagi Thumbs Up Cổ Vũ" : "Usagi Nhảy Múa"}
          width={128}
          height={128}
          unoptimized
          className={`pointer-events-none object-contain drop-shadow-lg transition-all duration-300 select-none ${
            isCheering ? "h-28 w-28 sm:h-32 sm:w-32" : "h-24 w-24 sm:h-28 sm:w-28"
          }`}
        />
      </div>
    </button>
  );
}
