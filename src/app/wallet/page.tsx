import { WalletTokens } from "@/components/modules/wallet-tokens";

const DEFAULT_WALLET_ADDRESS = "J2XCpwkuvv9XWkPdR7NZyBhajaXA3nt5RGtCnG3JtYiz";

export default function WalletPage() {
  return (
    <main className="mx-auto flex h-svh w-full max-w-md flex-col p-4">
      <WalletTokens publicKey={DEFAULT_WALLET_ADDRESS} />
    </main>
  );
}
