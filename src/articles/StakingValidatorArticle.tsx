/* eslint-disable react-refresh/only-export-components */
import CodeBlock from "@/components/layouts/CodeBlock";
// import React from "react";

// Article metadata
export const articleMeta = {
  id: "staking-validator",
  title: "Staking Validator",
  subtitle: "Reward distribution enforced at the staking layer",
  date: "2025-01-01T10:00:00.000Z",
  readTime: "7 min read",
  tags: ["plutus", "cardano", "staking", "stake-validator", "rewards"],
  author: {
    name: "Aman Kumar",
    avatar: "https://i.pravatar.cc/48?img=7"
  },
  plutusVersion: "V2",
  complexity: "Beginner",
  useCase: "NFTs"

};

export default function StakingValidatorArticle() {

const haskellCode = `{-# LANGUAGE DataKinds             #-}
{-# LANGUAGE FlexibleContexts      #-}
{-# LANGUAGE MultiParamTypeClasses #-}
{-# LANGUAGE NoImplicitPrelude     #-}
{-# LANGUAGE OverloadedStrings     #-}
{-# LANGUAGE ScopedTypeVariables   #-}
{-# LANGUAGE TemplateHaskell       #-}
{-# LANGUAGE TypeApplications      #-}
{-# LANGUAGE TypeFamilies          #-}
{-# LANGUAGE TypeOperators         #-}

module Staking
    ( stakeValidator
    , saveStakeValidator
    ) where

import           Plutus.V1.Ledger.Value (valueOf)
import           Plutus.V2.Ledger.Api   (Address, BuiltinData,
                                         ScriptContext (scriptContextPurpose, scriptContextTxInfo),
                                         ScriptPurpose (Certifying, Rewarding),
                                         StakeValidator, StakingCredential,
                                         TxInfo (txInfoOutputs, txInfoWdrl),
                                         TxOut (txOutAddress, txOutValue),
                                         adaSymbol, adaToken,
                                         mkStakeValidatorScript)
import qualified PlutusTx
import qualified PlutusTx.AssocMap      as PlutusTx
import           PlutusTx.Prelude       (AdditiveSemigroup ((+)), Bool (..),
                                         Eq ((==)), Integer,
                                         Maybe (Just, Nothing),
                                         MultiplicativeSemigroup ((*)),
                                         Ord ((>=)), Semigroup ((<>)), foldl,
                                         otherwise, traceError, traceIfFalse,
                                         ($), (.))
import           Prelude                (IO, String, ioError)
import           System.IO.Error        (userError)
import           Utilities              (tryReadAddress, wrapStakeValidator,
                                         writeStakeValidatorToFile)

{-# INLINABLE mkStakeValidator #-}
mkStakeValidator :: Address -> () -> ScriptContext -> Bool
mkStakeValidator addr () ctx = case scriptContextPurpose ctx of
    Certifying _   -> True
    Rewarding cred -> traceIfFalse "insufficient reward sharing" $ 2 * paidToAddress >= amount cred
    _              -> False
  where
    info :: TxInfo
    info = scriptContextTxInfo ctx

    amount :: StakingCredential -> Integer
    amount cred = case PlutusTx.lookup cred $ txInfoWdrl info of
        Just amt -> amt
        Nothing  -> traceError "withdrawal not found"

    paidToAddress :: Integer
    paidToAddress = foldl f 0 $ txInfoOutputs info
      where
        f :: Integer -> TxOut -> Integer
        f n o
            | txOutAddress o == addr = n + valueOf (txOutValue o) adaSymbol adaToken
            | otherwise              = n

{-# INLINABLE mkWrappedStakeValidator #-}
mkWrappedStakeValidator :: Address -> BuiltinData -> BuiltinData -> ()
mkWrappedStakeValidator = wrapStakeValidator . mkStakeValidator

stakeValidator :: Address -> StakeValidator
stakeValidator addr = mkStakeValidatorScript $
    $$(PlutusTx.compile [|| mkWrappedStakeValidator ||])
    \`PlutusTx.applyCode\`
    PlutusTx.liftCode addr



saveStakeValidator :: String -> IO ()
saveStakeValidator bech32 = do
    case tryReadAddress bech32 of
        Nothing   -> ioError $ userError $ "Invalid address: " <> bech32
        Just addr -> writeStakeValidatorToFile "./assets/staking.plutus" $ stakeValidator addr

`;

return (
  <div className="article-content">

    <h2>Introduction</h2>
    <p>
      This <strong>Staking Validator</strong> demonstrates how Plutus can
      control <em>reward withdrawals</em> at the staking layer. Unlike spending
      validators, staking validators do not lock UTxOs. Instead, they decide
      whether actions such as reward withdrawal or certificate processing are
      allowed.
    </p>

    <CodeBlock
      code={haskellCode}
      language="haskell"
      filename="Staking.hs"
    />

    <h2>Validator Purpose</h2>
    <p className="pexplaination">
      Staking validators are triggered based on the transaction’s
      <strong>ScriptPurpose</strong>. This contract behaves differently
      depending on whether the transaction is certifying stake credentials or
      withdrawing rewards.
    </p>

    <h2>Core Logic</h2>
    <p className="pexplaination">
      When the purpose is <strong>Certifying</strong>, the validator always
      succeeds. This allows delegation and registration certificates to pass
      without restriction.
    </p>

    <p className="pexplaination">
      When the purpose is <strong>Rewarding</strong>, the validator enforces a
      reward-sharing rule. At least <strong>twice the withdrawn reward</strong>
      must be paid to a predefined address. If this condition is not met, the
      transaction fails.
    </p>

    <h2>How Rewards Are Checked</h2>
    <p className="pexplaination">
      The validator extracts the withdrawn reward amount from
      <code>txInfoWdrl</code> using the staking credential. It then scans all
      transaction outputs and sums the ADA sent to the required address. If the
      payment is insufficient, validation fails.
    </p>

    <h2>Why This Is Powerful</h2>
    <p>
      This pattern enables protocol-level economics such as:
    </p>
    <ul className="list-disc pl-6">
      <li>Mandatory fee sharing for staking rewards</li>
      <li>Treasury or DAO reward redirection</li>
      <li>Enforced payout ratios for operators</li>
    </ul>

    <h2>Key Takeaway</h2>
    <p>
      Staking validators extend Plutus beyond UTxO spending. They allow you to
      regulate <strong>reward withdrawals and stake lifecycle events</strong>,
      making them essential for advanced Cardano protocol design.
    </p>

  </div>
);
}
