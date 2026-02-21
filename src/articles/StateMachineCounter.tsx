/* eslint-disable react-refresh/only-export-components */
import CodeBlock from "@/components/layouts/CodeBlock";
// import React from "react";

// Article metadata
export const articleMeta = {
    id: "state-machine-counter",
    title: "State Machine (Simple Counter)",
    subtitle: "A stateful Plutus contract enforcing sequential counter increments",
    date: "2025-01-22T10:00:00.000Z",
    readTime: "8 min read",
    tags: ["plutus", "cardano", "validator", "state-machine", "advanced"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=4"},
  plutusVersion: "V2",
  complexity: "Advanced",
  useCase: "NFTs"
};

export default function StateMachineCounterArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module StateMachineCounter where

import qualified Plutus.V2.Ledger.Api      as PlutusV2
import           Plutus.V2.Ledger.Contexts (getContinuingOutputs)
import           PlutusTx                  (BuiltinData, compile, fromBuiltinData)
import           PlutusTx.Prelude          (Bool (False), traceIfFalse, ($), (+), (==))
import           Prelude                   (IO)
import           Utilities                 (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

-- The Datum is our State: an Integer representing the current counter.
-- The Redeemer is our Action: we use () simply to mean "Increment".
-- Real state machines will have complex Datums and multiple Redeemer actions.

{-# INLINABLE mkCounterValidator #-}
mkCounterValidator :: Integer -> () -> PlutusV2.ScriptContext -> Bool
mkCounterValidator currentCount () ctx =
  traceIfFalse "State transition failed (wrong output or count)" checkStateTransition
  where
    -- To verify a state transition, we must ensure the script output back to itself
    -- contains the correctly updated state (currentCount + 1).
    checkStateTransition :: Bool
    checkStateTransition = case getContinuingOutputs ctx of
      -- We enforce exactly ONE output goes back to this script
      [output] -> case PlutusV2.txOutDatum output of
        PlutusV2.OutputDatum (PlutusV2.Datum rawDatum) ->
          case fromBuiltinData rawDatum of
            Just nextCount -> nextCount == currentCount + 1
            Nothing        -> False
        _ -> False -- Rejects if datum is missing or just a hash (we require inline datum)
      _ -> False   -- Rejects if zero or multiple outputs go to the script

{-# INLINABLE wrappedMkVal #-}
wrappedMkVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedMkVal = wrapValidator mkCounterValidator

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrappedMkVal ||])

---------------------------------------------------------------------------------------------------
------------------------------------- HELPER FUNCTIONS --------------------------------------------

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/statemachine.plutus" validator
`;

    const executionCommands = `# 1. Lock ADA and Initialize the State Machine Counter at datum "0"
$ cardano-cli conway transaction build \\
  --tx-in dummy_tx_hash_uuid_here_1111111111111111#0 \\
  --tx-out $(cat statemachine.addr)+5000000 \\
  --tx-out-inline-datum-value '{"int": 0}' \\
  --change-address addr_test1_dummy_address_here \\
  --testnet-magic 2 \\
  --out-file tx-init-state.raw

$ cardano-cli conway transaction sign \\
  --tx-body-file tx-init-state.raw \\
  --signing-key-file ../../../keys/payment.skey \\
  --testnet-magic 2 \\
  --out-file tx-init-state.signed

$ cardano-cli conway transaction submit --tx-file tx-init-state.signed

# 2. Transition the State Machine: Spend the "0" state and output the "1" state
# Note: We must both use the Script as an input AND pay back to the Script as an output
$ cardano-cli conway transaction build \\
  --tx-in dummy_tx_hash_uuid_here_2222222222222222#0 \\
  --tx-in-script-file statemachine.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor": 0, "fields": []}' \\
  --tx-out $(cat statemachine.addr)+4500000 \\
  --tx-out-inline-datum-value '{"int": 1}' \\
  --tx-in-collateral dummy_collateral_hash_uuid_here_3333333#0 \\
  --change-address addr_test1_dummy_address_here \\
  --testnet-magic 2 \\
  --out-file tx-increment-state.raw

Estimated transaction fee: 184512 Lovelace

$ cardano-cli conway transaction sign \\
  --tx-body-file tx-increment-state.raw \\
  --signing-key-file ../../../keys/payment.skey \\
  --testnet-magic 2 \\
  --out-file tx-increment-state.signed

$ cardano-cli conway transaction submit --tx-file tx-increment-state.signed
Transaction successfully submitted.
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                The <strong>State Machine (Simple Counter)</strong> demonstrates how to build
                applications on Cardano that need to track and update data over time. Because
                Cardano uses the UTxO model, "updating state" actually means <em>consuming</em>
                the old state UTxO and <em>creating</em> a new UTxO with the updated data.
            </p>

            <p>
                This validator acts as a simple counter. It starts at <code>0</code>, and
                every time a transaction interacts with it, it enforces that the new output
                datum must be exactly exactly <code>current value + 1</code>.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="StateMachineCounter.hs"
            />
            <br />

            <h2 id="explanation">Explanation</h2>

            <h3>The State Machine Pattern</h3>

            <p className="pexplaination">
                In Plutus, a state machine is enforced by looking at the transaction context
                (<code>PlutusV2.ScriptContext</code>). The validator must prove that the
                transaction creates a specific output back to the exact same script address.
            </p>

            <CodeBlock
                code={`checkStateTransition = case getContinuingOutputs ctx of
  [output] -> case PlutusV2.txOutDatum output of
    PlutusV2.OutputDatum (PlutusV2.Datum rawDatum) -> ...`}
                language="haskell"
                filename="Continuous Output Check"
            />

            <p className="pexplaination">
                We use <code>getContinuingOutputs</code> to find all outputs that are
                going back to the script. We pattern match on <code>[output]</code> to
                ensure there is <strong>exactly one</strong> continuing output. If
                an attacker tries to split the state into two UTxOs or drain the funds,
                the pattern match fails and the transaction is rejected.
            </p>

            <h3>Parsing the New State</h3>

            <p className="pexplaination">
                Once we isolate the continuing output, we extract its <code>txOutDatum</code>.
                Since we expect an inline datum, we pattern match on <code>OutputDatum</code>.
                Finally, <code>fromBuiltinData</code> attempts to decode the raw bytes
                back into an <code>Integer</code>.
            </p>

            <p className="pexplaination">
                The core business logic is simply <code>nextCount == currentCount + 1</code>.
                If the user tries to increment by 2, or reset the counter, this equation
                will be False and the ledger will reject the transaction.
            </p>

            <br />

            <h2 id="execution">Execution Lifecycle</h2>

            <p className="pexplaination">
                Interacting with a state machine via the CLI requires careful construction
                of the transaction, as we are essentially threading the state from the input
                side of the transaction to the output side.
            </p>

            <CodeBlock
                code={executionCommands}
                language="bash"
                filename="State Machine Execution (Testnet)"
            />

            <h3>Threading the Datum</h3>

            <p className="pexplaination">
                Notice in the second transaction we have both an input and an output
                interacting with the contract:
            </p>

            <ul className="list-disc ml-6 mt-2 mb-4">
                <li><code>--tx-in-script-file</code> consumes the old state.</li>
                <li><code>--tx-out</code> pays the remaining lovelace back to the script.</li>
                <li><code>--tx-out-inline-datum-value '{`{"int": 1}`}'</code> creates the new state.</li>
            </ul>

            <p className="pexplaination">
                If we accidentally set the new output value to <code>{`{"int": 5}`}</code>,
                the script evaluation would fail before the transaction even hits the mempool.
            </p>

            <br />
            <h2 id="summary">Summary</h2>

            <p>
                This simple counter represents the foundation of almost all complex decentralized
                applications on Cardano. Oracles, automated market makers (AMMs), gaming
                ledgers, and governance protocols all use this exact continuing-output pattern
                to securely thread state across the blockchain!
            </p>

        </div>
    );
}
