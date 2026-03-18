import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "timelockedsavings",
    title: "Time-Locked Savings Vault",
    subtitle: "A digital piggy bank that forcefully prevents you from spending your ADA until a specific date",
    date: "2025-02-23T19:00:00.000Z",
    readTime: "7 min read",
    tags: ["plutus", "cardano", "defi", "time-lock", "savings", "beginner"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=21",
    },
};

export default function TimeLockedSavingsArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module TimeLockedSavings where

import qualified Plutus.V2.Ledger.Api as PlutusV2
import           PlutusTx             (BuiltinData, compile, unstableMakeIsData)
import           PlutusTx.Prelude     (Bool, traceIfFalse, (&&), ($))
import           Plutus.V1.Ledger.Interval (from, contains)
import           Prelude              (IO)
import           Utilities            (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

-- The datum dictates who owns the vault, and exactly when it unlocks.
data VaultDatum = VaultDatum
    { owner       :: PlutusV2.PubKeyHash    -- The wallet that can unlock this
    , unlockSlot  :: PlutusV2.POSIXTime     -- The precise millisecond it becomes available
    }
PlutusTx.unstableMakeIsData ''VaultDatum

-- We don't need a complex redeemer here. The action is simply "Withdraw". 
-- It either succeeds based on the datum rules, or it fails.
-- We use the standard unit () type for this.

{-# INLINABLE mkVaultValidator #-}
mkVaultValidator :: VaultDatum -> () -> PlutusV2.ScriptContext -> Bool
mkVaultValidator dat () ctx = 
    -- 1. Is the person trying to withdraw the actual owner?
    traceIfFalse "Not signed by the vault owner!" signedByOwner &&
    -- 2. Has the mandated time period passed?
    traceIfFalse "The vault is still time-locked!" timeReached
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    signedByOwner :: Bool
    signedByOwner = PlutusV2.txSignedBy info (owner dat)

    -- We construct a time interval from 'unlockSlot' to Infinity.
    -- Then we verify that the transaction's valid range fits entirely inside it.
    timeReached :: Bool
    timeReached = contains (from $ unlockSlot dat) (PlutusV2.txInfoValidRange info)

{-# INLINABLE wrappedMkVal #-}
wrappedMkVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedMkVal = wrapValidator mkVaultValidator

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrappedMkVal ||])

---------------------------------------------------------------------------------------------------
------------------------------------- HELPER FUNCTIONS --------------------------------------------

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/timelockedsavings.plutus" validator
`;

    const bashCommands = `# Scenario: I am forced to save for a new car. 
# I am locking 10,000 ADA in this vault.
# Target timestamp: 1735689600 (Jan 1, 2025). 
# Until then, even if I have my private keys, the network will reject any attempt to spend this UTxO.

# -------------------------------------------------------------------------
# 1. Deposit into the Time-Locked Vault

$ cardano-cli conway transaction build \\
  --tx-in e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855#1 \\
  --tx-out $(cat savings_vault.addr)+10000000000 \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"4b9d0e14a2b97f3e8f9a3..."},{"int":1735689600}]}' \\
  --change-address $(cat mywallet.addr) \\
  --testnet-magic 2 \\
  --out-file tx-deposit.raw

$ cardano-cli conway transaction sign --tx-body-file tx-deposit.raw --signing-key-file mywallet.skey --testnet-magic 2 --out-file tx-deposit.signed
$ cardano-cli conway transaction submit --tx-file tx-deposit.signed

# -------------------------------------------------------------------------
# 2. The Great Unlock (Attempting to withdraw ON OR AFTER Jan 1, 2025)

# Notice the --invalid-before flag. We set it to our unlock time.
# If the current node time is BEFORE this slot, the CLI/Node won't even let the tx enter the mempool.
# If the node time is AFTER this slot, the tx is valid, and the Plutus script accepts it.

$ cardano-cli conway transaction build \\
  --tx-in 6d2c47ab6a1f0a28f80459c2356dbb1897ea83c9213ef2b8eec85a49c90b8ef4#0 \\
  --tx-in-script-file timelockedsavings.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor":0,"fields":[]}' \\
  --required-signer-hash 4b9d0e14a2b97f3e8f9a3... \\
  --tx-in-collateral d83b72c91a4bc5e1a908a80bdff62ea9825b4df2798aa12365e098a7213baf#0 \\
  --invalid-before 1735689600 \\
  --change-address $(cat mywallet.addr) \\
  --testnet-magic 2 \\
  --out-file tx-withdraw.raw

$ cardano-cli conway transaction sign --tx-body-file tx-withdraw.raw --signing-key-file mywallet.skey --testnet-magic 2 --out-file tx-withdraw.signed
$ cardano-cli conway transaction submit --tx-file tx-withdraw.signed
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                We've all been there: you promise yourself you're going to hold onto your crypto for the long term. You move it to cold storage. You hide the seed phrase. But then the market dips, panic sets in, and suddenly you're digging through your closet at 3 AM looking for that hardware wallet.
            </p>

            <p>
                What if you could mathematically restrict your own ability to spend your money? 
            </p>

            <p>
                The <strong>Time-Locked Savings Vault</strong> does exactly this. It's a Plutus smart contract that acts as an unbreakable digital piggy bank. You lock your ADA into it, and you set an exact timestamp in the Datum. Until that specific second arrives, the Cardano network will flat-out reject any transaction trying to move those funds — even if you are the one signing it with your own private keys.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="TimeLockedSavings.hs"
            />
            <br />

            <h2 id="explanation">The Logic of Time</h2>

            <h3>The Valid Range Dilemma</h3>

            <p className="pexplaination">
                One of the most mind-bending concepts for new Plutus developers is how time works on-chain. Plutus scripts are inherently <strong>deterministic</strong>. If you run a script with the exact same inputs tomorrow, it must return the exact same output as it did today.
            </p>

            <p className="pexplaination pt-2">
                Because of this, a Plutus script cannot call a function like <code>getCurrentTime()</code>. If it did, it would evaluate to <code>True</code> later, but <code>False</code> right now — destroying determinism.
            </p>

            <CodeBlock
                code={`timeReached = contains (from $ unlockSlot dat) (PlutusV2.txInfoValidRange info)`}
                language="haskell"
                filename="Deterministic Time Checking"
            />

            <h3>Solving Determinism with Ranges</h3>

            <p className="pexplaination pt-2">
                Instead of asking the script "what time is it?", the person submitting the transaction declares a <strong>Validity Range</strong>. In our case, using <code>--invalid-before 1735689600</code> on the CLI means: <i>"I am declaring this transaction is only valid from January 1st, 2025 onwards into infinity."</i>
            </p>

            <p className="pexplaination pt-2">
                The Plutus script looks at this declaration and checks if the range is mathematically compatible with the <code>unlockSlot</code> stored in the Datum. If the transaction claims it's valid from Jan 1st onward, and the Datum says it unlocks Jan 1st, the math checks out (<code>True</code>).
            </p>

            <p className="pexplaination">
                But wait — what if a user just lies and sets <code>--invalid-before</code> to a date in the future while running the transaction today? They can't. The Cardano Phase-1 validators check the transaction's validity range against the <strong>actual current node time</strong> before the transaction is ever allowed into a block. If you lie about the time, the ledger rejects it before the Plutus script even executes. 
            </p>

            <br />

            <h2 id="execution">Execution Lifecycle</h2>

            <p className="pexplaination">
                Here is the real-world flow of depositing into the vault and successfully withdrawing it using absolute POSIX timestamp boundaries.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Savings Vault CLI Commands"
            />

        </div>
    );
}
