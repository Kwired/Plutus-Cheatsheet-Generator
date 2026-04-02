import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "math-puzzle-validator",
    title: "Math Puzzle Validator",
    subtitle: "Users must solve a mathematical equation to unlock the ADA",
    date: "2025-02-18T10:00:00.000Z",
    readTime: "5 min read",
    tags: ["plutus", "cardano", "validator", "basics", "fun"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=8",
    },
};

export default function MathPuzzleValidatorArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module MathPuzzleValidator where

import qualified Plutus.V2.Ledger.Api as PlutusV2
import           PlutusTx             (BuiltinData, compile, unstableMakeIsData)
import           PlutusTx.Prelude     (Bool, traceIfFalse, (*), (==), ($))
import           Prelude              (IO)
import           Utilities            (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

-- The Datum is the target number we are trying to reach.
-- The Redeemer brings the two numbers we think multiply together to equal the target.

data MathRedeemer = MathRedeemer
    { factor1 :: Integer
    , factor2 :: Integer
    }
PlutusTx.unstableMakeIsData ''MathRedeemer

{-# INLINABLE mkMathVal #-}
mkMathVal :: Integer -> MathRedeemer -> PlutusV2.ScriptContext -> Bool
mkMathVal targetNum (MathRedeemer f1 f2) _ctx =
    traceIfFalse "Incorrect math! Factors do not multiply to target." checkMath
  where
    checkMath :: Bool
    checkMath = (f1 * f2) == targetNum

{-# INLINABLE wrappedMkVal #-}
wrappedMkVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedMkVal = wrapValidator mkMathVal

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrappedMkVal ||])

---------------------------------------------------------------------------------------------------
------------------------------------- HELPER FUNCTIONS --------------------------------------------

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/mathpuzzle.plutus" validator
`;

    const bashCommands = `# 1. Lock ADA at the contract address with the Target Number as the datum.
# Let's say our target number is 42.
$ cardano-cli conway transaction build \\
  --tx-in dummy_tx_hash_uuid_here_1111111111111111#0 \\
  --tx-out $(cat mathpuzzle.addr)+10000000 \\
  --tx-out-inline-datum-value '{"int": 42}' \\
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

# 2. Attempt to spend the funds by providing the two factors in the redeemer!
# We know that 6 * 7 = 42.
# We must construct the custom JSON representation of the MathRedeemer.
$ cardano-cli conway transaction build \\
  --tx-in dummy_tx_hash_uuid_here_2222222222222222#0 \\
  --tx-in-script-file mathpuzzle.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor": 0, "fields": [{"int": 6}, {"int": 7}]}' \\
  --tx-out addr_test1_dummy_receiver_address_here+8000000 \\
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
                Smart contracts aren't just for ledgers and decentralized exchanges! They can run
                fully decentralized games and logic puzzles.
            </p>

            <p>
                The <strong>Math Puzzle Validator</strong> locks funds via a target mathematical equation.
                It stores the "answer" in the Datum on the blockchain, and to unlock the funds, any user
                can submit the exact mathematical factors required to reach that answer via the Redeemer.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="MathPuzzleValidator.hs"
            />
            <br />

            <h2 id="explanation">How It Works</h2>

            <h3>Custom Redeemer Types</h3>

            <p className="pexplaination">
                Unlike the typical simple counter where we just submit an an empty `()` or a byte string,
                here we need to supply <em>two mathematical factors</em> simultaneously. We achieve
                this by creating a custom Haskell record:
            </p>

            <CodeBlock
                code={`data MathRedeemer = MathRedeemer
    { factor1 :: Integer
    , factor2 :: Integer
    }`}
                language="haskell"
                filename="Custom Data Types"
            />

            <p className="pexplaination">
                By calling <code>PlutusTx.unstableMakeIsData</code> on our custom type, the Plutus
                compiler knows exactly how to unpack the incoming raw JSON string from the Cardano CLI
                into this neat structural format!
            </p>

            <br />

            <h2 id="execution">Execution Lifecycle</h2>

            <p className="pexplaination">
                When running this via the `cardano-cli`, you need to represent the custom Haskell
                type correctly in structured JSON.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Math Puzzle CLI Commands"
            />

            <h3>Deconstructing the Redeemer JSON</h3>

            <p className="pexplaination pt-2">
                In the bash command, our redeemer is <code>{"{"}"constructor": 0, "fields": [{"{"}"int": 6{"}"}, {"{"}"int": 7{"}"}]{"}"}</code>.
                The <code>constructor: 0</code> tells the compiler to use the first (and only)
                constructor of our <code>MathRedeemer</code> data type. The <code>fields</code>
                array is matched strictly in order: the first integer to <code>factor1</code>,
                and the second to <code>factor2</code>.
            </p>

        </div>
    );
}
