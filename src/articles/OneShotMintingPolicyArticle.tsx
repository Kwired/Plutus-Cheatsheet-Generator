import CodeBlock from "@/components/layouts/CodeBlock";
// import React from "react";

// Article metadata
export const articleMeta = {
  id: "one-shot-minting-policy",
  title: "One-Shot Minting Policy",
  subtitle: "Mint exactly once using a specific UTxO reference",
  date: "2025-01-01T10:00:00.000Z",
  readTime: "8 min read",
  tags: [
    "plutus",
    "cardano",
    "minting-policy",
    "security",
    "one-shot",
    "plutus-v3"
  ],
  author: {
    name: "Aman Kumar",
    avatar: "https://i.pravatar.cc/48?img=7"
  }
};

export default function OneShotMintingPolicyArticle() {

const haskellCode = `{-# LANGUAGE DataKinds                  #-}
{-# LANGUAGE DerivingStrategies         #-}
{-# LANGUAGE DeriveGeneric              #-}
{-# LANGUAGE DeriveAnyClass             #-}
{-# LANGUAGE GeneralizedNewtypeDeriving #-}
{-# LANGUAGE FlexibleInstances          #-}
{-# LANGUAGE ImportQualifiedPost        #-}
{-# LANGUAGE MultiParamTypeClasses      #-}
{-# LANGUAGE NamedFieldPuns             #-}
{-# LANGUAGE NoImplicitPrelude          #-}
{-# LANGUAGE OverloadedStrings          #-}
{-# LANGUAGE PatternSynonyms            #-}
{-# LANGUAGE ScopedTypeVariables        #-}
{-# LANGUAGE Strict                     #-}
{-# LANGUAGE TemplateHaskell            #-}
{-# LANGUAGE ViewPatterns               #-}
{-# LANGUAGE TypeApplications           #-}
{-# LANGUAGE UndecidableInstances       #-}
{-# OPTIONS_GHC -fno-full-laziness #-}
{-# OPTIONS_GHC -fno-ignore-interface-pragmas #-}
{-# OPTIONS_GHC -fno-omit-interface-pragmas #-}
{-# OPTIONS_GHC -fno-spec-constr #-}
{-# OPTIONS_GHC -fno-specialise #-}
{-# OPTIONS_GHC -fno-strictness #-}
{-# OPTIONS_GHC -fno-unbox-small-strict-fields #-}
{-# OPTIONS_GHC -fno-unbox-strict-fields #-}
{-# OPTIONS_GHC -fplugin-opt PlutusTx.Plugin:target-version=1.1.0 #-}
{-# OPTIONS_GHC -fplugin-opt PlutusTx.Plugin:preserve-logging #-}

module OneShotMintingPolicy where

-- Standard library imports
import GHC.Generics (Generic)

-- External library imports
import PlutusCore.Version (plcVersion110)
import PlutusLedgerApi.V1.Value (geq, leq)
import PlutusLedgerApi.V3 qualified as V3
import PlutusLedgerApi.V3.Contexts qualified as V3Contexts
import PlutusLedgerApi.Data.V3 qualified as V3Data
import PlutusTx 
    ( CompiledCode
    , compile
    , liftCode
    , makeLift
    , makeIsDataSchemaIndexed
    , unsafeApplyCode
    )
import PlutusTx.AssocMap qualified as Map
import PlutusTx.Prelude 
    ( Bool(..)
    , BuiltinUnit
    , Maybe(Just, Nothing)
    , any
    , check
    , mempty
    , traceIfFalse
    , (&&)
    , ($)
    , (==)
    )

-- Internal imports
import PlutusTx.Blueprint

data OneShotMintingParams = OneShotMintingParams { utxoRef :: V3.TxOutRef} 
    deriving stock (Generic)
    deriving anyclass (HasBlueprintDefinition)

makeLift ''OneShotMintingParams
makeIsDataSchemaIndexed ''OneShotMintingParams [('OneShotMintingParams, 0)]

data OneShotMintingRedeemer = MintToken V3.TokenName | BurnToken V3.TokenName
  deriving stock (Generic)
  deriving anyclass (HasBlueprintDefinition)

makeIsDataSchemaIndexed ''OneShotMintingRedeemer [('MintToken, 0), ('BurnToken, 1)]

{-# INLINEABLE oneShotTypedMintingPolicy #-}
oneShotTypedMintingPolicy :: 
    OneShotMintingParams -> 
    OneShotMintingRedeemer -> 
    V3.ScriptContext -> 
    Bool
oneShotTypedMintingPolicy params redeemer ctx =
    case redeemer of    
        MintToken tn -> traceIfFalse "UTXO not found" hasUTxO &&
                        traceIfFalse "Invalid minted amount" (checkMintedAmount tn)

        BurnToken tn -> traceIfFalse "Invalid burned amount" (checkBurnedAmount tn)
    where
        info :: V3.TxInfo
        info = V3.scriptContextTxInfo ctx

        ownSymbol :: V3.CurrencySymbol
        ownSymbol = V3Contexts.ownCurrencySymbol ctx

        minted :: V3.Value
        minted = V3.mintValueMinted $ V3Contexts.txInfoMint info

        hasUTxO :: Bool
        hasUTxO = any (\\i -> V3.txInInfoOutRef i == utxoRef params) $ V3.txInfoInputs info

        checkMintedAmount :: V3.TokenName -> Bool
        checkMintedAmount tokenName = geq (currencyValueOf minted ownSymbol) (V3.singleton ownSymbol tokenName 1)

        checkBurnedAmount :: V3.TokenName -> Bool
        checkBurnedAmount tokenName = leq (currencyValueOf minted ownSymbol) (V3.singleton ownSymbol tokenName (-1))


{-# INLINABLE currencyValueOf #-}
currencyValueOf :: V3.Value -> V3.CurrencySymbol -> V3.Value
currencyValueOf (V3.Value m) c = case Map.lookup c m of
    Nothing -> mempty
    Just t  -> V3.Value (Map.singleton c t)


oneShotUntypedMintingPolicy ::
  OneShotMintingParams ->
  V3Data.ScriptContext ->
  BuiltinUnit
oneShotUntypedMintingPolicy params ctx =
  check $ oneShotTypedMintingPolicy params (getRedeemer ctx) getScriptContext
  where
    getRedeemer :: V3Data.ScriptContext -> OneShotMintingRedeemer
    getRedeemer V3Data.ScriptContext {V3Data.scriptContextRedeemer = V3Data.Redeemer redeemer} = 
      V3.unsafeFromBuiltinData redeemer

    getScriptContext :: V3.ScriptContext
    getScriptContext = V3.unsafeFromBuiltinData $ V3.toBuiltinData ctx


oneShotMintingPolicyScript ::
  OneShotMintingParams ->
  CompiledCode (V3Data.ScriptContext -> BuiltinUnit)
oneShotMintingPolicyScript params =
  $$(compile [||oneShotUntypedMintingPolicy||])
    \`unsafeApplyCode\` liftCode plcVersion110 params
`;

return (
  <div className="article-content">

    <h2>Introduction</h2>
    <p>
      The <strong>One-Shot Minting Policy</strong> is a secure and widely used
      pattern in Cardano smart contracts. It guarantees that a token can be
      minted exactly once by requiring the consumption of a specific UTxO.
      This approach is commonly used for NFTs, protocol identifiers, and
      governance tokens.
    </p>

    <CodeBlock
      code={haskellCode}
      language="haskell"
      filename="OneShotMintingPolicy.hs"
    />

    <h2>Key Idea: UTxO-Anchored Minting</h2>
    <p className="pexplaination">
      The policy is parameterized by a <strong>TxOutRef</strong>. The token
      can only be minted if that exact UTxO is consumed in the transaction.
      Since UTxOs can only be spent once, minting becomes provably one-time.
    </p>

    <h2>Mint vs Burn via Redeemer</h2>
    <CodeBlock
      code={`data OneShotMintingRedeemer
  = MintToken TokenName
  | BurnToken TokenName`}
      language="haskell"
      filename="Redeemer"
    />

    <p className="pexplaination">
      The redeemer explicitly distinguishes between minting and burning. This
      allows the policy to strictly control both token creation and destruction.
    </p>

    <h2>Minting Rules</h2>
    <p className="pexplaination">
      When minting:
    </p>
    <ul className="list-disc pl-6">
      <li>The specified UTxO <strong>must</strong> be consumed</li>
      <li>At least one token of the given name must be minted</li>
      <li>The currency symbol is derived from the policy itself</li>
    </ul>

    <h2>Burning Rules</h2>
    <p className="pexplaination">
      Burning is allowed without the UTxO constraint, but only if the amount
      burned is valid (negative mint value).
    </p>

    <h2>Why This Design Is Secure</h2>
    <ul className="list-disc pl-6">
      <li>UTxO uniqueness enforces one-time minting</li>
      <li>Currency symbol is policy-scoped</li>
      <li>Explicit redeemer prevents ambiguity</li>
      <li>Mint and burn paths are clearly separated</li>
    </ul>

    <h2>Real-World Use Cases</h2>
    <ul className="list-disc pl-6">
      <li>NFT minting</li>
      <li>DAO identity tokens</li>
      <li>Protocol bootstrapping assets</li>
      <li>Oracle identity tokens</li>
    </ul>

    <h2>Key Takeaway</h2>
    <p>
      One-shot minting is the gold standard for secure token creation on
      Cardano. By anchoring minting rights to a specific UTxO and separating
      mint and burn logic, this policy eliminates entire classes of exploits
      related to inflation and replay attacks.
    </p>

  </div>
);
}
