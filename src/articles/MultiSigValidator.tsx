/* eslint-disable react-refresh/only-export-components */
import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "multisig-validator",
    title: "Multi-Sig (M of N) Validator",
    subtitle: "Require signatures from at least M out of N specified PubKeyHashes",
    date: "2025-02-19T10:00:00.000Z",
    readTime: "7 min read",
    tags: ["plutus", "cardano", "validator", "security", "multi-sig"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=9"},
  plutusVersion: "V2",
  complexity: "Advanced",
  useCase: "NFTs"

};

export default function MultiSigValidatorArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module MultiSigValidator where

import qualified Plutus.V2.Ledger.Api as PlutusV2
import           PlutusTx             (BuiltinData, compile, unstableMakeIsData)
import           PlutusTx.Prelude     (Bool, Integer, traceIfFalse, length, filter, (>=), (==), map, ($))
import           Prelude              (IO)
import           Utilities            (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

-- The Datum explicitly stores exactly who is allowed to sign (N list)
-- and how many of them are required to sign (M threshold).
data MultiSigDatum = MultiSigDatum
    { requiredSignatures :: Integer
    , authorizedSigners  :: [PlutusV2.PubKeyHash]
    }
PlutusTx.unstableMakeIsData ''MultiSigDatum

{-# INLINABLE mkMultiSigVal #-}
mkMultiSigVal :: MultiSigDatum -> () -> PlutusV2.ScriptContext -> Bool
mkMultiSigVal dat () ctx =
    traceIfFalse "Not enough valid signatures provided!" hasEnoughSignatures
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    -- A small helper function that checks if a specific PubKeyHash signed the Tx.
    hasSigned :: PlutusV2.PubKeyHash -> Bool
    hasSigned pkh = PlutusV2.txSignedBy info pkh

    -- We filter the list of authorized signers down to only those who ACTUALLY signed.
    -- Then we count them using \`length\`.
    actualSignersCount :: Integer
    actualSignersCount = length (filter hasSigned (authorizedSigners dat))

    -- Finally, we ensure the number of valid signers is >= the threshold M.
    hasEnoughSignatures :: Bool
    hasEnoughSignatures = actualSignersCount >= requiredSignatures dat

{-# INLINABLE wrappedMkVal #-}
wrappedMkVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedMkVal = wrapValidator mkMultiSigVal

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrappedMkVal ||])

---------------------------------------------------------------------------------------------------
------------------------------------- HELPER FUNCTIONS --------------------------------------------

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/multisig.plutus" validator
`;

    const bashCommands = `# 1. Lock ADA at the contract address.
# The Datum requires 2 out of 3 authorized signers to unlock.
# JSON Representation: {"constructor": 0, "fields": [{"int": 2}, {"list": [{"bytes": "hash1..."}, {"bytes": "hash2..."}, {"bytes": "hash3..."}]}]}
$ cardano-cli conway transaction build \\
  --tx-in b5e2bb65a1098003f5c61503a4b9e12cc8498e289f34054028e1827a892e362b#0 \\
  --tx-out $(cat multisig.addr)+10000000 \\
  --tx-out-inline-datum-file datum.json \\
  --change-address addr_test1hwrcegvj0fdezvj3u3ajzd8q0c45rur88pke35xcd9j3tzaww73sl \\
  --testnet-magic 2 \\
  --out-file tx-lock.raw

$ cardano-cli conway transaction sign \\
  --tx-body-file tx-lock.raw \\
  --signing-key-file ../../../keys/payment.skey \\
  --testnet-magic 2 \\
  --out-file tx-lock.signed

$ cardano-cli conway transaction submit --tx-file tx-lock.signed

-------------------------------------------------------------------------

# 2. Spend the funds by providing at least 2 requisite signatures!
# We must explicitly add the --required-signer-hash flags so the node knows 
# those cryptographic signatures must be included in the final signed transaction.
$ cardano-cli conway transaction build \\
  --tx-in e24da7c416a67e0bf550924aa83977efc3285c5ea9ab0da8c164315166902b18#0 \\
  --tx-in-script-file multisig.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor": 0, "fields": []}' \\
  --tx-out addr_test1xqx8gdk5px30w5edkefgazhfsw3p8rjszkf5cemyrr73re7l7yxgw+8000000 \\
  --required-signer-hash 46978de71810b0428f3c6f6c5f8b14594fc109b33d21bb495efb1c45f6514419 \\
  --required-signer-hash 2bb60a5568a9e5b38ea8826cada4e3a155586d64bdc782de62e83f6d305715b4 \\
  --tx-in-collateral 5aef6796da8c0e398d4d1a831b816f35b7d22ff28db92070306465abc523a4fa#0 \\
  --change-address addr_test1kd4ys7y0zqelwzg8fg9glcgy6da6z2cphfk629j6kqlqgg2j2c5nq \\
  --testnet-magic 2 \\
  --out-file tx-spend.raw

# Sign the transaction with Both Keys!
$ cardano-cli conway transaction sign \\
  --tx-body-file tx-spend.raw \\
  --signing-key-file ../../../keys/participant1.skey \\
  --signing-key-file ../../../keys/participant2.skey \\
  --testnet-magic 2 \\
  --out-file tx-spend.signed

$ cardano-cli conway transaction submit --tx-file tx-spend.signed
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                Cardano supports simple multi-sig natively, but building it in Plutus unlocks dynamic logic formatting for complex DAO or treasury vaults.
            </p>

            <p>
                The <strong>M of N Multi-Sig</strong> script locks funds until a subset of authorized actors provides their signatures (e.g. 3-out-of-5 board members).
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="MultiSigValidator.hs"
            />
            <br />

            <h2 id="explanation">How It Works</h2>

            <h3>The Datum as Configuration</h3>

            <p className="pexplaination">
                Hardcoding public keys into the Haskell file is a bad idea because it requires recompiling the script per change. We offload configuration strictly into the Datum.
            </p>

            <CodeBlock
                code={`data MultiSigDatum = MultiSigDatum
    { requiredSignatures :: Integer
    , authorizedSigners  :: [PlutusV2.PubKeyHash]
    }`}
                language="haskell"
                filename="Dynamic Configuration"
            />

            <p className="pexplaination">
                This approach makes the contract stateless and reusable. Users can define arbitrary M-of-N rules dynamically during the lock transaction.
            </p>

            <h3>Counting the Signatures</h3>

            <p className="pexplaination">
                Plutus iterates functionally: <code>length (filter hasSigned authorizedSigners)</code>. <br /><br />
                We filter the authorized list down to actors returning True on <code>txSignedBy</code>, and check if the total length meets the threshold.
            </p>

            <br />

            <h2 id="execution">Execution Lifecycle</h2>

            <p className="pexplaination">
                When interacting via CLI, the critical step is manually appending signature hashes.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Multi-Sig CLI Commands"
            />

            <h3>Required Signer Hashes</h3>

            <p className="pexplaination pt-2">
                Plutus scripts don't automatically sniff out signatures. If you omit the <code>--required-signer-hash</code> flag, <code>txSignedBy</code> defaults to False and the script fails, even if you tack on signatures during signing later.
            </p>

        </div>
    );
}
