import { initials } from "../lib/tasks";

export default function Avatar({ name, picture, size = 28 }: { name: string; picture?: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: size * 0.4 };
  if (picture) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="avatar" style={style} src={picture} alt={name} referrerPolicy="no-referrer" />;
  }
  return (
    <span className="avatar fallback" style={style}>
      {initials(name)}
    </span>
  );
}
