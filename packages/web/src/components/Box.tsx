import { useEffect, useState, type ReactNode } from "react";

type Props = {
  icon: string;
  title: string;
  meta?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function Box({
  icon,
  title,
  meta,
  collapsible = false,
  defaultOpen = true,
  children
}: Props) {
  const iconImg = (
    <img className="box-icon" src={`${import.meta.env.BASE_URL}icons/${icon}.png`} alt="" />
  );

  if (collapsible) {
    return (
      <CollapsibleBox iconImg={iconImg} title={title} meta={meta} defaultOpen={defaultOpen}>
        {children}
      </CollapsibleBox>
    );
  }

  return (
    <section className="box">
      <div className="box-head">
        {iconImg}
        <h2 className="box-title">{title}</h2>
        {meta && <span className="box-meta">{meta}</span>}
      </div>
      <div className="box-content">{children}</div>
    </section>
  );
}

function CollapsibleBox({
  iconImg,
  title,
  meta,
  defaultOpen,
  children
}: {
  iconImg: ReactNode;
  title: string;
  meta?: string;
  defaultOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  // When the parent flips defaultOpen (e.g., after a successful conversion),
  // sync our state so the box auto-collapses/expands accordingly. The user
  // can still toggle freely afterwards within that phase.
  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  return (
    <details
      className="box box-collapsible"
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="box-head box-head-summary">
        {iconImg}
        <h2 className="box-title">{title}</h2>
        {meta && <span className="box-meta">{meta}</span>}
        <svg
          className="box-chevron"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          width="16"
          height="16"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </summary>
      <div className="box-content">{children}</div>
    </details>
  );
}
