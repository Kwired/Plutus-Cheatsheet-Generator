/* eslint-disable react-refresh/only-export-components */
import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
  id: "nft-mint-bad-redeemer",
  title: "NFT Mint With Bad Redeemer",
  subtitle: "Why the redeemer does not matter here",
  tags: ["plutus", "nft", "redeemer", "minting"],
    date: "2025-12-15T10:00:00.000Z",
  readTime: "4 min read",
  plutusVersion: "V2",
  complexity: "Advanced",
  useCase: "NFTs"

};

export default function NFTMintBadRedeemer() {
  return (
    <div className="article-content">
      <h2>Scenario</h2>
      <p className="pexplaination">
        Mint an NFT using a <strong>different redeemer constructor</strong>.
      </p>

      <h2>What Happened</h2>
      <p className="pexplaination text-green-700 font-semibold">
        ✅ Transaction succeeded
      </p>

      <h2>Why This Worked</h2>

      <p className="pexplaination">
        The minting policy signature is:
      </p>

      <CodeBlock
        code={`mkNFTPolicy :: TxOutRef -> TokenName -> () -> ScriptContext -> Bool`}
        language="haskell"
        filename="Policy Signature"
      />

      <p className="pexplaination">
        The redeemer is typed as <code>()</code> and is <strong>not inspected</strong>.
        This means:
      </p>

      <ul className="list-disc pl-6 space-y-2">
        <li>Redeemer constructor is ignored</li>
        <li>No fields are checked</li>
        <li>Only UTxO consumption + mint amount matter</li>
      </ul>

      <h2>Important Lesson</h2>
      <p className="font-bold text-yellow-700">
        ⚠️ Redeemers only matter if your policy explicitly validates them.
      </p>

      <p className="pexplaination">
        In this policy, the redeemer is effectively a placeholder.
      </p>
    </div>
  );
}
