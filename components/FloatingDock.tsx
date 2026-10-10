"use client";

import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import SocialFab from "@/components/SocialFab";
import CategoryDrawer from "@/components/CategoryDrawer";

/**
 * Owns the floating buttons on every page:
 * - Chat/social FAB (SocialFab)
 * - Mobile categories FAB + drawer (CategoryDrawer)
 *
 * Rules:
 * - Drawer and chat popup are never open together.
 * - While the drawer is open, the chat FAB glides to the left side;
 *   closing the drawer glides it back.
 */
export default function FloatingDock() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const pathname = usePathname();
  const isAdminRoute = pathname?.includes("admin") ?? false;

  const toggleDrawer = useCallback(() => {
    if (!drawerOpen) setChatOpen(false); // opening drawer closes chat popup
    setDrawerOpen((prev) => !prev);
  }, [drawerOpen]);

  const handleChatToggle = useCallback(
    (v: boolean) => {
      if (drawerOpen) {
        // Chat FAB was tapped while displaced: just close the drawer
        // (FAB glides back); chat popup stays closed.
        setDrawerOpen(false);
        return;
      }
      setChatOpen(v);
    },
    [drawerOpen]
  );

  if (isAdminRoute) return null;

  return (
    <>
      <CategoryDrawer open={drawerOpen} onToggle={toggleDrawer} />
      <SocialFab
        open={chatOpen}
        onOpenChange={handleChatToggle}
        displaced={drawerOpen}
      />
    </>
  );
}
