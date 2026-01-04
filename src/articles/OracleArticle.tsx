import CodeBlock from "@/components/layouts/CodeBlock";
// import React from "react";

// Article metadata
export const articleMeta = {
  id: "oracle-validator",
  title: "Oracle Validator",
  subtitle: "On-chain price oracle secured by NFT and operator signature",
  date: "2025-01-01T10:00:00.000Z",
  readTime: "10 min read",
  tags: ["plutus", "cardano", "oracle", "defi", "nft"],
  author: {
    name: "Aman Kumar",
    avatar: "https://i.pravatar.cc/48?img=3",
  },
};

// Article component
export default function OracleArticle() {

  const haskellCode = `{-# LANGUAGE DataKinds         #-}
{-# LANGUAGE NoImplicitPrelude #-}
{-# LANGUAGE TemplateHaskell   #-}
{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE DeriveAnyClass #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE MultiParamTypeClasses #-}
{-# LANGUAGE OverloadedStrings  #-}

module Oracle where

import Plutus.V2.Ledger.Api
    ( BuiltinData,
      ScriptContext(scriptContextTxInfo),
      mkValidatorScript,
      PubKeyHash,
      Datum(Datum),
      Validator,
      TxInInfo(txInInfoResolved),
      TxInfo,
      OutputDatum(OutputDatumHash, NoOutputDatum, OutputDatum),
      TxOut(txOutDatum, txOutValue), UnsafeFromData (unsafeFromBuiltinData) )
import Plutus.V2.Ledger.Contexts
    ( findDatum,
      getContinuingOutputs,
      txSignedBy,
      findOwnInput )    
import PlutusTx
    ( compile,
      unstableMakeIsData,
      FromData(fromBuiltinData),
      liftCode,
      applyCode,
      makeLift, CompiledCode )
import PlutusTx.Prelude
    ( Bool,
      Integer,
      Maybe(..),
      ($),
      (.),
      (&&),
      tail,
      isJust,
      traceError,
      traceIfFalse,
      Eq(..), 
      take 
      )
import           Prelude                    (Show (show), span, IO)
import qualified  Prelude               ((/=) )
import Data.String ( IsString(fromString), String )
import Plutus.V1.Ledger.Value
    ( assetClassValueOf, AssetClass(AssetClass) )
import           Utilities            (wrapValidator, writeValidatorToFile, writeCodeToFile)
import Text.Printf (printf)



{-# INLINABLE parseOracleDatum #-}
parseOracleDatum :: TxOut -> TxInfo -> Maybe Integer
parseOracleDatum o info = case txOutDatum o of
    NoOutputDatum -> Nothing
    OutputDatum (Datum d) -> PlutusTx.fromBuiltinData d
    OutputDatumHash dh -> do
                        Datum d <- findDatum dh info
                        PlutusTx.fromBuiltinData d



data OracleParams = OracleParams
    { oNFT        :: AssetClass
    , oOperator   :: PubKeyHash
    } 
PlutusTx.makeLift ''OracleParams

data OracleRedeemer = Update | Delete
    deriving Prelude.Show
PlutusTx.unstableMakeIsData ''OracleRedeemer

-- Oracle Datum
type Rate = Integer

{-# INLINABLE mkValidator #-}
mkValidator :: OracleParams -> Rate -> OracleRedeemer -> ScriptContext -> Bool
mkValidator oracle _ r ctx =
    case r of
        Update -> traceIfFalse "token missing from input"   inputHasToken  &&
                  traceIfFalse "token missing from output"  outputHasToken &&
                  traceIfFalse "operator signature missing" checkOperatorSignature &&
                  traceIfFalse "invalid output datum"       validOutputDatum
        Delete -> traceIfFalse "operator signature missing" checkOperatorSignature

  where
    info :: TxInfo
    info = scriptContextTxInfo ctx

    -- | Check that the 'oracle' is signed by the 'oOperator'.
    checkOperatorSignature :: Bool
    checkOperatorSignature = txSignedBy info $ oOperator oracle

    -- | Find the oracle input.
    ownInput :: TxOut
    ownInput = case findOwnInput ctx of
        Nothing -> traceError "oracle input missing"
        Just i  -> txInInfoResolved i

    -- Check that the oracle input contains the NFT.
    inputHasToken :: Bool
    inputHasToken = assetClassValueOf (txOutValue ownInput) (oNFT oracle) == 1

    -- | Find the oracle output.
    ownOutput :: TxOut
    ownOutput = case getContinuingOutputs ctx of
        [o] -> o
        _   -> traceError "expected exactly one oracle output"

    -- Check that the oracle output contains the NFT.
    outputHasToken :: Bool
    outputHasToken = assetClassValueOf (txOutValue ownOutput) (oNFT oracle) == 1

    -- Check that the oracle output contains a valid datum.
    validOutputDatum :: Bool
    validOutputDatum = isJust $ parseOracleDatum ownOutput info





{-# INLINABLE  mkWrappedValidator #-}
mkWrappedValidator :: OracleParams -> BuiltinData -> BuiltinData -> BuiltinData -> ()
mkWrappedValidator = wrapValidator . mkValidator


validator :: OracleParams -> Validator
validator oracle = mkValidatorScript $
    $$(PlutusTx.compile [|| mkWrappedValidator ||])
    \`PlutusTx.applyCode\`
    PlutusTx.liftCode oracle


{-# INLINABLE  mkWrappedValidatorLucid #-}
--                            CS              TN           operator        rate          redeemer       context
mkWrappedValidatorLucid :: BuiltinData ->  BuiltinData -> BuiltinData -> BuiltinData -> BuiltinData -> BuiltinData -> ()
mkWrappedValidatorLucid cs tn pkh = wrapValidator $ mkValidator op
    where
        op = OracleParams
            { oNFT = AssetClass (unsafeFromBuiltinData cs, unsafeFromBuiltinData tn)
            , oOperator   = unsafeFromBuiltinData pkh
            }

validatorCode :: CompiledCode (BuiltinData -> BuiltinData -> BuiltinData -> BuiltinData -> BuiltinData -> BuiltinData -> ())
validatorCode = $$( compile [|| mkWrappedValidatorLucid ||])



saveOracleCode :: IO ()
saveOracleCode = writeCodeToFile "assets/oracle.plutus" validatorCode

saveOracleScript :: String -> PubKeyHash -> IO ()
saveOracleScript symbol pkh = do
    let
    writeValidatorToFile fp $ validator op
    where
        op = OracleParams
            { oNFT= parseToken symbol
            , oOperator   = pkh
            }
        fp = printf "assets/oracle-%s-%s.plutus" (take 3 (show pkh)) $ take 3 (show pkh)

parseToken :: String -> AssetClass
parseToken s =
  let
    (x, y) = span (Prelude./= '.') s
  in
    AssetClass (fromString x, fromString $ tail y)
`;

  const cliCommands = ` $ cardano-cli conway address build \\
  --payment-script-file oracle.plutus \\
  --testnet-magic 2 \\
  --out-file oracle.addr
 $ cat > oracle-datum.json <<EOF
{
  "int": 2500000
}
EOF
 $ cardano-cli query utxo \\
  --address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca \\
  --testnet-magic 2
                           TxHash                                 TxIx        Amount
--------------------------------------------------------------------------------------
4f7519e36bc8c46ffe1d0702f65d1281402e5d4c986c2b0df501b2b01a23be6e     0        1406287 lovelace + 1 a9b9d196bb9628851e4736b4906bb984da653b530fc5902c7fab80bc.46524545 + TxOutDatumNone
a8fce103991a63b25e1dae90346c3441d96b570815532a0341a3d50845852a2f     0        1202733 lovelace + TxOutDatumNone
ee0e0c41816f482611546754c79c82ccb12ba0e2917a270ffe50258934df6a06     0        9951853928 lovelace + 1 79dc2cb93b706af32fe1ef3b3fb014b98ef83be6b5c1a0c6e9aa8f83.46524545 + 1 a9b9d196bb9628851e4736b4906bb984da653b530fc5902c7fab80bc.42414431 + 3 a9b9d196bb9628851e4736b4906bb984da653b530fc5902c7fab80bc.46524545 + 1 a9b9d196bb9628851e4736b4906bb984da653b530fc5902c7fab80bc.4e465431 + 1 f0d624fb0e1e34f91911e5a182f5ae0282518cbfac823b667ef50b97.434f4c4c + TxOutDatumNone
f5b4345ea271c03fe241f1914eacbd76e39f1f110eec8072c3d482dadf22d768     1        2652510 lovelace + TxOutDatumNone
 $ export TXIN_ORACLE=ee0e0c41816f482611546754c79c82ccb12ba0e2917a270ffe50258934df6a06#0
 $ cardano-cli conway transaction build \\
  --tx-in $TXIN_ORACLE \\
  --tx-out "$(cat oracle.addr)+3000000" \\
  --tx-out-inline-datum-file oracle-datum.json \\
  --change-address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca \\
  --testnet-magic 2 \\
  --out-file oracle-lock.tx
Estimated transaction fee: 176325 Lovelace
 $ cardano-cli conway transaction sign \\
  --tx-body-file oracle-lock.tx \\
  --signing-key-file ../../../keys/payment.skey \\
  --testnet-magic 2 \
  --out-file oracle-lock.signed
 $ cardano-cli conway transaction submit \\
  --tx-file oracle-lock.signed \\
  --testnet-magic 2
Transaction successfully submitted.
 $ cardano-cli query utxo   --address addr_test1vpxhkpyw4whhwkdfylwa3mlmg3m9xgn5fn8cmae024vnw6qntajca   --testnet-magic 2
                           TxHash                                 TxIx        Amount
--------------------------------------------------------------------------------------
4f7519e36bc8c46ffe1d0702f65d1281402e5d4c986c2b0df501b2b01a23be6e     0        1406287 lovelace + 1 a9b9d196bb9628851e4736b4906bb984da653b530fc5902c7fab80bc.46524545 + TxOutDatumNone
75e3f20b50059670e47f2c0c08a78ddb0a22afc0a37ae5a7d226603321286619     1        9948677603 lovelace + 1 79dc2cb93b706af32fe1ef3b3fb014b98ef83be6b5c1a0c6e9aa8f83.46524545 + 1 a9b9d196bb9628851e4736b4906bb984da653b530fc5902c7fab80bc.42414431 + 3 a9b9d196bb9628851e4736b4906bb984da653b530fc5902c7fab80bc.46524545 + 1 a9b9d196bb9628851e4736b4906bb984da653b530fc5902c7fab80bc.4e465431 + 1 f0d624fb0e1e34f91911e5a182f5ae0282518cbfac823b667ef50b97.434f4c4c + TxOutDatumNone
a8fce103991a63b25e1dae90346c3441d96b570815532a0341a3d50845852a2f     0        1202733 lovelace + TxOutDatumNone
f5b4345ea271c03fe241f1914eacbd76e39f1f110eec8072c3d482dadf22d768     1        2652510 lovelace + TxOutDatumNone
 



`;

  return (
    <div className="article-content">

      <h2 id="introduction">Introduction</h2>
      <p>
        The <strong>Oracle</strong> contract is a real DeFi primitive used to
        publish trusted off-chain data (like prices) onto the Cardano blockchain.
        Unlike simple validators, this script enforces <strong>state continuity</strong>,
        <strong>operator authorization</strong>, and <strong>NFT-based identity</strong>.
      </p>

      <CodeBlock
        code={haskellCode}
        language="haskell"
        filename="Oracle.hs"
      />

      <h2>Core Idea</h2>
      <p className="pexplaination">
        This oracle is represented by a <strong>single UTxO</strong> that:
      </p>
      <ul className="list-disc pl-6">
        <li>Always holds a unique NFT</li>
        <li>Stores the latest rate in its datum</li>
        <li>Can only be updated by the operator</li>
      </ul>

      <h2>Oracle Parameters</h2>
      <p className="pexplaination">
        The validator is parameterized with:
      </p>
      <ul className="list-disc pl-6">
        <li><strong>oNFT</strong> — identifies the oracle UTxO</li>
        <li><strong>oOperator</strong> — allowed signer</li>
      </ul>

      <h2>Redeemer Logic</h2>
      <p className="pexplaination">
        Two actions are supported:
      </p>
      <ul className="list-disc pl-6">
        <li>
          <strong>Update</strong> — replaces the datum while preserving the NFT
        </li>
        <li>
          <strong>Delete</strong> — removes the oracle permanently
        </li>
      </ul>

      <h2>Why the NFT Matters</h2>
      <p className="pexplaination">
        The NFT guarantees uniqueness. Even if someone copies the script,
        they cannot impersonate the oracle because they don’t own the NFT.
        This prevents fake oracle updates.
      </p>

      <h2>Execution</h2>
      <CodeBlock
        code={cliCommands}
        language="bash"
        filename="Oracle Execution (Testnet)"
      />

      <h2>Result</h2>
      <p className="pexplaination text-green-700 font-semibold">
        ✅ Oracle UTxO successfully created
      </p>
      <p className="pexplaination">
        The oracle UTxO now exists on-chain with an inline datum representing
        the current price. Only the operator can update or delete it.
      </p>

      <h2>Summary</h2>
      <p>
        This oracle validator demonstrates how to safely maintain mutable
        on-chain state in Cardano using UTxOs, NFTs, and signatures. It is
        a foundational building block for lending protocols, stablecoins,
        and DEX price feeds.
      </p>

      <p className="pexplaination font-semibold">
        If you understand this contract, you understand real DeFi on Cardano.
      </p>
      <br />
            
      <p className="pexplaination">
        You can verify the transaction and UTxO details on{" "}
        <a
          href="https://preview.cardanoscan.io/transaction/75e3f20b50059670e47f2c0c08a78ddb0a22afc0a37ae5a7d226603321286619?tab=utxo"
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
