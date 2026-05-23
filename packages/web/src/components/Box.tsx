import type { ReactNode } from "react";

export function Box({
  icon,
  title,
  meta,
  children
}: {
  icon: string;
  title: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <section className="box">
      <div className="box-head">
        <img className="box-icon" src={`${import.meta.env.BASE_URL}icons/${icon}.png`} alt="" />
        <h2 className="box-title">{title}</h2>
        {meta && <span className="box-meta">{meta}</span>}
      </div>
      <div className="box-content">{children}</div>
    </section>
  );
}
