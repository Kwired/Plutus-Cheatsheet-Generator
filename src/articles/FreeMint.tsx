/* eslint-disable react-refresh/only-export-components */
import CodeBlock from "@/components/layouts/CodeBlock";
// import React from "react";

// Article metadata
export const articleMeta = {
  id: "free-mint-policy",
  title: "Free Minting Policy",
  subtitle: "An always-succeeds Plutus minting policy",
  date: "2025-01-05T10:00:00.000Z",
  readTime: "5 min read",
  tags: ["plutus", "cardano", "minting-policy", "tokens", "free-mint"],
  author: {
    name: "Aman Kumar",
    avatar: "https://i.pravatar.cc/48?img=7"
  },
  plutusVersion: "V2",
  complexity: "Beginner",
  useCase: "NFTs"
};

export default function FreeMintArticle() {
  const haskellCode = `{-# LANGUAGE DataKinds         #-}
{-# LANGUAGE NoImplicitPrelude #-}
{-# LANGUAGE TemplateHaskell   #-}

module Free where

import           Plutus.V2.Ledger.Api (BuiltinData, CurrencySymbol,
                                       MintingPolicy, ScriptContext,
                                       mkMintingPolicyScript)
import qualified PlutusTx
import           PlutusTx.Prelude     (Bool (True))
import           Prelude              (IO)
import           Utilities            (currencySymbol, wrapPolicy,
                                       writePolicyToFile)

{-# INLINABLE mkFreePolicy #-}
mkFreePolicy :: () -> ScriptContext -> Bool
mkFreePolicy () _ = True

{-# INLINABLE mkWrappedFreePolicy #-}
mkWrappedFreePolicy :: BuiltinData -> BuiltinData -> ()
mkWrappedFreePolicy = wrapPolicy mkFreePolicy

freePolicy :: MintingPolicy
freePolicy =
  mkMintingPolicyScript
    $$(PlutusTx.compile [|| mkWrappedFreePolicy ||])

---------------------------------------------------------------------------------------------------
------------------------------------- HELPER FUNCTIONS --------------------------------------------

saveFreePolicy :: IO ()
saveFreePolicy = writePolicyToFile "assets/free.plutus" freePolicy

freeCurrencySymbol :: CurrencySymbol
freeCurrencySymbol = currencySymbol freePolicy
`;

  const executionCommands = `$ cardano-cli conway transaction build \\
  --tx-in e96e00d3211fe78cae6147d541641458c640482ef68c275300763ec7fab42699#1 \\
  --tx-in-collateral e3086ac18daec3a91af7c48bbb74dc854fd200a4c9fecf7d5837a3aed47edb6f#0 \\
  --mint "1 \${POLICY_ID}.46524545" \\
  --mint-script-file free.plutus \\
  --mint-redeemer-file redeemer.json \\
  --change-address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca \\
  --testnet-magic 2 \\
  --out-file free-mint.tx

Estimated transaction fee: 185450 Lovelace

$ cardano-cli conway transaction sign \\
  --tx-body-file free-mint.tx \\
  --signing-key-file ../../../keys/payment.skey \\
  --testnet-magic 2 \\
  --out-file free-mint.signed

$ cardano-cli conway transaction submit \\
  --tx-file free-mint.signed \\
  --testnet-magic 2
Transaction successfully submitted.

$ cardano-cli query utxo \\
  --address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca \\
  --testnet-magic 2
--------------------------------------------------------------------------------------
0a182c368843e514ff8671b0d0f016fd11cab2ecf80b1685eb31366df6508987#0
9957933407 lovelace + 1 79dc2cb93b706af32fe1ef3b3fb014b98ef83be6b5c1a0c6e9aa8f83.46524545
`;

  return (
    <div className="article-content">
      <h2 id="introduction">Introduction</h2>

      <p>
        <strong>Free Minting Policy</strong> is the simplest possible Plutus
        minting policy. It allows anyone to mint tokens under this policy
        without any restriction.
      </p>

      <p>
        This example is commonly used for learning, testing, and understanding
        how minting policies differ from spending validators.
      </p>

      <CodeBlock
        code={haskellCode}
        language="haskell"
        filename="Free.hs"
      />

      <h2 id="explanation">Explanation</h2>

      <h3>What Is a Minting Policy?</h3>

      <p className="pexplaination">
        A minting policy controls <strong>when new tokens can be created or
        burned</strong>. Unlike spending validators, minting policies are
        executed only when a transaction includes a <code>--mint</code> field.
      </p>

      <h3>Always-Succeeds Logic</h3>

      <CodeBlock
        code={`mkFreePolicy :: () -> ScriptContext -> Bool
mkFreePolicy () _ = True`}
        language="haskell"
        filename="Policy Logic"
      />

      <p className="pexplaination">
        This policy ignores both the redeemer and the transaction context and
        simply returns <strong>True</strong>. That means the ledger will always
        allow minting or burning tokens under this policy.
      </p>

      <h3>wrapPolicy</h3>

      <p className="pexplaination">
        Minting policies are typed functions, but the ledger expects untyped
        <code>BuiltinData</code>. The <strong>wrapPolicy</strong> helper converts
        the typed policy into the untyped form required by Cardano.
      </p>

      <h3>Currency Symbol</h3>

      <p className="pexplaination">
        The <strong>CurrencySymbol</strong> uniquely identifies this minting
        policy. It is derived from the compiled script hash and is used together
        with a token name to identify assets on-chain.
      </p>

      <h2 id="execution">Execution</h2>

      <p className="pexplaination">
        Below is a real testnet execution where a token named
        <strong> FREE</strong> (hex: <code>46524545</code>) is minted using the
        free minting policy.
      </p>

      <CodeBlock
        code={executionCommands}
        language="bash"
        filename="Free Mint Execution (Testnet)"
      />

      <h2 id="mental-model">Mental Model</h2>

      <p className="pexplaination">
        Think of minting policies as <strong>gatekeepers</strong> for token
        creation:
      </p>

      <ul className="list-disc ml-6 pexplaination">
        <li>They do not hold ADA</li>
        <li>They do not lock UTxOs</li>
        <li>They only approve or reject mint/burn actions</li>
      </ul>

      <p className="pexplaination">
        Because this policy always returns <strong>True</strong>, it places no
        restrictions on token supply. Anyone can mint unlimited tokens under
        this policy.
      </p>

      <h2 id="summary">Summary</h2>

      <p>
        The Free Minting Policy demonstrates the minimal structure of a Plutus
        minting policy. While unsafe for production, it is extremely useful for
        learning, testing, and understanding how token minting works on Cardano.
      </p>

      <p className="pexplaination">
        In real-world applications, minting policies usually enforce conditions
        such as signatures, deadlines, NFT uniqueness, or supply caps.
      </p>

            <br />

               <p className="pexplaination">
        You can verify the transaction and UTxO details on{" "}
        <a
          href="https://preview.cardanoscan.io/transaction/0a182c368843e514ff8671b0d0f016fd11cab2ecf80b1685eb31366df6508987?tab=utxo"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800"
        >
          <span className="text-red-800 hover:text-blue-500">Cardanoscan (Preview Testnet)</span>
        </a>.
      </p>
    </div>
  );
}
