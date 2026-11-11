/* eslint-disable @next/next/no-img-element */
export function Logo({ size = 36 }: { size?: number }) {
  return <img src="/logo.png" alt="" width={size} height={size} style={{ borderRadius: "50%", display: "block" }} />;
}
