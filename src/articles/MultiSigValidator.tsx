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
  --tx-in dummy_tx_hash_uuid_here_1111111111111111#0 \\
  --tx-out $(cat multisig.addr)+10000000 \\
  --tx-out-inline-datum-file datum.json \\
  --change-address addr_test1_dummy_address_here \\
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
  --tx-in dummy_tx_hash_uuid_here_2222222222222222#0 \\
  --tx-in-script-file multisig.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor": 0, "fields": []}' \\
  --tx-out addr_test1_dummy_receiver_address_here+8000000 \\
  --required-signer-hash dummy_pubkey_hash_111111111111111111111111 \\
  --required-signer-hash dummy_pubkey_hash_222222222222222222222222 \\
  --tx-in-collateral dummy_collateral_hash_uuid_here_33333333#0 \\
  --change-address addr_test1_dummy_address_here \\
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
                Multi-signature (Multi-Sig) wallets are a foundation of corporate treasury
                management and decentralized autonomous organizations (DAOs). While Cardano
                supports simple multi-sig natively via Native Scripts, implementing it in
                Plutus allows for far more dynamic logic.
            </p>

            <p>
                The <strong>M of N Multi-Sig Validator</strong> locks funds and requires that
                a sub-committee of authorized users sign off before the funds can move. For
                example, a corporate board might authorize 5 signers, but any 3 of them are
                sufficient to execute a transaction.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="MultiSigValidator.hs"
            />
            <br />

            <h2 id="explanation">How It Really Works</h2>

            <h3>The Datum as Configuration</h3>

            <p className="pexplaination">
                Instead of hardcoding the authorized public keys directly into the Haskell
                contract (which would require recompiling and deploying a new script every
                time a board member changed), we define the configuration in the Datum!
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
                This makes the contract highly reusable. Anyone can use the exact same compiled
                Plutus script to create their own 2-of-3, 5-of-9, or 99-of-100 multisig vault
                simply by changing the JSON datum when they lock the funds.
            </p>

            <h3>Counting the Signatures</h3>

            <p className="pexplaination">
                In Plutus, we can't easily iterate using <code>for</code> loops like in Java.
                Instead, we use functional mapping and filtering:
                <code>length (filter hasSigned authorizedSigners)</code>. <br /><br />
                This line filters the authorized list down to only those whose
                <code>txSignedBy</code> check evaluates to True, and then counts the final
                number of elements in that remaining list. If the count is greater than or
                equal to the <code>requiredSignatures</code>, the contract unlocks.
            </p>

            <br />

            <h2 id="execution">Execution Lifecycle</h2>

            <p className="pexplaination">
                When running this via the `cardano-cli`, the most critical step is ensuring
                the node asks for the signatures when building the transaction.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Multi-Sig CLI Commands"
            />

            <h3>Required Signer Hashes</h3>

            <p className="pexplaination pt-2">
                Plutus scripts do not automatically know who signed a transaction. You must
                explicitly declare your intent to sign the transaction when building it by using
                the <code>--required-signer-hash</code> flags. If you omit those flags, the
                Plutus script's <code>txSignedBy</code> function will immediately return False
                for everyone, even if you try to attach the signatures later!
            </p>

        </div>
    );
}
