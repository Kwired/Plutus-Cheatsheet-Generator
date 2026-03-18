/* eslint-disable react-refresh/only-export-components */
import CodeBlock from "@/components/layouts/CodeBlock";
// import React from "react";

// Article metadata
export const articleMeta = {
  id: "forty-two-typed",
  title: "Forty Two (Typed)",
  subtitle: "Typed Plutus validator that succeeds when redeemer is 42",
  date: "2025-01-01T10:00:00.000Z",
  readTime: "4 min read",
  tags: ["plutus", "cardano", "validator", "typed", "examples", "42"],
  author: {
    name: "Aman Kumar",
    avatar: "https://i.pravatar.cc/48?img=7"
  },
  plutusVersion: "V2",
  complexity: "Beginner",
  useCase: "Security"

};

export default function FortyTwoTypedArticle() {
  const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module FortyTwoTyped where

import qualified Plutus.V2.Ledger.Api as PlutusV2
import           PlutusTx             (compile)
import           PlutusTx.Prelude     (Bool, Eq ((==)), Integer, traceIfFalse,
                                       ($))
import           Prelude              (IO)
import           Utilities            (wrapValidator, writeValidatorToFile)

-- This validator succeeds only if the redeemer is 42
--              Datum  Redeemer        ScriptContext
mk42Validator :: () -> Integer -> PlutusV2.ScriptContext -> Bool
mk42Validator _ r _ = traceIfFalse "expected 42" $ r == 42
{-# INLINABLE mk42Validator #-}

validator :: PlutusV2.Validator
validator = PlutusV2.mkValidatorScript $$(PlutusTx.compile [|| wrapValidator mk42Validator ||])


saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/fortytwotyped.plutus" validator
`;

  const validatorLogic = `mk42Validator :: () -> Integer -> ScriptContext -> Bool
mk42Validator _ r _ =
  traceIfFalse "expected 42" $ r == 42`;

  const saveValidator = `saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/fortytwotyped.plutus" validator`;

  const clicommands = `$ cardano-cli conway address build --payment-script-file fortytwotyped.plutus --testnet-magic 2 --out-file fortytwotyped.addr

$ cardano-cli query utxo --address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca --testnet-magic 2
                           TxHash                                 TxIx        Amount
--------------------------------------------------------------------------------------
37cf26cdff0eb65eded0a449af73f025dd82dc3ebec84fe95ef799398a42716a     1        9994828251 lovelace + TxOutDatumNone

$ cardano-cli conway transaction build \
  --tx-in 37cf26cdff0eb65eded0a449af73f025dd82dc3ebec84fe95ef799398a42716a#1 \
  --tx-out addr_test1wzqvkn6myu8ay080wdsju4s4mzuzgwwv9rxsz2xuc8ycaus9zk46q+5000000 \
  --tx-out-inline-datum-value '{}' \
  --change-address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca \
  --testnet-magic 2 \
  --out-file tx-lock.raw
Estimated transaction fee: 170649 Lovelace
$ 
$ cardano-cli conway transaction sign \
  --tx-body-file tx-lock.raw \
  --signing-key-file ../../keys/payment.skey \
  --testnet-magic 2 \
  --out-file tx-lock.signed
$ 
$ cardano-cli conway transaction submit \
  --tx-file tx-lock.signed
Transaction successfully submitted.
$ 
$ cardano-cli query utxo --address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca --testnet-magic 2
                           TxHash                                 TxIx        Amount
--------------------------------------------------------------------------------------
4671f2e00f5cd8ecec8a916f06fd666cdf78c27224ec113f641932e556ead453     1        9989657602 lovelace + TxOutDatumNone
`;
  return (
    <div className="article-content">
      <h2 id="introduction">Introduction</h2>
      <p>
        <strong>FortyTwo (Typed)</strong> is a typed version of the Forty Two
        Plutus validator. Unlike the untyped variant, this contract uses real
        Haskell types for the datum and redeemer, making the code safer, more
        readable, and easier to reason about.
      </p>

      <p>
        The validator allows a UTxO to be spent only when the redeemer value is
        exactly <strong>42</strong>.
      </p>

      <CodeBlock
        code={haskellCode}
        language="haskell"
        filename="FortyTwoTyped.hs"
      />

      <h2 id="h2id">Explanation</h2>

      <CodeBlock
        code={`{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}`}
        language="haskell"
        filename="Language Pragmas"
      />

      <p className="pexplaination">
        These language pragmas configure the file for Plutus on-chain execution.
        <strong> NoImplicitPrelude</strong> ensures that only Plutus-safe
        functions are used. <strong>TemplateHaskell</strong> is required to
        compile the validator into Plutus Core. The remaining pragmas enable
        features commonly used in Plutus development and help keep the code
        clean.
      </p>

      <CodeBlock
        code="module FortyTwoTyped where"
        language="haskell"
        filename="Module Declaration"
      />

      <p className="pexplaination">
        This line defines the module name. Separating validators into individual
        modules is standard practice in Plutus projects. The name
        <strong> FortyTwoTyped</strong> makes it clear that this is the typed
        version of the validator.
      </p>

      <CodeBlock
        code="import qualified Plutus.V2.Ledger.Api as PlutusV2"
        language="haskell"
        filename="Ledger API Import"
      />

      <p className="pexplaination">
        This import provides ledger-level types such as
        <strong> Validator</strong> and <strong>ScriptContext</strong>. It is
        imported in a qualified way to avoid name clashes and improve clarity.
      </p>

      <CodeBlock
        code="import           PlutusTx             (compile)"
        language="haskell"
        filename="PlutusTx Compilation"
      />

      <p className="pexplaination">
        The <strong>compile</strong> function converts typed Haskell code into
        Plutus Core. This step is required before the validator can be executed
        on the Cardano blockchain.
      </p>

      <CodeBlock
        code="import           PlutusTx.Prelude     (Bool, Eq ((==)), Integer, traceIfFalse, ($))"
        language="haskell"
        filename="Typed Plutus Prelude"
      />

      <p className="pexplaination">
        This import brings in Plutus-safe versions of common types and functions.
        <strong> Integer</strong> and <strong>Bool</strong> are used directly in
        the validator, and <strong>traceIfFalse</strong> is used to reject the
        transaction with a readable error message.
      </p>

      <CodeBlock
        code="import           Prelude              (IO)
import           Utilities            (wrapValidator, writeValidatorToFile)"
        language="haskell"
        filename="Off-Chain Utilities"
      />

      <p className="pexplaination">
        These imports are only used off-chain. The
        <strong> wrapValidator</strong> function converts a typed validator into
        the untyped form expected by the ledger. The
        <strong> writeValidatorToFile</strong> helper writes the compiled
        validator to a <strong>.plutus</strong> file.
      </p>

      <CodeBlock
        code="mk42Validator :: () -> Integer -> ScriptContext -> Bool"
        language="haskell"
        filename="Typed Validator Signature"
      />

      <p className="pexplaination">
        This function signature clearly defines the contract inputs. The datum
        type is <strong>()</strong>, meaning no data is stored. The redeemer is an
        <strong> Integer</strong>, and the validator succeeds only when its value
        is 42. The function returns a <strong>Bool</strong> instead of unit.
      </p>

      <CodeBlock
        code={validatorLogic}
        language="haskell"
        filename="Typed Validator Logic"
      />

      <p className="pexplaination">
        The datum and script context are ignored in this example. The validator
        checks only the redeemer. If the redeemer equals 42, validation succeeds.
        Otherwise, <strong>traceIfFalse</strong> causes the transaction to fail
        with the error message <strong>expected 42</strong>.
      </p>

      <CodeBlock
        code="{-# INLINABLE mk42Validator #-}"
        language="haskell"
        filename="INLINABLE Pragma"
      />

      <p className="pexplaination">
        This pragma allows the validator to be inlined during compilation.
        Plutus requires this so that Template Haskell can correctly lift the
        function into Plutus Core.
      </p>

      <CodeBlock
        code={`validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrapValidator mk42Validator ||])`}
        language="haskell"
        filename="Creating the Validator"
      />

      <p className="pexplaination">
        This code converts the typed validator into a ledger-compatible
        validator. <strong>wrapValidator</strong> bridges the gap between typed
        Haskell code and the untyped format required by the Cardano ledger.
      </p>

      <CodeBlock
        code={saveValidator}
        language="haskell"
        filename="Saving the Validator"
      />

      <p className="pexplaination">
        This helper function writes the compiled validator to a file. The
        generated <strong>.plutus</strong> file is later used with
        <strong> cardano-cli</strong> to build script addresses and execute
        transactions.
      </p>

      <h2 id="summary">Summary</h2>

      <p>
        The typed Forty Two validator shows how Plutus contracts can be written
        using real Haskell types instead of raw <code>BuiltinData</code>. This
        approach improves safety, readability, and maintainability while still
        compiling down to a standard on-chain validator.
      </p>

      <br></br>
              <h2 id="h2id">Execution</h2> 
              <CodeBlock 
                  code={clicommands}
                  language="bash"
                  filename="Execute it on testnet"
              />
      
      <p className="pexplaination">
        You can verify the transaction and UTxO details on{" "}
        <a
          href="https://preview.cardanoscan.io/transaction/4671f2e00f5cd8ecec8a916f06fd666cdf78c27224ec113f641932e556ead453?tab=utxo"
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
