/* eslint-disable react-refresh/only-export-components */
// src/articles/PlutusBigValidator.tsx
// import React from "react";
import CodeBlock from "../components/layouts/CodeBlock";

// Define the article metadata
export const articleMeta = {
  id: "plutus-big-validator",
  title: "Plutus BigValidator Example",
  subtitle: "Complete Validator Script with Multiple Redeemers",
  date: "2024-11-01T10:00:00.000Z",
  readTime: "8 min read",
  tags: ["plutus", "cardano", "validator", "smart-contracts"],
  author: {
    name: "Aman Kumar",
    avatar: "https://i.pravatar.cc/48?img=7"
  },
  plutusVersion: "V2",
  complexity: "Beginner",
  useCase: "NFTs"

};

// The article component
export default function PlutusBigValidatorArticle() {
  const haskellCode = `{-# LANGUAGE DataKinds          #-}
{-# LANGUAGE DeriveAnyClass     #-}
{-# LANGUAGE DeriveGeneric      #-}
{-# LANGUAGE LambdaCase         #-}
{-# LANGUAGE NoImplicitPrelude  #-}
{-# LANGUAGE OverloadedStrings  #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE TemplateHaskell    #-}
{-# LANGUAGE TypeApplications   #-}
{-# LANGUAGE TypeFamilies       #-}
{-# LANGUAGE TypeOperators      #-}

module PlutusExample.BigValidator where

import           Plutus.V2.Ledger.Api
import           Plutus.V2.Ledger.Contexts
import           PlutusTx
import           PlutusTx.Prelude        hiding (Semigroup(..), unless)
import qualified Prelude                 as Haskell

newtype MyDatum = MyDatum
    { owner :: PubKeyHash
    }
    deriving stock (Haskell.Show)
PlutusTx.unstableMakeIsData ''MyDatum

data MyRedeemer
    = Use
    | AdminClose PubKeyHash
    deriving stock (Haskell.Show)
PlutusTx.unstableMakeIsData ''MyRedeemer

{-# INLINABLE checkDeadline #-}
checkDeadline :: POSIXTime -> ScriptContext -> Bool
checkDeadline deadline ctx =
    let info = scriptContextTxInfo ctx
    in  contains (to deadline) (txInfoValidRange info)

{-# INLINABLE checkSignedBy #-}
checkSignedBy :: PubKeyHash -> ScriptContext -> Bool
checkSignedBy pkh ctx =
    txSignedBy (scriptContextTxInfo ctx) pkh

{-# INLINABLE checkValue #-}
checkValue :: Value -> Value -> Bool
checkValue expected actual =
    valueOf actual adaSymbol adaToken >= valueOf expected adaSymbol adaToken

{-# INLINABLE mkValidator #-}
mkValidator :: MyDatum -> MyRedeemer -> ScriptContext -> Bool
mkValidator datum redeemer ctx =
    case redeemer of
        Use ->
            traceIfFalse "Owner signature missing"   (checkSignedBy (owner datum) ctx)
            &&
            traceIfFalse "Deadline not reached"      (checkDeadline 1699999999999 ctx)

        AdminClose adminKey ->
            traceIfFalse "Admin signature missing"   (checkSignedBy adminKey ctx)
            &&
            traceIfFalse "Insufficient value locked"
                (checkValue (lovelaceValueOf 2_000_000) (valueSpent (scriptContextTxInfo ctx)))

wrappedValidator :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedValidator rawDatum rawRedeemer rawCtx =
    check
        ( mkValidator
            (PlutusTx.unsafeFromBuiltinData rawDatum)
            (PlutusTx.unsafeFromBuiltinData rawRedeemer)
            (PlutusTx.unsafeFromBuiltinData rawCtx)
        )

validator :: Validator
validator = mkValidatorScript $$(PlutusTx.compile [|| wrappedValidator ||])

validatorHash :: ValidatorHash
validatorHash = validatorHash validator

validatorAddress :: Address
validatorAddress = Address (ScriptCredential validatorHash) Nothing`;

  return (
    <div className="article-content">
      <h2 id="introduction">Introduction</h2>
      <p>This is a complete Plutus validator script example that demonstrates a real-world validator with multiple redeemer options and various checks.</p>
      
      <h3 id="key-features">Key Features</h3>
      <ul>
        <li><strong>Multiple Redeemer Options</strong>: The validator accepts two different redeemer types</li>
        <li><strong>Signature Verification</strong>: Both paths require signature verification</li>
        <li><strong>Time Constraints</strong>: Checks for deadlines using POSIXTime</li>
        <li><strong>Value Validation</strong>: Ensures minimum ADA is locked</li>
      </ul>

      <h2 id="complete-code">Complete Implementation</h2>
      <p>Here's the complete validator code:</p>
      
      <CodeBlock 
        code={haskellCode} 
        language="haskell"
        filename="BigValidator.hs"
      />

      <h3 id="explanation">Code Explanation</h3>
      <p>The validator has two redeemer paths:</p>
      
      <h4 id="use-redeemer">Use Redeemer</h4>
      <ul>
        <li>Requires owner's signature</li>
        <li>Checks if deadline has been reached</li>
        <li>Uses <code>checkDeadline</code> function with POSIXTime</li>
      </ul>

      <h4 id="admin-close">AdminClose Redeemer</h4>
      <ul>
        <li>Requires admin's signature</li>
        <li>Validates that at least 2,000,000 lovelace are locked</li>
        <li>Uses <code>checkValue</code> function</li>
      </ul>

      <h3 id="compilation">Compilation & Address</h3>
      <p>The validator is compiled using Template Haskell and creates:</p>
      <ul>
        <li>Validator hash for reference</li>
        <li>Validator address for deployment</li>
      </ul>
    </div>
  );
}