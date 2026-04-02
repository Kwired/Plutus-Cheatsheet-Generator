/* eslint-disable react-refresh/only-export-components */
import CodeBlock from "@/components/layouts/CodeBlock";
// import React from "react";

// Article metadata
export const articleMeta = {
  id: "custom-types-validator",
  title: "Custom Types Validator",
  subtitle: "Using a typed redeemer with custom data in Plutus",
  date: "2025-01-01T10:00:00.000Z",
  readTime: "6 min read",
  tags: ["plutus", "cardano", "validator", "typed", "custom-types"],
  author: {
    name: "Aman Kumar",
    avatar: "https://i.pravatar.cc/48?img=7"
  },
  plutusVersion: "V2",
  complexity: "Beginner",
  useCase: "Security"

};

export default function CustomTypesArticle() {
  const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module CustomTypes where

import qualified Plutus.V2.Ledger.Api as PlutusV2
import           PlutusTx             (BuiltinData, compile, unstableMakeIsData)
import           PlutusTx.Prelude     (Bool, Eq ((==)), Integer, traceIfFalse,
                                       ($))
import           Prelude              (IO)
import           Utilities            (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

-- We can create custom data types for our datum and redeemer like this:
newtype MySillyRedeemer = MkMySillyRedeemer Integer
PlutusTx.unstableMakeIsData ''MySillyRedeemer

-- This validator succeeds only if the redeemer is \`MkMySillyRedeemer 42\`
--              Datum     Redeemer            ScriptContext
mkCTValidator :: () -> MySillyRedeemer -> PlutusV2.ScriptContext -> Bool
mkCTValidator _ (MkMySillyRedeemer r) _ =
  traceIfFalse "expected 42" $ r == 42
{-# INLINABLE mkCTValidator #-}

wrappedMkVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedMkVal = wrapValidator mkCTValidator
{-# INLINABLE wrappedMkVal #-}

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrappedMkVal ||])

---------------------------------------------------------------------------------------------------
------------------------------------- HELPER FUNCTIONS --------------------------------------------

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/customtypes.plutus" validator
`;

  const executionCommands = `$ cardano-cli conway address build \\
  --payment-script-file customtypes.plutus \\
  --testnet-magic 2 \\
  --out-file customtypes.addr

$ cardano-cli query utxo \\
  --address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca \\
  --testnet-magic 2
--------------------------------------------------------------------------------------
4671f2e00f5cd8ecec8a916f06fd666cdf78c27224ec113f641932e556ead453#1
9989657602 lovelace

$ cardano-cli conway transaction build \\
  --tx-in 4671f2e00f5cd8ecec8a916f06fd666cdf78c27224ec113f641932e556ead453#1 \\
  --tx-out addr_test1wr2negcqkh2hsyjzdggjrx7798pam8fz3pcuvfatc5j4czq3vg0tq+5000000 \\
  --tx-out-inline-datum-value '{}' \\
  --change-address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca \\
  --testnet-magic 2 \\
  --out-file tx-customtyped-lock.raw

Estimated transaction fee: 170649 Lovelace

$ cardano-cli conway transaction sign \\
  --tx-body-file tx-customtyped-lock.raw \\
  --signing-key-file ../../../keys/payment.skey \\
  --testnet-magic 2 \\
  --out-file tx-customtyped-lock.signed

$ cardano-cli conway transaction submit \\
  --tx-file tx-customtyped-lock.signed
Transaction successfully submitted.

$ cardano-cli query utxo --address $(cat customtypes.addr) --testnet-magic 2
Multiple UTxOs present at the script address

$ cardano-cli conway transaction build \\
  --tx-in 2fd8396dd6a88873bdf815594307bdf60351c70db1658798591753b547f5a134#0 \\
  --tx-in-script-file customtypes.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-file redeemer.json \\
  --tx-in-collateral 348d5983f84b2ba8ecab58eefbfab76107c4f0e439ee6c666f06730a0d3ae6e4#1 \\
  --change-address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca \\
  --testnet-magic 2 \\
  --out-file tx-customtyped-spend.raw

Estimated transaction fee: 297267 Lovelace

$ cardano-cli conway transaction sign \\
  --tx-body-file tx-customtyped-spend.raw \\
  --signing-key-file ../../../keys/payment.skey \\
  --testnet-magic 2 \\
  --out-file tx-customtyped-spend.signed

$ cardano-cli conway transaction submit \\
  --tx-file tx-customtyped-spend.signed
Transaction successfully submitted.
`;

  return (
    <div className="article-content">
      <h2 id="introduction">Introduction</h2>

      <p>
        <strong>Custom Types Validator</strong> demonstrates how to use
        <em>custom, typed redeemers</em> in Plutus instead of raw integers or
        <code>BuiltinData</code>. This approach improves correctness, safety,
        and clarity by encoding business rules directly into Haskell types.
      </p>

      <p>
        In this example, funds locked at the script address can only be spent
        when the redeemer is exactly
        <strong> MkMySillyRedeemer 42</strong>.
      </p>

      <CodeBlock
        code={haskellCode}
        language="haskell"
        filename="CustomTypes.hs"
      />

      <h2 id="h2id">Explanation</h2>

      <h3>Custom Redeemer Type</h3>

      <p className="pexplaination">
        Instead of using a plain integer as the redeemer, this validator defines
        a custom data type:
      </p>

      <CodeBlock
        code={`newtype MySillyRedeemer = MkMySillyRedeemer Integer
PlutusTx.unstableMakeIsData ''MySillyRedeemer`}
        language="haskell"
        filename="Custom Redeemer"
      />

      <p className="pexplaination">
        This ensures that only values constructed as
        <code>MkMySillyRedeemer</code> are considered valid redeemers. The
        <strong>unstableMakeIsData</strong> Template Haskell call generates the
        required serialization logic so this type can be used on-chain.
      </p>

      <h3>Validator Logic</h3>

      <CodeBlock
        code={`mkCTValidator _ (MkMySillyRedeemer r) _ =
  traceIfFalse "expected 42" $ r == 42`}
        language="haskell"
        filename="Validator Logic"
      />

      <p className="pexplaination">
        The validator ignores the datum and script context and focuses entirely
        on the redeemer. If the wrapped integer equals <strong>42</strong>, the
        transaction is approved. Any other value causes validation to fail with
        a readable error message.
      </p>

      <h3>wrapValidator</h3>

      <p className="pexplaination">
        The ledger expects untyped validators that operate on
        <code>BuiltinData</code>. The <strong>wrapValidator</strong> helper
        bridges the gap by decoding typed values before calling the real
        validator. This allows developers to write clean, typed logic while
        remaining compatible with the ledger.
      </p>

      <h2 id="h2id">Execution</h2>

      <p className="pexplaination">
        The execution flow happens in two phases:
        <strong> locking ADA at the script address</strong>, followed by
        <strong> spending it with the correct redeemer</strong>.
      </p>

      <CodeBlock
        code={executionCommands}
        language="bash"
        filename="CustomTypes Execution (Testnet)"
      />

      <p className="pexplaination">
        A key point to understand is that <strong>scripts do not send ADA</strong>.
        They only validate transactions. When you lock funds, your wallet creates
        a UTxO at the script address. When you spend it, the validator runs and
        decides whether the transaction is allowed.
      </p>

      <p className="pexplaination">
        In the spend phase, you selected an existing script UTxO, provided the
        correct redeemer, and supplied collateral from your wallet. Once the
        validator approved the transaction, the funds were released and returned
        according to the transaction outputs.
      </p>

<br />
<h2 id="flow-diagram">How Funds Move (Lock → Validate → Spend)</h2>

<CodeBlock
  language="text"
  filename="UTxO Flow Diagram"
  code={`Step 1: Wallet has ADA (normal UTxO)
--------------------------------
[ Wallet Address ]
        |
        |  (build + submit tx)
        v
--------------------------------

Step 2: ADA locked at Script Address
--------------------------------
[ Script Address ]
  ├─ UTxO #1 : 5 ADA  + inline datum
  ├─ UTxO #2 : 8 ADA  + inline datum
  ├─ UTxO #3 : 3.5 ADA + inline datum
        |
        |  (spend attempt)
        |  redeemer = MkMySillyRedeemer 42
        v
--------------------------------

Step 3: Validator Execution (on-chain)
--------------------------------
Validator logic:
  - Decode redeemer
  - Check r == 42
  - YES → allow transaction
  - NO  → reject transaction
--------------------------------

Step 4: Funds Released
--------------------------------
[ Script UTxO ]
        |
        |  (approved by validator)
        v
[ Wallet Address ]
  - ADA returned as change
  - Script UTxO consumed
--------------------------------`}
 />
<p className="pexplaination">
  This diagram shows why the balance in your wallet sometimes appears unchanged.
  Cardano uses the UTxO model, so spending a script UTxO does not “add” ADA back
  to your wallet. Instead, the old UTxO is consumed and a new one is created as
  change. The validator only decides whether the spend is allowed — it does not
  decide where the ADA goes.
</p>

<br />
      <h2 id="h2id">Summary</h2>

      <p>
        This example shows how typed Plutus validators with custom data types
        provide stronger guarantees than untyped scripts. By encoding rules in
        the type system, you reduce ambiguity, prevent invalid redeemers, and
        make contracts easier to understand and audit.
      </p>

    <p className="pexplaination">
        You can verify the transaction and UTxO details on{" "}
        <a
          href="https://preview.cardanoscan.io/transaction/a8fce103991a63b25e1dae90346c3441d96b570815532a0341a3d50845852a2f?tab=contracts"
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
