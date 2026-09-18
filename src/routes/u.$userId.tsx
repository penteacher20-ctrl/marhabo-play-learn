import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Public member profiles (showcases of user-created games) are disabled until
 * human content review is in place. No profiles, games, or data are deleted —
 * only the public showcase is turned off. Direct play links keep working.
 */
export const Route = createFileRoute("/u/$userId")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
