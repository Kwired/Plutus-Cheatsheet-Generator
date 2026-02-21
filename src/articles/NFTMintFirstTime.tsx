/* eslint-disable react-refresh/only-export-components */
// import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
  id: "nft-mint-first-time",
  title: "NFT Mint — First Time",
  subtitle: "Minting an NFT by consuming a specific UTxO",
  tags: ["plutus", "nft", "utxo", "minting"],
    date: "2025-12-15T10:00:00.000Z",
  readTime: "3 min read",
  plutusVersion: "V2",
  complexity: "Intermediate",
  useCase: "NFTs"
};

export default function NFTMintFirstTime() {
  return (
    <div className="article-content">
      <h2>Scenario</h2>
      <p className="pexplaination">
        Mint an NFT for the <strong>first time</strong> using a Plutus minting
        policy that requires consuming a specific UTxO.
      </p>

      <h2>What Happened</h2>
      <ul>
        <li>✅ A specific wallet UTxO was used as <code>--tx-in</code></li>
        <li>✅ The NFT policy checked that UTxO was consumed</li>
        <li>✅ Exactly <strong>1 token</strong> was minted</li>
      </ul>

      <h2>Result</h2>
      <p className="pexplaination text-green-700 font-semibold">
        ✅ Transaction succeeded — NFT was minted
      </p>

      <h2>Why This Worked</h2>
      <p className="pexplaination">
        The minting policy enforces two rules:
      </p>

      <ol className="list-decimal pl-6 space-y-2">
        <li>The referenced <strong>TxOutRef must be consumed</strong></li>
        <li>Only <strong>one token</strong> may be minted</li>
      </ol>

      <p className="pexplaination">
        Since the UTxO existed and was consumed, the policy evaluated to
        <code>true</code>.
      </p>

      <p className="font-bold">
        🔐 Ledger-enforced uniqueness achieved.
      </p>
    </div>
  );
}
