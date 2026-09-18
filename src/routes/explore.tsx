import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Public community listing is disabled until human content review is in place.
 * No games or user data are deleted — only public discovery is turned off.
 * Direct play links keep working.
 */
export const Route = createFileRoute("/explore")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
