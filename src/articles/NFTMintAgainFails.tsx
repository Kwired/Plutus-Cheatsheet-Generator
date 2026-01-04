import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
  id: "nft-mint-again-fails",
  title: "NFT Mint Again — Why It Fails",
  subtitle: "UTxO-based uniqueness enforcement",
  tags: ["plutus", "nft", "utxo", "failure"],
    date: "2025-12-15T10:00:00.000Z",
  readTime: "9 min read",
};

export default function NFTMintAgainFails() {
  return (
    <div className="article-content">
      <h2>Scenario</h2>
      <p className="pexplaination">
        Attempt to mint the <strong>same NFT again</strong> using the same UTxO.
      </p>

      <h2>Observed Error</h2>

      <CodeBlock
        code={`Error: The following tx input(s) were not present in the UTxO:
0b9423225b3c42dde3d1fb3cd85708aed45dd60503db4b700fbbfe8779c19d31#0`}
        language="text"
        filename="CLI Error"
      />

      <h2>Why This Failed</h2>
      <p className="pexplaination">
        The minting policy requires consuming a <strong>specific UTxO</strong>.
        That UTxO was already spent in the first minting transaction.
      </p>

      <p className="pexplaination">
        Since UTxOs are <strong>single-use</strong>, the ledger itself rejected
        the transaction before the script even ran.
      </p>

      <h2>Key Insight</h2>
      <p className="font-bold text-red-700">
        ❌ NFTs cannot be re-minted because the required UTxO no longer exists.
      </p>

      <p className="pexplaination">
        This is not a script failure — this is the UTxO model enforcing scarcity.
      </p>
    </div>
  );
}
