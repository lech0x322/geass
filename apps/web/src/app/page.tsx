"use client";

import { App } from "@/components/App";
import { LandingPage } from "@/components/LandingPage";
import { useWalletAuth } from "@/lib/auth";

export default function Page() {
  const auth = useWalletAuth();

  if (!auth.wallet) {
    return <LandingPage onConnect={auth.connect} connecting={auth.loading} />;
  }

  return <App wallet={auth.wallet} balance={auth.balance} onDisconnect={auth.disconnect} />;
}
