/* eslint-disable react-refresh/only-export-components */
// src/articles/PlutusTypes.tsx
// import React from "react";
import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
  id: "plutus-data-types",
  title: "Plutus Data Types",
  subtitle: "Understanding Plutus data types and their usage",
  date: "2024-11-02T10:00:00.000Z",
  readTime: "6 min read",
  tags: ["plutus", "haskell", "data-types"],
  author: {
    name: "Aman Kumar",
    avatar: "https://i.pravatar.cc/48?img=7"
  },
  plutusVersion: "V2",
  complexity: "Beginner",
  useCase: "Security"
};

export default function PlutusTypesArticle() {
  const haskellCode = `{-# LANGUAGE DataKinds          #-}
{-# LANGUAGE DeriveAnyClass     #-}
{-# LANGUAGE DeriveGeneric      #-}
{-# LANGUAGE TemplateHaskell    #-}

module PlutusExample.Types where

import           Plutus.V2.Ledger.Api
import           PlutusTx
import           PlutusTx.Prelude        hiding (Semigroup(..), unless)
import qualified Prelude                 as Haskell

-- Simple data types
data Color = Red | Green | Blue
    deriving stock (Haskell.Show)
PlutusTx.unstableMakeIsData ''Color

-- Record type
data User = User
    { userName :: BuiltinByteString
    , userAge  :: Integer
    , isActive :: Bool
    }
    deriving stock (Haskell.Show)
PlutusTx.unstableMakeIsData ''User

-- Enum type
data Action
    = Deposit
    | Withdraw
    | Transfer PubKeyHash
    deriving stock (Haskell.Show)
PlutusTx.unstableMakeIsData ''Action

-- Complex type with parameters
data ContractState = ContractState
    { csOwner   :: PubKeyHash
    , csBalance :: Integer
    , csHistory :: [BuiltinByteString]
    }
    deriving stock (Haskell.Show)
PlutusTx.unstableMakeIsData ''ContractState

-- Example validator using custom types
{-# INLINABLE mkValidator #-}
mkValidator :: ContractState -> Action -> ScriptContext -> Bool
mkValidator state action ctx =
    case action of
        Deposit ->
            -- Allow anyone to deposit
            True
        Withdraw ->
            -- Only owner can withdraw
            txSignedBy (scriptContextTxInfo ctx) (csOwner state)
        Transfer newOwner ->
            -- Only owner can transfer
            txSignedBy (scriptContextTxInfo ctx) (csOwner state)`;

  return (
    <div className="article-content">
      <h2 id="introduction">Introduction</h2>
      <p>This article covers various data types used in Plutus smart contracts and how to define them.</p>
      
      <h3 id="key-concepts">Key Concepts</h3>
      <ul>
        <li><strong>Simple Data Types</strong>: Basic enums and records</li>
        <li><strong>Deriving IsData</strong>: Making types usable on-chain</li>
        <li><strong>Complex Types</strong>: Types with parameters and functions</li>
        <li><strong>Validator Patterns</strong>: Using custom types in validators</li>
      </ul>

      <h2 id="complete-code">Data Type Definitions</h2>
      <p>Here are various data type definitions commonly used in Plutus:</p>
      
      <CodeBlock 
        code={haskellCode} 
        language="haskell"
        filename="Types.hs"
      />

      <h3 id="explanation">Type Explanations</h3>
      
      <h4 id="simple-enum">Simple Enum</h4>
      <p>The <code>Color</code> type is a simple enumeration with three values.</p>

      <h4 id="record-type">Record Type</h4>
      <p>The <code>User</code> type demonstrates a record with multiple fields.</p>

      <h4 id="complex-enum">Complex Enum</h4>
      <p>The <code>Action</code> type shows an enum where one variant carries additional data.</p>

      <h4 id="complex-record">Complex Record</h4>
      <p>The <code>ContractState</code> type demonstrates a more complex state record.</p>

      <h3 id="usage">Usage in Validators</h3>
      <p>Custom types are essential for writing readable and maintainable Plutus validators. They help structure data and make pattern matching more expressive.</p>
    </div>
  );
}