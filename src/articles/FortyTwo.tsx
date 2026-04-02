/* eslint-disable react-refresh/only-export-components */
import CodeBlock from "@/components/layouts/CodeBlock";
// import React from "react";

// Article metadata
export const articleMeta = {
  id: "forty-two",
  title: "Forty Two",
  subtitle: "Validator succeeds when redeemer is 42",
  date: "2025-01-01T10:00:00.000Z",
  readTime: "3 min read",
  tags: ["plutus", "cardano", "validator", "examples", "42"],
  author: {
    name: "Aman Kumar",
    avatar: "https://i.pravatar.cc/48?img=7"
  },
  plutusVersion: "V2",
  complexity: "Beginner",
  useCase: "Security"

};


// Article component
export default function FortyTwoArticle() {

    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module FortyTwo where

import qualified Plutus.V2.Ledger.Api as PlutusV2
import           PlutusTx             (BuiltinData, compile)
import           PlutusTx.Builtins    as Builtins (mkI)
import           PlutusTx.Prelude     (otherwise, traceError, (==))
import           Prelude              (IO)
import           Utilities            (writeValidatorToFile)

-- This validator succeeds only if the redeemer is 42
--                  Datum         Redeemer     ScriptContext
mk42Validator :: BuiltinData -> BuiltinData -> BuiltinData -> ()
mk42Validator _ r _
    | r == Builtins.mkI 42 = ()
    | otherwise            = traceError "expected 42"
{-# INLINABLE mk42Validator #-}

validator :: PlutusV2.Validator
validator = PlutusV2.mkValidatorScript $$(PlutusTx.compile [|| mk42Validator ||])

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/fortytwo.plutus" validator
`;

    const validatorlogic= `mk42Validator _ r _
    | r == Builtins.mkI 42 = ()
    | otherwise            = traceError "expected 42"`;

    const savevalidator= `saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/fortytwo.plutus" validator`;

    const clicommands = `cardano-cli address build --payment-script-file ./assets/fortytwo.plutus --out-file ./assets/fortytwo.addr --testnet-magic 2
    
cardano-cli conway transaction build \
  --tx-in 32ffe9846f6f54b619e71db43742cd14e709dfcffc6ab54fa2d4000b250d1da0#0 \
  --tx-out addr_test1wpqlfqjt8czqmd6dqxrxvdr8tp8gt4a8xg40d6jzs9wx7fg93pm8a+5000000 \
  --tx-out-datum-hash-value 42 \
  --change-address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca \
  --testnet-magic 2 \
  --out-file ./assets/tx-lock.raw
Estimated transaction fee: 171749 Lovelace

cardano-cli conway transaction sign   --tx-body-file ./assets/tx-lock.raw   --signing-key-file ../../keys/payment.skey   --testnet-magic 2   --out-file tx.signed

cardano-cli conway transaction submit --tx-file tx.signed
Transaction successfully submitted.

cardano-cli query utxo --address $(cat assets/fortytwo.addr) --testnet-magic 2

cardano-cli query utxo --address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca --testnet-magic 2
  `;
  return (
    <div className="article-content">
      <h2 id="introduction">Introduction</h2>
      <p>
        The <strong>FortyTwo</strong> Plutus contract is a minimal validator that demonstrates the core idea of on-chain validation in Cardano. It allows a UTxO to be spent only when the redeemer equals 42, making it a simple, clear example of how Plutus scripts accept or reject transactions.
      </p>
        <CodeBlock 
            code={haskellCode} 
            language="haskell"
            filename="FortyTwo.hs"
        />
      <h2 id="h2id">Explanation</h2>
       <CodeBlock 
            code="{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}
"
            language="haskell"
            filename="Language Pragmas"
        />
      <p className="pexplaination">
       These lines tell the Haskell compiler how this file should be treated. Plutus smart contracts run on-chain, so they need a very controlled execution environment. <strong>NoImplicitPrelude</strong> disables the normal Haskell Prelude and forces the use of Plutus's safe version instead. <strong>TemplateHaskell</strong> is required because the validator is compiled at build time into Plutus Core. The remaining pragmas enable features commonly used in Plutus code and help keep imports and literals clean and predictable.
      </p>

       <CodeBlock 
            code="module FortyTwo where"
            language="haskell"
            filename="Module Declaration"
        />
        <p className="pexplaination">This line defines the name of the module. In Plutus projects, each validator usually lives in its own module so it can be compiled and exported independently. Naming the module <strong>FortyTwo</strong> makes it clear what this file contains and helps tooling locate the validator when generating artifacts.</p>
      
       <CodeBlock 
            code="import qualified Plutus.V2.Ledger.Api as PlutusV2"
            language="haskell"
            filename="Importing Ledger and Plutus Utilities"
        />
        <p className="pexplaination">This import brings in the core ledger types needed to build a validator. It is imported in a qualified way to avoid name clashes and to clearly show when something comes from the ledger API. The <strong>Validator</strong> type and <strong>mkValidatorScript</strong> function come from here.</p>
      

       <CodeBlock 
            code="import           PlutusTx             (BuiltinData, compile)"
            language="haskell"
            filename="Importing PlutusTx Core Types"
        />
        <p className="pexplaination"><strong>BuiltinData</strong> is the raw on-chain data format used by Plutus. This validator works directly with <strong>BuiltinData</strong> to keep things simple. The <strong>compile</strong> function is later used to convert normal Haskell code into Plutus Core so it can run on-chain.</p>
      
       <CodeBlock 
            code="import           PlutusTx.Builtins    as Builtins (mkI)"
            language="haskell"
            filename="Working with On-Chain Integers"
        />
        <p className="pexplaination">On-chain values are not the same as normal Haskell values. You cannot compare a redeemer directly with a plain number like <strong>42</strong>. The <strong>mkI</strong> function creates an on-chain integer that can safely be compared inside the validator.</p>
      
      
       <CodeBlock 
            code="import           PlutusTx.Prelude     (otherwise, traceError, (==))"
            language="haskell"
            filename="Plutus-Safe Prelude Functions"
        />
        <p className="pexplaination">Plutus does not allow the standard Prelude functions inside validators. This import provides safe replacements that work on-chain. <strong>traceError</strong> is used to fail the transaction with a readable message, and <strong>(==)</strong> is used for equality comparison.</p>
      
      
       <CodeBlock 
            code="import           Prelude              (IO)
import           Utilities            (writeValidatorToFile)"
            language="haskell"
            filename="Off-Chain Imports"
        />
        <p className="pexplaination">These imports are used only for off-chain code. <strong>IO</strong> allows writing files, and <strong>writeValidatorToFile</strong> is a helper function that saves the compiled validator as a <strong>.plutus</strong> file. This code never runs on-chain.</p>
      
       <CodeBlock 
            code="mk42Validator :: BuiltinData -> BuiltinData -> BuiltinData -> ()"
            language="haskell"
            filename="Validator Function Signature"
        />
        <p className="pexplaination">This is the validator function. Every Plutus validator receives three inputs: datum, redeemer, and script context. In this example, all three are passed as <strong>BuiltinData</strong>. The function returns <strong>()</strong> if validation succeeds. If it fails, it throws an error instead of returning a value.</p>
      
       <CodeBlock 
            code={validatorlogic}
            language="haskell"
            filename="Validator Logic"
        />
        <p className="pexplaination">Here, the datum and script context are ignored because they are not needed. Only the redeemer is checked. If the redeemer equals the on-chain integer <strong>42</strong>, the validator succeeds. If any other value is provided, the validator fails with an error message. This makes the rule of the contract very clear: only <strong>42</strong> is accepted.</p>
        
        <CodeBlock 
            code="{-# INLINABLE mk42Validator #-}"
            language="haskell"
            filename="Making the Function Compilable"
        />
        <p className="pexplaination">This pragma allows the validator function to be inlined during compilation. Plutus requires this so that Template Haskell can correctly convert the function into Plutus Core. Without this, the validator would fail to compile.</p>
      
        
        <CodeBlock 
            code="validator :: PlutusV2.Validator
validator = PlutusV2.mkValidatorScript $$(PlutusTx.compile [|| mk42Validator ||])"
            language="haskell"
            filename="Creating the Validator Script"
        />
        <p className="pexplaination">This code compiles the <strong>validator</strong> function and turns it into a Validator that the Cardano ledger can execute. <strong>compile</strong> converts the Haskell code into Plutus Core, and <strong>mkValidatorScript</strong> wraps it into a ledger-compatible validator.</p>
      
        
        <CodeBlock 
            code={savevalidator}
            language="haskell"
            filename="Saving the Validator to a File"
        />
        <p className="pexplaination">This is an off-chain helper function. It writes the compiled validator to a <strong>.plutus</strong> file so it can be deployed or tested using tools like <strong>cardano-cli</strong>. This function is never executed on-chain.</p>
      
      <br></br>
        <h2 id="h2id">Summary</h2> 

        <p>
        This validator is intentionally simple, but it demonstrates all the core pieces of a Plutus smart contract: how validators receive data, how validation succeeds or fails, how on-chain values are compared safely, and how Haskell code is compiled into something the Cardano blockchain can run. Understanding this example makes it much easier to move on to real-world validators with typed datums, redeemers, and script context checks.</p>

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
    href="https://preview.cardanoscan.io/transaction/37cf26cdff0eb65eded0a449af73f025dd82dc3ebec84fe95ef799398a42716a"
    target="_blank"
    rel="noopener noreferrer"
    className="text-blue-600 underline hover:text-blue-800"
  >
    <span className="text-red-800 hover:text-blue-500">Cardanoscan (Preview Testnet)</span>
  </a>.
</p>
{/* <p>https://preview.cardanoscan.io/transaction/37cf26cdff0eb65eded0a449af73f025dd82dc3ebec84fe95ef799398a42716a?tab=utxo</p> */}
    </div>
  );
}
