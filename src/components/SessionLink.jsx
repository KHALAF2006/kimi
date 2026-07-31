import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { previewSafeHref } from "@/lib/preview-auth-handoff";

/** @param {import("react-router-dom").LinkProps["to"]} to @param {import("react").MouseEventHandler<HTMLAnchorElement> | undefined} onClick */
function useSessionLink(to, onClick) {
  const navigate = useNavigate();
  const href = previewSafeHref(to);
  const handleClick = (event) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      navigate(to);
    }
  };
  return { href, handleClick };
}

/** @param {import("react-router-dom").LinkProps} props */
export function SessionLink({ to, onClick, ...props }) {
  const { href, handleClick } = useSessionLink(to, onClick);
  return <Link to={href} onClick={handleClick} {...props} />;
}

/** @param {import("react-router-dom").NavLinkProps} props */
export function SessionNavLink({ to, onClick, ...props }) {
  const { href, handleClick } = useSessionLink(to, onClick);
  return <NavLink to={href} onClick={handleClick} {...props} />;
}
