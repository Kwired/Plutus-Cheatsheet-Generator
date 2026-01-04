import CodeBlock from "@/components/layouts/CodeBlock";
// import React from "react";

// Article metadata
export const articleMeta = {
  id: "signed-mint-policy",
  title: "Signed Minting Policy",
  subtitle: "Minting tokens only with an authorized signature",
  date: "2025-01-07T10:00:00.000Z",
  readTime: "6 min read",
  tags: ["plutus", "cardano", "minting-policy", "signature", "security"],
  author: {
    name: "Aman Kumar",
    avatar: "https://i.pravatar.cc/48?img=6"
  }
};

export default function SignedMintArticle() {
  const haskellCode = `{-# LANGUAGE DataKinds         #-}
{-# LANGUAGE NoImplicitPrelude #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE TemplateHaskell   #-}

module Signed where

import           Plutus.V2.Ledger.Api      (BuiltinData, CurrencySymbol,
                                            MintingPolicy, PubKeyHash,
                                            ScriptContext (scriptContextTxInfo),
                                            mkMintingPolicyScript)
import           Plutus.V2.Ledger.Contexts (txSignedBy)
import qualified PlutusTx
import           PlutusTx.Prelude          (Bool, traceIfFalse, ($), (.))
import           Prelude                   (IO, Show (show))
import           Text.Printf               (printf)
import           Utilities                 (currencySymbol, wrapPolicy,
                                            writeCodeToFile, writePolicyToFile)

{-# INLINABLE mkSignedPolicy #-}
mkSignedPolicy :: PubKeyHash -> () -> ScriptContext -> Bool
mkSignedPolicy pkh () ctx =
  traceIfFalse "missing signature"
    $ txSignedBy (scriptContextTxInfo ctx) pkh

{-# INLINABLE mkWrappedSignedPolicy #-}
mkWrappedSignedPolicy :: BuiltinData -> BuiltinData -> BuiltinData -> ()
mkWrappedSignedPolicy pkh =
  wrapPolicy (mkSignedPolicy $ PlutusTx.unsafeFromBuiltinData pkh)

signedCode ::
  PlutusTx.CompiledCode (BuiltinData -> BuiltinData -> BuiltinData -> ())
signedCode =
  $$(PlutusTx.compile [|| mkWrappedSignedPolicy ||])

signedPolicy :: PubKeyHash -> MintingPolicy
signedPolicy pkh =
  mkMintingPolicyScript
    $ signedCode
        \`PlutusTx.applyCode\`
        PlutusTx.liftCode (PlutusTx.toBuiltinData pkh)

---------------------------------------------------------------------------------------------------
------------------------------------- HELPER FUNCTIONS --------------------------------------------

saveSignedCode :: IO ()
saveSignedCode = writeCodeToFile "assets/signed.plutus" signedCode

saveSignedPolicy :: PubKeyHash -> IO ()
saveSignedPolicy pkh =
  writePolicyToFile
    (printf "assets/signed-%s.plutus" $ show pkh)
    (signedPolicy pkh)

signedCurrencySymbol :: PubKeyHash -> CurrencySymbol
signedCurrencySymbol = currencySymbol . signedPolicy
`;

  const executionCommands = `$ cardano-cli address key-hash \\
  --payment-verification-key-file ../../../keys/payment.vkey
4d7b048eabaf7759a927ddd8effb44765322744ccf8df72f55593768

$ cardano-cli conway address build \\
  --payment-script-file signed.plutus \\
  --testnet-magic 2 \\
  --out-file signed.addr

$ cardano-cli conway transaction build \\
  --tx-in e3086ac18daec3a91af7c48bbb74dc854fd200a4c9fecf7d5837a3aed47edb6f#0 \\
  --tx-out "\$(cat signed.addr)+2000000" \\
  --tx-out-inline-datum-file datum.json \\
  --change-address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca \\
  --testnet-magic 2 \\
  --out-file signed-lock.tx

Estimated transaction fee: 171969 Lovelace

$ cardano-cli conway transaction sign \\
  --tx-body-file signed-lock.tx \\
  --signing-key-file ../../../keys/payment.skey \\
  --testnet-magic 2 \\
  --out-file signed-lock.signed

$ cardano-cli conway transaction submit \\
  --tx-file signed-lock.signed
Transaction successfully submitted.

$ cardano-cli conway transaction build \\
  --tx-in f5b4345ea271c03fe241f1914eacbd76e39f1f110eec8072c3d482dadf22d768#0 \\
  --tx-in-script-file signed.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-file redeemer.json \\
  --required-signer ../../../keys/payment.skey \\
  --tx-in-collateral f5b4345ea271c03fe241f1914eacbd76e39f1f110eec8072c3d482dadf22d768#1 \\
  --change-address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca \\
  --testnet-magic 2 \\
  --out-file signed-pass.tx

Estimated transaction fee: 308045 Lovelace

$ cardano-cli conway transaction submit \\
  --tx-file signed-pass.signed
Transaction successfully submitted.
`;

  return (
    <div className="article-content">
      <h2 id="introduction">Introduction</h2>

      <p>
        <strong>Signed Minting Policy</strong> restricts token minting so that
        only a specific wallet (identified by a
        <strong> PubKeyHash</strong>) can authorize minting or burning.
      </p>

      <p>
        This pattern is one of the most common and important minting policies
        used in real Cardano applications.
      </p>

      <CodeBlock
        code={haskellCode}
        language="haskell"
        filename="Signed.hs"
      />

      <h2 id="explanation">Explanation</h2>

      <h3>Signature-Based Control</h3>

      <CodeBlock
        code={`mkSignedPolicy pkh () ctx =
  traceIfFalse "missing signature"
    $ txSignedBy (scriptContextTxInfo ctx) pkh`}
        language="haskell"
        filename="Policy Logic"
      />

      <p className="pexplaination">
        The policy checks whether the transaction is signed by the expected
        <strong> PubKeyHash</strong>. If the required signature is missing, the
        policy fails and minting is rejected.
      </p>

      <h3>Why PubKeyHash Is a Parameter</h3>

      <p className="pexplaination">
        This policy is <strong>parameterized</strong>. The authorized signer is
        baked into the policy at compile time, producing a unique
        <strong> CurrencySymbol</strong> per signer.
      </p>

      <h3>wrapPolicy & unsafeFromBuiltinData</h3>

      <p className="pexplaination">
        Because minting policies receive raw <code>BuiltinData</code>, the
        signer’s public key hash must be decoded manually using
        <strong> unsafeFromBuiltinData</strong>. The
        <strong> wrapPolicy</strong> helper connects typed logic to the ledger.
      </p>

      <h2 id="execution">Execution</h2>

      <p className="pexplaination">
        Below is a real testnet execution showing funds locked at the script
        address and later released only when the transaction includes the
        correct wallet signature.
      </p>

      <CodeBlock
        code={executionCommands}
        language="bash"
        filename="Signed Mint Execution (Testnet)"
      />

      <h2 id="mental-model">Mental Model</h2>

      <ul className="list-disc ml-6 pexplaination">
        <li>The minting policy does not hold ADA</li>
        <li>It only validates mint/burn actions</li>
        <li>The policy runs only if <code>--mint</code> is present</li>
        <li>Missing signature ⇒ minting fails</li>
      </ul>

      <p className="pexplaination">
        This is the minting equivalent of a
        <strong> “only owner can mint”</strong> rule.
      </p>

      <h2 id="summary">Summary</h2>

      <p>
        The Signed Minting Policy introduces real authorization into token
        creation. By requiring a specific wallet signature, it prevents
        unauthorized minting while remaining simple and efficient.
      </p>

      <p className="pexplaination">
        This pattern is widely used for NFTs, capped supplies, DAO governance
        tokens, and admin-controlled assets.
      </p>


        <br />

            <p className="pexplaination">
        You can verify the transaction and UTxO details on{" "}
        <a
          href="https://preview.cardanoscan.io/transaction/9b9444cb999a51bfee1a8969ce3858d1b5d2f5793d839f27022b61677d86cc59?tab=utxo"
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
