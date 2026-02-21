/* eslint-disable react-refresh/only-export-components */
import CodeBlock from "@/components/layouts/CodeBlock";
// import React from "react";

// Article metadata
export const articleMeta = {
  id: "always-fails",
  title: "Always Fails (Burn Validator)",
  subtitle: "A Plutus validator that permanently locks funds by always failing",
  date: "2025-01-01T10:00:00.000Z",
  readTime: "5 min read",
  tags: ["plutus", "cardano", "validator", "burn", "always-fails"],
  author: {
    name: "Aman Kumar",
    avatar: "https://i.pravatar.cc/48?img=7"
  },
  plutusVersion: "V2",
  complexity: "Beginner",
  useCase: "NFTs"
};

export default function AlwaysFailsArticle() {
  const haskellCode = `{-# LANGUAGE DataKinds         #-}
{-# LANGUAGE NoImplicitPrelude #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE TemplateHaskell   #-}

module AlwaysFails where

import qualified Plutus.V2.Ledger.Api as PlutusV2
import           PlutusTx             (BuiltinData, compile)
import           PlutusTx.Prelude     (traceError)
import           Prelude              (IO)
import           Utilities            (writeValidatorToFile)



-- This validator always fails
--                    Datum         Redeemer     ScriptContext
mkBurnValidator :: BuiltinData -> BuiltinData -> BuiltinData -> ()
mkBurnValidator _ _ _ = traceError "it burns!!!"
{-# INLINABLE mkBurnValidator #-}

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| mkBurnValidator ||])


saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/AlwaysFails.plutus" validator
`;

  const executionCommands = `$ cardano-cli conway address build \\
  --payment-script-file AlwaysFails.plutus \\
  --testnet-magic 2 \\
  --out-file AlwaysFails.addr

$ cardano-cli conway transaction build \\
  --tx-in f9798a4d8e8f408790eb1e3e3d4c5519ca01b0d95007b4f85b0330f984001d37#1 \\
  --tx-out $(cat AlwaysFails.addr)+5000000 \\
  --tx-out-inline-datum-value '{}' \\
  --change-address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca \\
  --testnet-magic 2 \\
  --out-file tx-AlwaysFails-lock.raw

Estimated transaction fee: 170649 Lovelace

$ cardano-cli conway transaction sign \\
  --tx-body-file tx-AlwaysFails-lock.raw \\
  --signing-key-file ../../../keys/payment.skey \\
  --testnet-magic 2 \\
  --out-file tx-AlwaysFails-lock.signed

$ cardano-cli conway transaction submit \\
  --tx-file tx-AlwaysFails-lock.signed
Transaction successfully submitted.

$ cardano-cli conway transaction build \\
  --tx-in c0fabd2847d0d69b8265ca0b5e8f6118afbec8bd12554019d919da2b64fdf98a#0 \\
  --tx-in-script-file AlwaysFails.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{}' \\
  --tx-in-collateral c0fabd2847d0d69b8265ca0b5e8f6118afbec8bd12554019d919da2b64fdf98a#1 \\
  --change-address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca \\
  --testnet-magic 2 \\
  --out-file tx-AlwaysFails-spend.raw

Script debugging logs:
it burns!!!
`;

  return (
    <div className="article-content">
      <h2 id="introduction">Introduction</h2>

      <p>
        <strong>Always Fails</strong> is a Plutus validator designed to
        <strong> permanently lock funds</strong>. Unlike typical contracts that
        validate conditions, this script explicitly rejects every spend attempt
        using <code>traceError</code>.
      </p>

      <p>
        This pattern is commonly known as a
        <strong> burn validator</strong> or
        <strong> blackhole contract</strong>.
      </p>

      <CodeBlock
        code={haskellCode}
        language="haskell"
        filename="AlwaysFails.hs"
      />

      <h2 id="explanation">Explanation</h2>

      <h3>Always-Failing Logic</h3>

      <CodeBlock
        code={`mkBurnValidator _ _ _ = traceError "it burns!!!"`}
        language="haskell"
        filename="Validator Logic"
      />

      <p className="pexplaination">
        The validator immediately terminates execution using
        <code>traceError</code>. This means:
      </p>

      <ul className="list-disc ml-6">
        <li>The script never returns successfully</li>
        <li>No redeemer or datum can satisfy it</li>
        <li>Every spend attempt always fails</li>
      </ul>

      <h3>Important Rule</h3>

      <p className="pexplaination">
        Validators are <strong>not executed when locking funds</strong>. They
        only run when someone tries to <strong>spend</strong> a script UTxO.
      </p>

      <h2 id="execution">Execution</h2>

      <p className="pexplaination">
        The execution consists of two phases:
      </p>

      <ol className="list-decimal ml-6">
        <li>Locking ADA at the script address (always succeeds)</li>
        <li>Attempting to spend it (always fails)</li>
      </ol>

      <CodeBlock
        code={executionCommands}
        language="bash"
        filename="AlwaysFails Execution (Testnet)"
      />

      <p className="pexplaination">
        During the spend attempt, Plutus evaluates the validator and encounters
        the explicit error:
      </p>

      <CodeBlock
        code={`Script debugging logs:
it burns!!!`}
        language="text"
        filename="Plutus Failure Log"
      />

      <h3>Collateral Behavior</h3>

      <p className="pexplaination">
        Because the script fails during execution:
      </p>

      <ul className="list-disc ml-6">
        <li>The locked ADA remains at the script address forever</li>
        <li>The collateral UTxO is consumed</li>
        <li>Transaction fees are paid</li>
      </ul>

      <h2 id="summary">Summary</h2>

      <p>
        The <strong>Always Fails</strong> validator demonstrates how Plutus can
        be used to create irreversible contracts. This pattern is useful for
        token burning, supply reduction, governance sinks, and educational
        demonstrations of script failure and collateral mechanics.
      </p>

      <p className="pexplaination">
        Once funds are locked in this contract, they are
        <strong> mathematically unspendable</strong>.
      </p>

      <br />

               <p className="pexplaination">
        You can verify the transaction and UTxO details on{" "}
        <a
          href="https://preview.cardanoscan.io/transaction/c0fabd2847d0d69b8265ca0b5e8f6118afbec8bd12554019d919da2b64fdf98a?tab=utxo"
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
