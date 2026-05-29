"use client";

import { useState, useEffect } from "react";
import { App } from "@/components/App";
import { MobileShell } from "@/components/MobileShell";
import { LandingPage } from "@/components/LandingPage";
import { useWalletAuth } from "@/lib/auth";

export default function Page() {
  const auth = useWalletAuth();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!auth.wallet) {
    return <LandingPage onConnect={auth.connect} connecting={auth.loading} />;
  }

  if (isMobile) {
    return (
      <MobileShell
        wallet={auth.wallet}
        balance={auth.balance}
        onDisconnect={auth.disconnect}
      />
    );
  }

  return (
    <App wallet={auth.wallet} balance={auth.balance} onDisconnect={auth.disconnect} />
  );
}
