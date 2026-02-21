/* eslint-disable react-refresh/only-export-components */
import CodeBlock from "@/components/layouts/CodeBlock";
// import React from "react";

/* -------------------------------------------------------------------------- */
/*                                Article Meta                                 */
/* -------------------------------------------------------------------------- */

export const articleMeta = {
  id: "signed-mint-failure-full",
  title: "Signed Minting Policy — Complete Failure",
  subtitle: "Tracing the full command flow and understanding the missing signature error",
  date: "2025-01-12T10:00:00.000Z",
  readTime: "8 min read",
  tags: ["plutus", "cardano", "minting-policy", "signature", "failure", "debugging"],
  author: {
    name: "Aman Kumar",
    avatar: "https://i.pravatar.cc/48?img=12"},
  plutusVersion: "V2",
  complexity: "Advanced",
  useCase: "NFTs"
};

/* -------------------------------------------------------------------------- */
/*                               Article Body                                  */
/* -------------------------------------------------------------------------- */

export default function SignedMintFailArticle() {
  const plutusCode = `{-# LANGUAGE DataKinds         #-}
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
mkSignedPolicy pkh () ctx = traceIfFalse "missing signature" $ txSignedBy (scriptContextTxInfo ctx) pkh

{-# INLINABLE mkWrappedSignedPolicy #-}
mkWrappedSignedPolicy :: BuiltinData -> BuiltinData -> BuiltinData -> ()
mkWrappedSignedPolicy pkh = wrapPolicy (mkSignedPolicy $ PlutusTx.unsafeFromBuiltinData pkh)

signedCode :: PlutusTx.CompiledCode (BuiltinData -> BuiltinData -> BuiltinData -> ())
signedCode = $$(PlutusTx.compile [|| mkWrappedSignedPolicy ||])

signedPolicy :: PubKeyHash -> MintingPolicy
signedPolicy pkh = mkMintingPolicyScript $ signedCode \`PlutusTx.applyCode\` PlutusTx.liftCode (PlutusTx.toBuiltinData pkh)



saveSignedCode :: IO ()
saveSignedCode = writeCodeToFile "assets/signed.plutus" signedCode

saveSignedPolicy :: PubKeyHash -> IO ()
saveSignedPolicy pkh = writePolicyToFile (printf "assets/signed-%s.plutus" $ show pkh) $ signedPolicy pkh

signedCurrencySymbol :: PubKeyHash -> CurrencySymbol
signedCurrencySymbol = currencySymbol . signedPolicy
`;

  const fullCommands = `# 1 Wallet UTxOs before starting
cardano-cli query utxo \\
  --address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca \\
  --testnet-magic 2

# 2 Lock ADA at the signed script address (NO signature required here)
cardano-cli conway transaction build \\
  --tx-in fa4ef830713f7004dafda47c64fde7d1ef371ee7e0d50bba8e9e6618f5b6d9b0#1 \\
  --tx-out "$(cat signed.addr)+2000000" \\
  --tx-out-inline-datum-file datum.json \\
  --change-address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca \\
  --testnet-magic 2 \\
  --out-file signed-lock-fail.tx

cardano-cli conway transaction sign \\
  --tx-body-file signed-lock-fail.tx \\
  --signing-key-file ../../../keys/payment.skey \\
  --testnet-magic 2 \\
  --out-file signed-lock-fail.signed

cardano-cli conway transaction submit \\
  --tx-file signed-lock-fail.signed \\
  --testnet-magic 2

# 3 Script UTxO now exists
cardano-cli query utxo \\
  --address $(cat signed.addr) \\
  --testnet-magic 2

# 4. Attempt to spend WITHOUT required signer
cardano-cli conway transaction build \\
  --tx-in 9bdebbbce37a76902cbb95073fb41f023fca72401650da7fd1b599f58a8b1f5c#0 \\
  --tx-in-script-file signed.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-file redeemer.json \\
  --tx-in-collateral f5b4345ea271c03fe241f1914eacbd76e39f1f110eec8072c3d482dadf22d768#1 \\
  --change-address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca \\
  --testnet-magic 2 \\
  --out-file signed-fail.tx
Command failed: transaction build  Error: The following scripts have execution failures:
the script for transaction input 0 (in ascending order of the TxIds) failed with: 
The Plutus script evaluation failed: An error has occurred:
The machine terminated because of an error, either from a built-in function or from an explicit use of 'error'.
Script debugging logs: missing signature
PT5
ERROR:
Script debugging logs: missing signature
PT5
`;

  return (
    <div className="article-content">
      <h2>Introduction</h2>

      <p>
        This article walks through a <strong>complete failure scenario</strong>{" "}
        for a <strong>Signed Minting Policy</strong>. Instead of jumping straight
        to the error, we trace the <em>entire command flow</em> so it’s clear
        <strong> where things work </strong> and <strong> where they break</strong>.
      </p>

      <h2>Signed Minting Policy Logic</h2>

      <CodeBlock
        code={plutusCode}
        language="haskell"
        filename="Signed.hs"
      />

      <p className="pexplaination">
        This policy enforces a single rule: the transaction must be signed by a
        specific <code>PubKeyHash</code>. If that signature is missing, the policy
        fails immediately.
      </p>

      <h2>Full Command Execution Flow</h2>

      <p className="pexplaination">
        Below is the <strong>exact command sequence</strong> that leads to the
        failure. This includes wallet queries, script locking, and the final
        failing spend attempt.
      </p>

      <CodeBlock
        code={fullCommands}
        language="bash"
        filename="Signed Mint — Full Failure Trace"
      />

      <h2>Why the Transaction Failed</h2>

      <ul className="list-disc pl-6 space-y-2">
        <li>The script was successfully locked with inline datum</li>
        <li>Locking does <strong>not</strong> execute the minting policy</li>
        <li>Spending the script triggers the policy validation</li>
        <li>
          The transaction did <strong>not</strong> include
          <code> --required-signer</code>
        </li>
        <li>
          <code>txSignedBy</code> returned <code>false</code>
        </li>
        <li>
          <code>traceError "missing signature"</code> halted execution
        </li>
      </ul>

      <h2>Key Concept (Very Important)</h2>

      <p className="pexplaination">
        <strong>Signing the transaction file is NOT the same as being a required signer.</strong>
      </p>

      <p className="pexplaination">
        The minting policy checks the transaction body for declared required
        signers. If the signer is not explicitly included, the policy fails —
        even if the transaction is technically signed.
      </p>

      <h2>How to Make This Pass</h2>

      <CodeBlock
        code={`--required-signer ../../../keys/payment.skey`}
        language="bash"
        filename="Required Fix"
      />

      <p className="pexplaination">
        This flag injects the public key hash into the transaction’s signatories,
        allowing <code>txSignedBy</code> to succeed.
      </p>

      <h2>Summary</h2>

      <p>
        This failure confirms that the Signed Minting Policy is behaving exactly
        as designed. Unauthorized minting attempts are stopped at validation
        time, protecting the token supply with cryptographic certainty.
      </p>
         <br />

            <p className="pexplaination">
        You can verify the transaction and UTxO details on{" "}
        <a
          href="https://preview.cardanoscan.io/transaction/9bdebbbce37a76902cbb95073fb41f023fca72401650da7fd1b599f58a8b1f5c?tab=utxo"
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
