import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "deadline-validator",
    title: "Deadline Validator",
    subtitle: "Time-lock funds so they can only be spent AFTER a certain time",
    date: "2025-02-16T10:00:00.000Z",
    readTime: "6 min read",
    tags: ["plutus", "cardano", "validator", "time", "basics"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=6",
    },
};

export default function DeadlineValidatorArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module DeadlineValidator where

import qualified Plutus.V2.Ledger.Api as PlutusV2
import           PlutusTx             (BuiltinData, compile)
import           PlutusTx.Prelude     (Bool, traceIfFalse, ($))
import           Plutus.V1.Ledger.Interval (contains, from)
import           Prelude              (IO)
import           Utilities            (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

-- The Datum explicitly stores the POSIXTime (milliseconds since 1970) of our deadline.
-- The Redeemer is ignored in this simple example.

{-# INLINABLE mkDeadlineVal #-}
mkDeadlineVal :: PlutusV2.POSIXTime -> () -> PlutusV2.ScriptContext -> Bool
mkDeadlineVal deadline () ctx =
    traceIfFalse "Deadline not yet reached!" deadlineReached
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    -- A transaction on Cardano is valid for a specific "range" of time (ValidRange).
    -- We check if the infinite interval starting from our \`deadline\` is fully 
    -- contained within that transaction's valid range.
    deadlineReached :: Bool
    deadlineReached = contains (from deadline) (PlutusV2.txInfoValidRange info)

{-# INLINABLE wrappedMkVal #-}
wrappedMkVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedMkVal = wrapValidator mkDeadlineVal

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrappedMkVal ||])

---------------------------------------------------------------------------------------------------
------------------------------------- HELPER FUNCTIONS --------------------------------------------

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/deadline.plutus" validator
`;

    const bashCommands = `# 1. Lock ADA at the contract address with the deadline stored in the datum.
# Let's say our POSIX deadline is 1735689600000 (Jan 1, 2025).
$ cardano-cli conway transaction build \\
  --tx-in dummy_tx_hash_uuid_here_1111111111111111#0 \\
  --tx-out $(cat deadline.addr)+10000000 \\
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

# 2. Attempt to spend the funds. 
# CRITICAL: If you don't specify an --invalid-before slot, the Plutus script 
# will assume the transaction started at the beginning of time, and the 
# \`deadlineReached\` check will immediately fail!

# First, find the current slot for your network (e.g. Preview Testnet).
# Let's assume the current slot is 50000000.
$ cardano-cli conway transaction build \\
  --tx-in dummy_tx_hash_uuid_here_2222222222222222#0 \\
  --tx-in-script-file deadline.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor": 0, "fields": []}' \\
  --tx-out addr_test1_dummy_receiver_address_here+8000000 \\
  --invalid-before 50000000 \\
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
Transaction successfully submitted.
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                Time is a tricky concept in decentralized systems. Because transactions can sit in
                network mempools for unpredictable amounts of time before being minted into blocks,
                smart contracts cannot ask "What time is it right now?"
            </p>

            <p>
                Instead, Cardano uses strict <strong>Validity Intervals</strong>. When you build a
                transaction, you specify the lowest bounds and highest bounds of time when this
                transaction is "valid." The Plutus script simply checks if those bounds satisfy
                its internal rules.
            </p>

            <p>
                The <strong>Deadline Validator</strong> is a simple script that locks funds until
                a specific time has passed (often used in Vesting contracts or voting systems).
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="DeadlineValidator.hs"
            />
            <br />

            <h2 id="explanation">How It Works</h2>

            <h3>The Interval Concept</h3>

            <p className="pexplaination">
                In Plutus, <code>from deadline</code> creates an infinite interval of time starting
                at your target `deadline` and going on forever into the future.
            </p>

            <CodeBlock
                code={`contains (from deadline) (PlutusV2.txInfoValidRange info)`}
                language="haskell"
                filename="Interval Checking"
            />

            <p className="pexplaination">
                When the transaction is built, the user provides a "Valid Range" (e.g., from tomorrow
                at noon to tomorrow at 5PM). The Plutus <code>contains</code> function checks if
                that user-provided transaction interval fits entirely inside the script's required
                infinite interval.
            </p>

            <p className="pexplaination pt-2">
                If the user tries to submit the transaction <em>before</em> the deadline, the
                transaction's valid range will not fit entirely inside the infinite future interval,
                and the script will reject it.
            </p>

            <br />

            <h2 id="execution">Execution Lifecycle</h2>

            <p className="pexplaination">
                When running this via the `cardano-cli`, you are responsible for defining the
                validity interval using slots.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Deadline CLI Commands"
            />

            <h3>The Missing Parameter Trap</h3>

            <p className="pexplaination pt-2">
                If you forget to include the <code>--invalid-before</code> flag in your spend
                transaction, the Cardano Node assumes the transaction is valid from the very
                genesis of the blockchain (Time 0). When your Plutus script checks if Time 0
                is strictly after your 2025 deadline, it will automatically fail!
            </p>

        </div>
    );
}
