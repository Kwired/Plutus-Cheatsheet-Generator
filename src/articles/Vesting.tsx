/* eslint-disable react-refresh/only-export-components */
import CodeBlock from "@/components/layouts/CodeBlock";
// import React from "react";

/* ------------------------------------------------------------------
   Article metadata
------------------------------------------------------------------- */
export const articleMeta = {
  id: "vesting-validator",
  title: "Vesting Validator",
  subtitle: "Time-locked and signature-restricted funds on Cardano",
  date: "2025-01-03T10:00:00.000Z",
  readTime: "8 min read",
  tags: ["plutus", "cardano", "vesting", "time-lock", "validator"],
  author: {
    name: "Aman Kumar",
    avatar: "https://i.pravatar.cc/48?img=7"
  },
  plutusVersion: "V2",
  complexity: "Beginner",
  useCase: "NFTs"
};

/* ------------------------------------------------------------------
   Article component
------------------------------------------------------------------- */
export default function VestingArticle() {
  const haskellCode = `{-# LANGUAGE DataKinds         #-}
{-# LANGUAGE NoImplicitPrelude #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE TemplateHaskell   #-}

module Vesting where

import           Data.Maybe                (fromJust)
import           Plutus.V1.Ledger.Interval (contains)
import           Plutus.V2.Ledger.Api      (BuiltinData, POSIXTime, PubKeyHash,
                                            ScriptContext (scriptContextTxInfo),
                                            TxInfo (txInfoValidRange),
                                            Validator, from, mkValidatorScript)
import           Plutus.V2.Ledger.Contexts (txSignedBy)
import           PlutusTx                  (compile, unstableMakeIsData)
import           PlutusTx.Prelude          (Bool, traceIfFalse, ($), (&&))
import           Prelude                   (IO, String)
import           Utilities                 (Network, posixTimeFromIso8601,
                                            printDataToJSON,
                                            validatorAddressBech32,
                                            wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

data VestingDatum = VestingDatum
    { beneficiary :: PubKeyHash
    , deadline    :: POSIXTime
    }

unstableMakeIsData ''VestingDatum

{-# INLINABLE mkVestingValidator #-}
mkVestingValidator :: VestingDatum -> () -> ScriptContext -> Bool
mkVestingValidator dat () ctx =
     traceIfFalse "beneficiary's signature missing" signedByBeneficiary
  && traceIfFalse "deadline not reached" deadlineReached
  where
    info :: TxInfo
    info = scriptContextTxInfo ctx

    signedByBeneficiary :: Bool
    signedByBeneficiary =
      txSignedBy info $ beneficiary dat

    deadlineReached :: Bool
    deadlineReached =
      contains (from $ deadline dat) $
        txInfoValidRange info

{-# INLINABLE mkWrappedVestingValidator #-}
mkWrappedVestingValidator :: BuiltinData -> BuiltinData -> BuiltinData -> ()
mkWrappedVestingValidator = wrapValidator mkVestingValidator

validator :: Validator
validator =
  mkValidatorScript
    $$(compile [|| mkWrappedVestingValidator ||])

---------------------------------------------------------------------------------------------------
------------------------------------- HELPER FUNCTIONS --------------------------------------------

saveVal :: IO ()
saveVal =
  writeValidatorToFile "./assets/vesting.plutus" validator

vestingAddressBech32 :: Network -> String
vestingAddressBech32 network =
  validatorAddressBech32 network validator

printVestingDatumJSON :: PubKeyHash -> String -> IO ()
printVestingDatumJSON pkh time =
  printDataToJSON $
    VestingDatum
      { beneficiary = pkh
      , deadline    = fromJust $
                        posixTimeFromIso8601 time
      }
`;

  return (
    <div className="article-content">
      {/* ------------------------------------------------------------ */}
      <h2 id="introduction">Introduction</h2>

      <p>
        <strong>Vesting Validator</strong> demonstrates one of the most important
        real-world smart contract patterns on Cardano:{" "}
        <strong>time-locked funds</strong>.
      </p>

      <p>
        This contract allows ADA to be locked at a script address and only
        released when <strong>two conditions</strong> are met:
      </p>

      <ul className="list-disc ml-6">
        <li>The beneficiary signs the transaction</li>
        <li>The specified deadline has passed</li>
      </ul>

      <p>
        Until both rules are satisfied, the funds remain locked and cannot be
        spent.
      </p>

      <CodeBlock
        code={haskellCode}
        language="haskell"
        filename="Vesting.hs"
      />

      {/* ------------------------------------------------------------ */}
      <h2 id="datum">Vesting Datum</h2>

      <CodeBlock
        code={`data VestingDatum = VestingDatum
  { beneficiary :: PubKeyHash
  , deadline    :: POSIXTime
  }`}
        language="haskell"
        filename="VestingDatum"
      />

      <p className="pexplaination">
        The datum is stored <strong>on-chain</strong> and defines the rules for
        unlocking funds. It contains:
      </p>

      <ul className="list-disc ml-6 pexplaination">
        <li>
          <strong>beneficiary</strong>: the public key hash allowed to spend
        </li>
        <li>
          <strong>deadline</strong>: the earliest POSIX time when spending is
          allowed
        </li>
      </ul>

      <p className="pexplaination">
        <code>unstableMakeIsData</code> generates serialization logic so this
        custom type can be stored and read on-chain.
      </p>

      {/* ------------------------------------------------------------ */}
      <h2 id="validator-logic">Validator Logic</h2>

      <CodeBlock
        code={`mkVestingValidator dat () ctx =
     traceIfFalse "beneficiary's signature missing" signedByBeneficiary
  && traceIfFalse "deadline not reached" deadlineReached`}
        language="haskell"
        filename="mkVestingValidator"
      />

      <p className="pexplaination">
        The validator enforces <strong>two independent checks</strong>. Both must
        succeed for the transaction to be valid.
      </p>

      {/* ------------------------------------------------------------ */}
      <h3>1. Signature Check</h3>

      <CodeBlock
        code={`signedByBeneficiary =
  txSignedBy info $ beneficiary dat`}
        language="haskell"
        filename="Signature Check"
      />

      <p className="pexplaination">
        This ensures that the transaction is signed by the beneficiary specified
        in the datum. Even if the deadline has passed, funds cannot be stolen by
        anyone else.
      </p>

      {/* ------------------------------------------------------------ */}
      <h3>2. Deadline Check</h3>

      <CodeBlock
        code={`deadlineReached =
  contains (from $ deadline dat) $
    txInfoValidRange info`}
        language="haskell"
        filename="Time Check"
      />

      <p className="pexplaination">
        Cardano does not expose the current block time directly. Instead, it
        checks whether the transaction’s <strong>validity range</strong> starts
        after the deadline.
      </p>

      <p className="pexplaination">
        If the transaction is submitted too early, validation fails with the
        message <strong>"deadline not reached"</strong>.
      </p>

      {/* ------------------------------------------------------------ */}
      <h2 id="wrap">wrapValidator</h2>

      <p className="pexplaination">
        The ledger expects validators that operate on raw{" "}
        <code>BuiltinData</code>. Since this validator is typed,{" "}
        <strong>wrapValidator</strong> converts untyped ledger data into typed
        Haskell values before executing the logic.
      </p>

      {/* ------------------------------------------------------------ */}
      <h2 id="helpers">Off-chain Helpers</h2>

      <p className="pexplaination">
        The remaining functions are used off-chain for developer convenience:
      </p>

      <ul className="list-disc ml-6 pexplaination">
        <li>
          <strong>saveVal</strong> - writes the compiled validator to a
          <code>.plutus</code> file
        </li>
        <li>
          <strong>vestingAddressBech32</strong> - derives the script address
        </li>
        <li>
          <strong>printVestingDatumJSON</strong> - creates datum JSON for
          <code>cardano-cli</code>
        </li>
      </ul>

      {/* ------------------------------------------------------------ */}
      <h2 id="summary">Summary</h2>

      <p>
        The Vesting validator is a foundational Plutus example that combines{" "}
        <strong>datums</strong>, <strong>signatures</strong>, and{" "}
        <strong>time constraints</strong> to enforce real-world financial rules
        on-chain.
      </p>

      <p className="pexplaination">
        This pattern is commonly used for team token vesting, escrows, delayed
        payments, and protocol-controlled fund releases.
      </p>
      <h2 id="execution-cli">Execution (CLI Walkthrough)</h2>

<p className="pexplaination">
  This section shows the complete <strong>vesting lifecycle</strong> using
  <code>cardano-cli</code>: creating the beneficiary hash, locking funds at the
  script address, and attempting (but failing) to spend before the deadline.
</p>

<CodeBlock
  language="bash"
  filename="Vesting – Lock & Spend (Testnet)"
  code={`$ cardano-cli address key-hash \\
  --payment-verification-key-file ../../../keys/payment.vkey
4d7b048eabaf7759a927ddd8effb44765322744ccf8df72f55593768

$ cardano-cli conway address build \\
  --payment-script-file vesting.plutus \\
  --testnet-magic 2 \\
  --out-file vesting.addr

$ cardano-cli query utxo \\
  --address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca \\
  --testnet-magic 2
--------------------------------------------------------------------------------------
a8fce103991a63b25e1dae90346c3441d96b570815532a0341a3d50845852a2f#0
c0fabd2847d0d69b8265ca0b5e8f6118afbec8bd12554019d919da2b64fdf98a#1
e3086ac18daec3a91af7c48bbb74dc854fd200a4c9fecf7d5837a3aed47edb6f#0

$ cardano-cli conway transaction build \\
  --tx-in af095ff7febdf51a4f8868b0e7ee40321df6aea0c083d5761ddf8c401fd4f9f7#1 \\
  --tx-out "$(cat vesting.addr)+2000000" \\
  --tx-out-inline-datum-file datum.json \\
  --change-address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca \\
  --testnet-magic 2 \\
  --out-file vesting-lock.tx

Estimated transaction fee: 172365 Lovelace

$ cardano-cli conway transaction sign \\
  --tx-body-file vesting-lock.tx \\
  --signing-key-file ../../../keys/payment.skey \\
  --testnet-magic 2 \\
  --out-file vesting-lock.signed

$ cardano-cli conway transaction submit \\
  --tx-file vesting-lock.signed \\
  --testnet-magic 2
Transaction successfully submitted.

$ cardano-cli conway transaction build \\
  --tx-in aaa38024bd84a7af93cadb1f9f14e9698740f96a70f37299912220d807617285#0 \\
  --tx-in-script-file vesting.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-file redeemer.json \\
  --required-signer ../../../keys/payment.skey \\
  --change-address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca \\
  --testnet-magic 2 \\
  --out-file vesting-spend.tx

Command failed: transaction build
Error: The following scripts have execution failures:
The Plutus script evaluation failed:
Script debugging logs: deadline not reached`}
 />

<br />
<p className="pexplaination">Datum.json</p>
     <CodeBlock
        code={`{
    "constructor": 0,
    "fields": [
      { "bytes": "4d7b048eabaf7759a927ddd8effb44765322744ccf8df72f55593768" },
      { "int": 1765995015000 }
    ]
  }
  `}
        language="json"
        filename="Datum.json"
      />
<br />
<p className="pexplaination">Redeemer.json</p>
     <CodeBlock
        code={`{
    "constructor": 0,
    "fields": []
  }
  `}
        language="json"
        filename="Redeemer.json"
      />

      <br />

               <p className="pexplaination">
        You can verify the transaction and UTxO details on{" "}
        <a
          href="https://preview.cardanoscan.io/transaction/aaa38024bd84a7af93cadb1f9f14e9698740f96a70f37299912220d807617285?tab=utxo"
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
