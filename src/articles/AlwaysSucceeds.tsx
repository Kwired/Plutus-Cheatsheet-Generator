/* eslint-disable react-refresh/only-export-components */
import CodeBlock from "@/components/layouts/CodeBlock";
// import React from "react";

// Article metadata
export const articleMeta = {
  id: "always-succeeds",
  title: "Always Succeeds",
  subtitle: "A Plutus validator that accepts every transaction",
  date: "2025-01-01T10:00:00.000Z",
  readTime: "5 min read",
  tags: ["plutus", "cardano", "validator", "basics", "always-succeeds"],
  author: {
    name: "Aman Kumar",
    avatar: "https://i.pravatar.cc/48?img=3"
  },
  plutusVersion: "V2",
  complexity: "Beginner",
  useCase: "NFTs"
};

export default function AlwaysSucceedsArticle() {
  const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE TemplateHaskell     #-}

module AlwaysSucceeds where

import qualified Plutus.V2.Ledger.Api as PlutusV2
import           PlutusTx             (BuiltinData, compile)
import           Prelude              (IO)
import           Utilities            (writeValidatorToFile)

-- This validator always succeeds
--                    Datum         Redeemer     ScriptContext
mkGiftValidator :: BuiltinData -> BuiltinData -> BuiltinData -> ()
mkGiftValidator _ _ _ = ()
{-# INLINABLE mkGiftValidator #-}

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| mkGiftValidator ||])


saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/AlwaysSucceeds.plutus" validator
`;

  const executionCommands = `$ cardano-cli conway address build \\
  --payment-script-file AlwaysSucceeds.plutus \\
  --testnet-magic 2 \\
  --out-file AlwaysSucceeds.addr

$ cardano-cli query utxo \\
  --address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca \\
  --testnet-magic 2
--------------------------------------------------------------------------------------
552d1eecf2703e65dfbb9508c6d3de64c64a8eb8185c1b81fb5d3e86404be62e#1
9979316304 lovelace

$ cardano-cli conway transaction build \\
  --tx-in 552d1eecf2703e65dfbb9508c6d3de64c64a8eb8185c1b81fb5d3e86404be62e#1 \\
  --tx-out $(cat AlwaysSucceeds.addr)+5000000 \\
  --tx-out-inline-datum-value '{}' \\
  --change-address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca \\
  --testnet-magic 2 \\
  --out-file tx-AlwaysSucceeds-lock.raw

Estimated transaction fee: 170649 Lovelace

$ cardano-cli conway transaction sign \\
  --tx-body-file tx-AlwaysSucceeds-lock.raw \\
  --signing-key-file ../../../keys/payment.skey \\
  --testnet-magic 2 \\
  --out-file tx-AlwaysSucceeds-lock.signed

$ cardano-cli conway transaction submit \\
  --tx-file tx-AlwaysSucceeds-lock.signed
Transaction successfully submitted.

$ cardano-cli query utxo --address $(cat AlwaysSucceeds.addr) --testnet-magic 2

$ cardano-cli conway transaction build \\
  --tx-in f9798a4d8e8f408790eb1e3e3d4c5519ca01b0d95007b4f85b0330f984001d37#0 \\
  --tx-in-script-file AlwaysSucceeds.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{}' \\
  --tx-in-collateral a8fce103991a63b25e1dae90346c3441d96b570815532a0341a3d50845852a2f#0 \\
  --change-address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca \\
  --testnet-magic 2 \\
  --out-file tx-AlwaysSucceeds-spend.raw

Estimated transaction fee: 175521 Lovelace

$ cardano-cli conway transaction sign \\
  --tx-body-file tx-AlwaysSucceeds-spend.raw \\
  --signing-key-file ../../../keys/payment.skey \\
  --testnet-magic 2 \\
  --out-file tx-AlwaysSucceeds-spend.signed

$ cardano-cli conway transaction submit \\
  --tx-file tx-AlwaysSucceeds-spend.signed
Transaction successfully submitted.
`;

  return (
    <div className="article-content">
      <h2 id="introduction">Introduction</h2>

      <p>
        <strong>AlwaysSucceeds</strong> is the simplest possible Plutus validator.
        It accepts <em>every transaction</em> without checking the datum,
        redeemer, or script context.
      </p>

      <p>
        This script is commonly used for learning, debugging, and understanding
        how Plutus validators interact with transactions and UTxOs on Cardano.
      </p>

      <CodeBlock
        code={haskellCode}
        language="haskell"
        filename="AlwaysSucceeds.hs"
      />
      <br />
      <h2 id="h2id">Explanation</h2>

      <h3>Validator Logic</h3>

      <CodeBlock
        code={`mkGiftValidator _ _ _ = ()`}
        language="haskell"
        filename="Always Succeeds Logic"
      />

      <p className="pexplaination">
        The validator ignores all three inputs: datum, redeemer, and script
        context. Returning <code>()</code> means validation always succeeds.
      </p>

      <p className="pexplaination">
        In Plutus, a validator does not move funds. It only decides whether a
        transaction is valid. Since this validator never fails, any transaction
        spending from this script address is approved.
      </p>

      <h3>Security Implications</h3>

      <p className="pexplaination">
        This script provides <strong>zero security</strong>. Anyone can spend
        funds locked at this address. It should never be used in production but
        is extremely useful for learning and testing.
      </p>

      <br />
      <h2 id="h2id">Execution</h2>

      <p className="pexplaination">
        Execution happens in two phases: locking ADA at the script address and
        then spending it back using the validator.
      </p>

      <CodeBlock
        code={executionCommands}
        language="bash"
        filename="AlwaysSucceeds Execution (Testnet)"
      />

      <p className="pexplaination">
        When you locked ADA, your wallet created a UTxO at the script address.
        When you spent it, the validator ran and immediately approved the
        transaction.
      </p>

      <p className="pexplaination">
        Even though the script always succeeds, collateral is still required by
        the ledger. If the script had failed, the collateral would have been
        taken to pay fees.
      </p>

      <h2 id="mental-model">Mental Model</h2>

      <pre className="bg-gray-900 text-gray-100 p-4 rounded-md text-sm overflow-x-auto">
        {`Wallet UTxO
   │
   ├── lock tx
   ▼
Script Address (AlwaysSucceeds)
   │
   ├── validator runs (always true)
   ▼
Wallet (minus fees)
`}
      </pre>
      <br />
      <h2 id="h2id">Summary</h2>

      <p>
        <strong>AlwaysSucceeds</strong> is the foundation for understanding how
        Plutus works. It shows that scripts do not send or receive ADA — they
        only validate transactions.
      </p>

      <p className="pexplaination">
        Mastering this example makes it much easier to understand real-world
        validators that enforce signatures, redeemers, datums, and complex
        business rules.
      </p>
      <br />
      <p className="pexplaination">
        You can verify the transaction and UTxO details on{" "}
        <a
          href="https://preview.cardanoscan.io/transaction/e3086ac18daec3a91af7c48bbb74dc854fd200a4c9fecf7d5837a3aed47edb6f?tab=contracts"
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
