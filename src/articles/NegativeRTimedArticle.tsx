import CodeBlock from "@/components/layouts/CodeBlock";
// import React from "react";

// Article metadata
export const articleMeta = {
  id: "negative-redeemer-timed",
  title: "Negative Redeemer Timed Validator",
  subtitle: "Spend allowed only after deadline with a negative redeemer",
  date: "2025-01-01T10:00:00.000Z",
  readTime: "6 min read",
  tags: ["plutus", "cardano", "time", "posix", "validator"],
  author: {
    name: "Aman Kumar",
    avatar: "https://i.pravatar.cc/48?img=3",
  },
};

export default function NegativeRTimedArticle() {

  const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module NegativeRTimed where

import           Plutus.V1.Ledger.Interval (contains)
import           Plutus.V2.Ledger.Api      (POSIXTime,
                                            ScriptContext (scriptContextTxInfo),
                                            TxInfo (txInfoValidRange), from)
import qualified Plutus.V2.Ledger.Api      as PlutusV2
import           PlutusTx                  (compile, unstableMakeIsData)
import           PlutusTx.Builtins         (BuiltinData, Integer)
import           PlutusTx.Prelude          (Bool, Ord ((<=)), traceIfFalse, ($),
                                            (&&))
import           Utilities                 (wrapValidator)



newtype CustomDatum = MkCustomDatum { deadline :: POSIXTime }
unstableMakeIsData ''CustomDatum

{-# INLINABLE mkValidator #-}
mkValidator :: CustomDatum -> Integer -> ScriptContext -> Bool
mkValidator (MkCustomDatum d) r ctx = traceIfFalse "expected a negative redeemer" $ r <= 0 &&
                                      traceIfFalse "deadline not reached" deadlineReached
    where
        info :: TxInfo
        info = scriptContextTxInfo ctx

        deadlineReached :: Bool
        deadlineReached = contains (from d) $ txInfoValidRange info


{-# INLINABLE  mkWrappedValidator #-}
mkWrappedValidator :: BuiltinData -> BuiltinData -> BuiltinData -> ()
mkWrappedValidator = wrapValidator mkValidator

validator :: PlutusV2.Validator
validator = PlutusV2.mkValidatorScript $$(PlutusTx.compile [|| mkWrappedValidator ||])

`;

  const cliCommands = `$ cardano-cli conway address build   --payment-script-file NegativeRTimed.plutus   --testnet-magic 2   --out-file neg.addr
$ cat > datum.json <<EOF                                                                                                
{
  "constructor": 0,
  "fields": [
    { "int": 1700000000 }
  ]
}
EOF
$ cardano-cli query utxo   --address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca   --testnet-magic 2
                           TxHash                                 TxIx        Amount
--------------------------------------------------------------------------------------
4f7519e36bc8c46ffe1d0702f65d1281402e5d4c986c2b0df501b2b01a23be6e     0        1406287 lovelace + 1 a9b9d196bb9628851e4736b4906bb984da653b530fc5902c7fab80bc.46524545 + TxOutDatumNone
75e3f20b50059670e47f2c0c08a78ddb0a22afc0a37ae5a7d226603321286619     1        9948677603 lovelace + 1 79dc2cb93b706af32fe1ef3b3fb014b98ef83be6b5c1a0c6e9aa8f83.46524545 + 1 a9b9d196bb9628851e4736b4906bb984da653b530fc5902c7fab80bc.42414431 + 3 a9b9d196bb9628851e4736b4906bb984da653b530fc5902c7fab80bc.46524545 + 1 a9b9d196bb9628851e4736b4906bb984da653b530fc5902c7fab80bc.4e465431 + 1 f0d624fb0e1e34f91911e5a182f5ae0282518cbfac823b667ef50b97.434f4c4c + TxOutDatumNone
a8fce103991a63b25e1dae90346c3441d96b570815532a0341a3d50845852a2f     0        1202733 lovelace + TxOutDatumNone
f5b4345ea271c03fe241f1914eacbd76e39f1f110eec8072c3d482dadf22d768     1        2652510 lovelace + TxOutDatumNone
$ cardano-cli conway transaction build \\
  --tx-in 75e3f20b50059670e47f2c0c08a78ddb0a22afc0a37ae5a7d226603321286619#1 \\
  --tx-out "$(cat neg.addr)+2000000" \\
  --tx-out-inline-datum-file datum.json \\
  --change-address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca \\
  --testnet-magic 2 \\
  --out-file neg-lock.tx
Estimated transaction fee: 176501 Lovelace
$ cardano-cli conway transaction sign \\
  --tx-body-file neg-lock.tx \\
  --signing-key-file ../../../keys/payment.skey \\
  --testnet-magic 2 \\
  --out-file neg-lock.signed
$ cardano-cli conway transaction submit \\
  --tx-file neg-lock.signed \\
  --testnet-magic 2
Transaction successfully submitted.
$ cardano-cli query utxo   --address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca   --testnet-magic 2
                           TxHash                                 TxIx        Amount
--------------------------------------------------------------------------------------
4f7519e36bc8c46ffe1d0702f65d1281402e5d4c986c2b0df501b2b01a23be6e     0        1406287 lovelace + 1 a9b9d196bb9628851e4736b4906bb984da653b530fc5902c7fab80bc.46524545 + TxOutDatumNone
75e3f20b50059670e47f2c0c08a78ddb0a22afc0a37ae5a7d226603321286619     1        9948677603 lovelace + 1 79dc2cb93b706af32fe1ef3b3fb014b98ef83be6b5c1a0c6e9aa8f83.46524545 + 1 a9b9d196bb9628851e4736b4906bb984da653b530fc5902c7fab80bc.42414431 + 3 a9b9d196bb9628851e4736b4906bb984da653b530fc5902c7fab80bc.46524545 + 1 a9b9d196bb9628851e4736b4906bb984da653b530fc5902c7fab80bc.4e465431 + 1 f0d624fb0e1e34f91911e5a182f5ae0282518cbfac823b667ef50b97.434f4c4c + TxOutDatumNone
a8fce103991a63b25e1dae90346c3441d96b570815532a0341a3d50845852a2f     0        1202733 lovelace + TxOutDatumNone
f5b4345ea271c03fe241f1914eacbd76e39f1f110eec8072c3d482dadf22d768     1        2652510 lovelace + TxOutDatumNone
$ cardano-cli query utxo   --address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca   --testnet-magic 2
                           TxHash                                 TxIx        Amount
--------------------------------------------------------------------------------------
3ba1e611df06206ee156ba476948a09de2d768376d9883365adfc7eca6f85f9e     1        9946501102 lovelace + 1 79dc2cb93b706af32fe1ef3b3fb014b98ef83be6b5c1a0c6e9aa8f83.46524545 + 1 a9b9d196bb9628851e4736b4906bb984da653b530fc5902c7fab80bc.42414431 + 3 a9b9d196bb9628851e4736b4906bb984da653b530fc5902c7fab80bc.46524545 + 1 a9b9d196bb9628851e4736b4906bb984da653b530fc5902c7fab80bc.4e465431 + 1 f0d624fb0e1e34f91911e5a182f5ae0282518cbfac823b667ef50b97.434f4c4c + TxOutDatumNone
4f7519e36bc8c46ffe1d0702f65d1281402e5d4c986c2b0df501b2b01a23be6e     0        1406287 lovelace + 1 a9b9d196bb9628851e4736b4906bb984da653b530fc5902c7fab80bc.46524545 + TxOutDatumNone
a8fce103991a63b25e1dae90346c3441d96b570815532a0341a3d50845852a2f     0        1202733 lovelace + TxOutDatumNone
f5b4345ea271c03fe241f1914eacbd76e39f1f110eec8072c3d482dadf22d768     1        2652510 lovelace + TxOutDatumNone
$ 
$ cardano-cli query utxo \\
  --address $(cat neg.addr) \\
  --testnet-magic 2
                           TxHash                                 TxIx        Amount
--------------------------------------------------------------------------------------
3ba1e611df06206ee156ba476948a09de2d768376d9883365adfc7eca6f85f9e     0        2000000 lovelace + TxOutDatumInline BabbageEraOnwardsConway (HashableScriptData "\\216y\\159\\SUBeS\\241\\NUL\\255" (ScriptDataConstructor 0 [ScriptDataNumber 1700000000]))
$ SCRIPT_TX=3ba1e611df06206ee156ba476948a09de2d768376d9883365adfc7eca6f85f9e#0
$ COLLATERAL_TX=f5b4345ea271c03fe241f1914eacbd76e39f1f110eec8072c3d482dadf22d768#1
$ SCRIPT_TX=3ba1e611df06206ee156ba476948a09de2d768376d9883365adfc7eca6f85f9e#0
$ COLLATERAL_TX=f5b4345ea271c03fe241f1914eacbd76e39f1f110eec8072c3d482dadf22d768#1
$ cardano-cli conway transaction build \\
  --tx-in $SCRIPT_TX \\
  --tx-in-script-file NegativeRTimed.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-file redeemer-pass.json \\
  --tx-in-collateral $COLLATERAL_TX \\
  --invalid-before 1700000000 \\
  --change-address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca \
  --testnet-magic 2 \\
  --out-file neg-pass.tx
Command failed: transaction build  Error: The following scripts have execution failures:
the script for transaction input 0 (in ascending order of the TxIds) failed with: 
Error translating the transaction context: BabbageContextError (AlonzoContextError (TimeTranslationPastHorizon "PastHorizon {pastHorizonCallStack = [(\"runQuery\",SrcLoc {srcLocPackage = \"ouroboros-consensus-0.21.0.0-4UT1mZ9YBSy4cFR3WGJOe6\", srcLocModule = \"Ouroboros.Consensus.HardFork.History.Qry\", srcLocFile = \"src/ouroboros-consensus/Ouroboros/Consensus/HardFork/History/Qry.hs\", srcLocStartLine = 439, srcLocStartCol = 44, srcLocEndLine = 439, srcLocEndCol = 64}),(\"interpretQuery\",SrcLoc {srcLocPackage = \"ouroboros-consensus-0.21.0.0-4UT1mZ9YBSy4cFR3WGJOe6\", srcLocModule = \"Ouroboros.Consensus.HardFork.History.EpochInfo\", srcLocFile = \"src/ouroboros-consensus/Ouroboros/Consensus/HardFork/History/EpochInfo.hs\", srcLocStartLine = 44, srcLocStartCol = 50, srcLocEndLine = 44, srcLocEndCol = 68}),(\"interpretQuery'\",SrcLoc {srcLocPackage = \"ouroboros-consensus-0.21.0.0-4UT1mZ9YBSy4cFR3WGJOe6\", srcLocModule = \"Ouroboros.Consensus.HardFork.History.EpochInfo\", srcLocFile = \"src/ouroboros-consensus/Ouroboros/Consensus/HardFork/History/EpochInfo.hs\", srcLocStartLine = 38, srcLocStartCol = 9, srcLocEndLine = 38, srcLocEndCol = 52}),(\"epochInfoSlotToRelativeTime_\",SrcLoc {srcLocPackage = \"cardano-slotting-0.2.0.0-9tJrzEDnhG4B1gcmL5K47F\", srcLocModule = \"Cardano.Slotting.EpochInfo.API\", srcLocFile = \"src/Cardano/Slotting/EpochInfo/API.hs\", srcLocStartLine = 62, srcLocStartCol = 9, srcLocEndLine = 62, srcLocEndCol = 37}),(\"epochInfoSlotToRelativeTime\",SrcLoc {srcLocPackage = \"cardano-slotting-0.2.0.0-9tJrzEDnhG4B1gcmL5K47F\", srcLocModule = \"Cardano.Slotting.EpochInfo.API\", srcLocFile = \"src/Cardano/Slotting/EpochInfo/API.hs\", srcLocStartLine = 125, srcLocStartCol = 40, srcLocEndLine = 125, srcLocEndCol = 70}),(\"epochInfoSlotToRelativeTime_\",SrcLoc {srcLocPackage = \"cardano-slotting-0.2.0.0-9tJrzEDnhG4B1gcmL5K47F\", srcLocModule = \"Cardano.Slotting.EpochInfo.API\", srcLocFile = \"src/Cardano/Slotting/EpochInfo/API.hs\", srcLocStartLine = 62, srcLocStartCol = 9, srcLocEndLine = 62, srcLocEndCol = 37}),(\"epochInfoSlotToRelativeTime\",SrcLoc {srcLocPackage = \"cardano-slotting-0.2.0.0-9tJrzEDnhG4B1gcmL5K47F\", srcLocModule = \"Cardano.Slotting.EpochInfo.API\", srcLocFile = \"src/Cardano/Slotting/EpochInfo/API.hs\", srcLocStartLine = 91, srcLocStartCol = 30, srcLocEndLine = 91, srcLocEndCol = 63}),(\"epochInfoSlotToUTCTime\",SrcLoc {srcLocPackage = \"cardano-ledger-core-1.15.0.0-FRh9mvvcBbh2MPeVC3KPsT\", srcLocModule = \"Cardano.Ledger.Plutus.TxInfo\", srcLocFile = \"src/Cardano/Ledger/Plutus/TxInfo.hs\", srcLocStartLine = 174, srcLocStartCol = 9, srcLocEndLine = 174, srcLocEndCol = 41})], pastHorizonExpression = Some (EPair (ERelToAbsTime (ERelSlotToTime (EAbsToRelSlot (ELit (SlotNo 1700000000))))) (ESlotLength (ELit (SlotNo 1700000000)))), pastHorizonSummary = [EraSummary {eraStart = Bound {boundTime = RelativeTime 0s, boundSlot = SlotNo 0, boundEpoch = EpochNo 0}, eraEnd = EraEnd (Bound {boundTime = RelativeTime 0s, boundSlot = SlotNo 0, boundEpoch = EpochNo 0}), eraParams = EraParams {eraEpochSize = EpochSize 4320, eraSlotLength = SlotLength 20s, eraSafeZone = StandardSafeZone 864, eraGenesisWin = GenesisWindow {unGenesisWindow = 864}}},EraSummary {eraStart = Bound {boundTime = RelativeTime 0s, boundSlot = SlotNo 0, boundEpoch = EpochNo 0}, eraEnd = EraEnd (Bound {boundTime = RelativeTime 0s, boundSlot = SlotNo 0, boundEpoch = EpochNo 0}), eraParams = EraParams {eraEpochSize = EpochSize 86400, eraSlotLength = SlotLength 1s, eraSafeZone = StandardSafeZone 25920, eraGenesisWin = GenesisWindow {unGenesisWindow = 25920}}},EraSummary {eraStart = Bound {boundTime = RelativeTime 0s, boundSlot = SlotNo 0, boundEpoch = EpochNo 0}, eraEnd = EraEnd (Bound {boundTime = RelativeTime 0s, boundSlot = SlotNo 0, boundEpoch = EpochNo 0}), eraParams = EraParams {eraEpochSize = EpochSize 86400, eraSlotLength = SlotLength 1s, eraSafeZone = StandardSafeZone 25920, eraGenesisWin = GenesisWindow {unGenesisWindow = 25920}}},EraSummary {eraStart = Bound {boundTime = RelativeTime 0s, boundSlot = SlotNo 0, boundEpoch = EpochNo 0}, eraEnd = EraEnd (Bound {boundTime = RelativeTime 0s, boundSlot = SlotNo 0, boundEpoch = EpochNo 0}), eraParams = EraParams {eraEpochSize = EpochSize 86400, eraSlotLength = SlotLength 1s, eraSafeZone = StandardSafeZone 25920, eraGenesisWin = GenesisWindow {unGenesisWindow = 25920}}},EraSummary {eraStart = Bound {boundTime = RelativeTime 0s, boundSlot = SlotNo 0, boundEpoch = EpochNo 0}, eraEnd = EraEnd (Bound {boundTime = RelativeTime 259200s, boundSlot = SlotNo 259200, boundEpoch = EpochNo 3}), eraParams = EraParams {eraEpochSize = EpochSize 86400, eraSlotLength = SlotLength 1s, eraSafeZone = StandardSafeZone 25920, eraGenesisWin = GenesisWindow {unGenesisWindow = 25920}}},EraSummary {eraStart = Bound {boundTime = RelativeTime 259200s, boundSlot = SlotNo 259200, boundEpoch = EpochNo 3}, eraEnd = EraEnd (Bound {boundTime = RelativeTime 55814400s, boundSlot = SlotNo 55814400, boundEpoch = EpochNo 646}), eraParams = EraParams {eraEpochSize = EpochSize 86400, eraSlotLength = SlotLength 1s, eraSafeZone = StandardSafeZone 25920, eraGenesisWin = GenesisWindow {unGenesisWindow = 25920}}},EraSummary {eraStart = Bound {boundTime = RelativeTime 55814400s, boundSlot = SlotNo 55814400, boundEpoch = EpochNo 646}, eraEnd = EraEnd (Bound {boundTime = RelativeTime 99878400s, boundSlot = SlotNo 99878400, boundEpoch = EpochNo 1156}), eraParams = EraParams {eraEpochSize = EpochSize 86400, eraSlotLength = SlotLength 1s, eraSafeZone = StandardSafeZone 25920, eraGenesisWin = GenesisWindow {unGenesisWindow = 25920}}}]}"))
$ 
`;

  return (
    <div className="article-content">

      <h2>Introduction</h2>
      <p>
        This validator demonstrates <strong>time-based spending</strong> combined
        with a <strong>value constraint on the redeemer</strong>.
        Funds can only be spent <em>after a deadline</em> and only if the
        redeemer is negative.
      </p>

      <CodeBlock
        code={haskellCode}
        language="haskell"
        filename="NegativeRTimed.hs"
      />

      <h2>Validator Logic</h2>
      <p className="pexplaination">
        Two independent checks are enforced:
      </p>
      <ul className="list-disc pl-6">
        <li>Redeemer must be ≤ 0</li>
        <li>Transaction must occur after the deadline</li>
      </ul>

      <h2>Time Validation</h2>
      <p className="pexplaination">
        The deadline is stored in the datum as <strong>POSIXTime</strong>.
        The validator checks that the transaction’s valid range starts
        after this deadline using:
      </p>

      <CodeBlock
        code="contains (from d) (txInfoValidRange info)"
        language="haskell"
        filename="Time Check"
      />

      <h2>Common Pitfall ⚠️</h2>
      <p className="pexplaination text-red-700">
        cardano-cli uses <strong>slot numbers</strong> for
        <code>--invalid-before</code>, NOT POSIX time.
        Passing POSIX values causes <strong>PastHorizon</strong> errors.
      </p>

      <h2>Execution</h2>
      <CodeBlock
        code={cliCommands}
        language="bash"
        filename="Testnet Execution"
      />

      <h2>Summary</h2>
      <p>
        This example teaches a critical real-world lesson: on-chain time
        checks are simple, but off-chain time handling is subtle.
        Understanding the difference between slots and POSIX time is
        essential for building reliable time-locked contracts.
      </p>

    </div>
  );
}
