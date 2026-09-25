import Image from "next/image";

type Props = {
  /** Alto de cada logo en px */
  size?: number;
  /** Pone los logos sobre una tarjeta blanca (útil en fondos oscuros) */
  onDark?: boolean;
  className?: string;
};

export function Logos({ size = 40, onDark = false, className = "" }: Props) {
  return (
    <div
      className={`flex items-center gap-3 ${
        onDark ? "rounded-xl bg-white px-3 py-2 shadow-sm" : ""
      } ${className}`}
    >
      <Image
        src="/img/logo-ipn.png"
        alt="Instituto Politécnico Nacional"
        width={size}
        height={size}
        className="object-contain"
        style={{ height: size, width: "auto" }}
        priority
      />
      <span className="h-8 w-px bg-gray-200" aria-hidden />
      <Image
        src="/img/logo-cidetec.png"
        alt="CIDETEC"
        width={size}
        height={size}
        className="object-contain"
        style={{ height: size, width: "auto" }}
        priority
      />
    </div>
  );
}
