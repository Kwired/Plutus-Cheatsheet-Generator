import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "expiration-validator",
    title: "Expiration Validator",
    subtitle: "A contract that expires and locks funds permanently after a deadline",
    date: "2025-02-17T10:00:00.000Z",
    readTime: "5 min read",
    tags: ["plutus", "cardano", "validator", "time", "basics"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=7",
    },
};

export default function ExpirationValidatorArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module ExpirationValidator where

import qualified Plutus.V2.Ledger.Api as PlutusV2
import           PlutusTx             (BuiltinData, compile)
import           PlutusTx.Prelude     (Bool, traceIfFalse, ($))
import           Plutus.V1.Ledger.Interval (contains, to)
import           Prelude              (IO)
import           Utilities            (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

-- The Datum explicitly stores the POSIXTime (milliseconds since 1970) of our expiration.

{-# INLINABLE mkExpirationVal #-}
mkExpirationVal :: PlutusV2.POSIXTime -> () -> PlutusV2.ScriptContext -> Bool
mkExpirationVal expiration () ctx =
    traceIfFalse "This contract has expired!" notExpired
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    -- We check if the transaction's valid range fits entirely within 
    -- the interval from the beginning of time up 'to' our expiration date.
    notExpired :: Bool
    notExpired = contains (to expiration) (PlutusV2.txInfoValidRange info)

{-# INLINABLE wrappedMkVal #-}
wrappedMkVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedMkVal = wrapValidator mkExpirationVal

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrappedMkVal ||])

---------------------------------------------------------------------------------------------------
------------------------------------- HELPER FUNCTIONS --------------------------------------------

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/expiration.plutus" validator
`;

    const bashCommands = `# 1. Lock ADA at the contract address with the expiration stored in the datum.
# Let's say our POSIX expiration is 1735689600000 (Jan 1, 2025).
$ cardano-cli conway transaction build \\
  --tx-in dummy_tx_hash_uuid_here_1111111111111111#0 \\
  --tx-out $(cat expiration.addr)+10000000 \\
  --tx-out-inline-datum-value '{"int": 1735689600000}' \\
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

# 2. Attempt to spend the funds BEFORE it expires.
# CRITICAL: If you don't specify an --invalid-hereafter slot, the Plutus script 
# will assume the transaction is valid forever, and the \`notExpired\` check 
# will fail because infinity is greater than our expiration date!

# First, find a slot number representing exactly right now + 5 minutes.
# Let's assume the expiration slot is 55000000 and we are at 50000000.
$ cardano-cli conway transaction build \\
  --tx-in dummy_tx_hash_uuid_here_2222222222222222#0 \\
  --tx-in-script-file expiration.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor": 0, "fields": []}' \\
  --tx-out addr_test1_dummy_receiver_address_here+8000000 \\
  --invalid-hereafter 55000000 \\
  --tx-in-collateral dummy_collateral_hash_uuid_here_33333333#0 \\
  --change-address addr_test1_dummy_address_here \\
  --testnet-magic 2 \\
  --out-file tx-spend.raw

$ cardano-cli conway transaction sign \\
  --tx-body-file tx-spend.raw \\
  --signing-key-file ../../../keys/payment.skey \\
  --testnet-magic 2 \\
  --out-file tx-spend.signed

$ cardano-cli conway transaction submit --tx-file tx-spend.signed
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                The <strong>Expiration Validator</strong> is the exact opposite of the Deadline Validator.
                Instead of keeping funds locked <em>until</em> a certain date, this contract keeps funds
                available <em>only until a certain date</em>.
            </p>

            <p>
                Once the expiration date passes, the UTxO is permanently "bricked" and the funds
                can never be recovered by anyone. This is a crucial primitive for Flash Sales,
                Limited Time Bounties, and Escrows that have clawback periods.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="ExpirationValidator.hs"
            />
            <br />

            <h2 id="explanation">How It Really Works</h2>

            <h3>The Interval Check</h3>

            <p className="pexplaination">
                In the Deadline validator, we used <code>from deadline</code>. Here, we use
                the inverse: <code>to expiration</code>.
            </p>

            <CodeBlock
                code={`contains (to expiration) (PlutusV2.txInfoValidRange info)`}
                language="haskell"
                filename="Interval Checking"
            />

            <p className="pexplaination">
                This creates an interval extending from the very beginning of the blockchain up
                until your chosen expiration millisecond. For the transaction to succeed, the
                entire transaction validity period submitted by the user must fit inside this
                window.
            </p>

            <br />

            <h2 id="execution">Execution Lifecycle</h2>

            <p className="pexplaination">
                When running this via the `cardano-cli`, you are responsible for defining the
                upper bounds of the transaction using the <code>--invalid-hereafter</code> flag.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Expiration CLI Commands"
            />

            <h3>The Infinite Future Trap</h3>

            <p className="pexplaination pt-2">
                If you forget to include the <code>--invalid-hereafter</code> flag in your spend
                transaction, the Cardano Node assumes the transaction is valid into the infinite future.
                Because infinity is much larger than your expiration date, the <code>contains</code>
                check will evaluate to False, and the validator will reject your request even if you
                are submitting it early!
            </p>

        </div>
    );
}
