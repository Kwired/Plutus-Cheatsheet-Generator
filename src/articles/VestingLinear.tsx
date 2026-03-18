import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "vestinglinear",
    title: "Linear Token Vesting",
    subtitle: "A wage-streaming smart contract that progressively unlocks your ADA over time instead of all at once",
    date: "2025-02-24T09:00:00.000Z",
    readTime: "10 min read",
    tags: ["plutus", "cardano", "defi", "vesting", "advanced"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=21",
    },
};

export default function VestingLinearArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module VestingLinear where

import qualified Plutus.V2.Ledger.Api as PlutusV2
import           PlutusTx             (BuiltinData, compile, unstableMakeIsData)
import           PlutusTx.Prelude     (Bool, Integer, traceIfFalse, (&&), ($), (+), (-), (*), (/), (<=), (>=), min, max)
import           Plutus.V1.Ledger.Value (valueOf)
import           Plutus.V1.Ledger.Interval (from, contains, lowerBound)
import           Prelude              (IO)
import           Utilities            (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

-- The datum holds the vesting schedule. 
-- How much was initially locked? When does the drip start, and when does it reach 100%?
data VestingDatum = VestingDatum
    { beneficiary    :: PlutusV2.PubKeyHash -- The person slowly receiving the funds
    , totalVestAmt   :: Integer             -- Total amount of ADA in Lovelace locked at the beginning
    , startTime      :: PlutusV2.POSIXTime  -- 0% unlocked before this time
    , endTime        :: PlutusV2.POSIXTime  -- 100% unlocked after this time
    }
PlutusTx.unstableMakeIsData ''VestingDatum

-- We don't need distinct Action redeemers, just a trigger to withdraw.
-- We use unit () for the redeemer and rely purely on Datum math + Time.

{-# INLINABLE mkVestingValidator #-}
mkVestingValidator :: VestingDatum -> () -> PlutusV2.ScriptContext -> Bool
mkVestingValidator dat () ctx = 
    -- 1. Is the beneficiary the one actually retrieving the ADA?
    traceIfFalse "Only the beneficiary can withdraw vested funds!" (signedBy $ beneficiary dat) &&
    -- 2. Is there actually enough ADA legally unlocked for them to take right now?
    traceIfFalse "Trying to withdraw more ADA than is currently vested!" validAmountWithdrawn

  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    signedBy :: PlutusV2.PubKeyHash -> Bool
    signedBy pkh = PlutusV2.txSignedBy info pkh

    -- Plutus txInfoValidRange gives us the [lowerBound, upperBound].
    -- For vesting, the worst-case scenario is that the user tries to claim they are further
    -- in the future than they actually are to get more money.
    -- Therefore, we clamp the time to the LATEST SAFE time: the lowerBound of the range.
    -- This guarantees that the given amount of time has *definitely* elapsed.
    txLowerBound :: PlutusV2.POSIXTime
    txLowerBound = case lowerBound (PlutusV2.txInfoValidRange info) of
        PlutusV2.Extended (PlutusV2.POSIXTime t) -> PlutusV2.POSIXTime t
        _                                        -> traceError "Invalid lower bound!"

    traceError :: BuiltinData -> PlutusV2.POSIXTime
    traceError _ = PlutusTx.Prelude.error () 

    -- Calculate the exact mathematical amount of ADA that is legally unlocked at this exact second.
    unlockedAmount :: Integer
    unlockedAmount = 
        let 
            (PlutusV2.POSIXTime tMin) = txLowerBound
            (PlutusV2.POSIXTime tStart) = startTime dat
            (PlutusV2.POSIXTime tEnd) = endTime dat

            -- Total time of the vesting schedule
            totalDuration = tEnd - tStart

            -- How much time has elapsed? We clamp it so it never goes negative (before start),
            -- and never goes over the total duration (post-end).
            elapsedTime = max 0 $ min totalDuration (tMin - tStart)

            -- Linear interpolation: unlocked = (elapsedTime / totalDuration) * total amount
            -- Remember to multiply before dividing to avoid devastating decimal truncation!
        in
            (elapsedTime * totalVestAmt dat) / totalDuration

    -- Check if the amount they are trying to take out of the script is legal.
    validAmountWithdrawn :: Bool
    validAmountWithdrawn =
        let
            -- 1. Find the UTxO that this script is currently spending to see how much ADA is in the vault
            ownInput = PlutusV2.txInInfoResolved $ head [ i | i <- PlutusV2.txInfoInputs info
                                                        , PlutusV2.txOutAddress (PlutusV2.txInInfoResolved i) 
                                                          == PlutusV2.txOutAddress (PlutusV2.txInInfoResolved (head (PlutusV2.scriptContextTxInfoInputs info))) ]
            
            startingBalance = valueOf (PlutusV2.txOutValue ownInput) PlutusV2.adaSymbol PlutusV2.adaToken
            
            -- 2. How much of the TOTAL INITIAL AMOUNT has been withdrawn previously?
            -- We know this because the startingBalance + previouslyWithdrawn = totalVestAmt
            previouslyWithdrawn = totalVestAmt dat - startingBalance

            -- 3. How much MORE can they take right now?
            -- It's the total mathematically unlocked amount MINUS what they already took in the past.
            availableToWithdraw = unlockedAmount - previouslyWithdrawn

            -- 4. So what *must* be left behind in the script output?
            -- It's whatever was in the UTxO to start with, minus whatever they are legally taking.
            expectedRemainingBalance = startingBalance - availableToWithdraw

            -- 5. Find the continuing output going back to the script
            ownOutputs = [ o | o <- PlutusV2.txInfoOutputs info
                             , PlutusV2.txOutAddress o 
                               == PlutusV2.txOutAddress (PlutusV2.txInInfoResolved (head (PlutusV2.scriptContextTxInfoInputs info))) ]

        in
            if expectedRemainingBalance <= 0
            then True -- 100% of the funds are unlocked and claimed! No continuing output needed.
            else
                case ownOutputs of
                    [out] -> 
                        -- Check that the remaining token balance is exactly correct
                        let actualRemaining = valueOf (PlutusV2.txOutValue out) PlutusV2.adaSymbol PlutusV2.adaToken
                        -- It's okay if they leave *more* than required behind (meaning they didn't withdraw the full available amount)
                        in actualRemaining >= expectedRemainingBalance
                    _ -> False

{-# INLINABLE wrappedMkVal #-}
wrappedMkVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedMkVal = wrapValidator mkVestingValidator

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrappedMkVal ||])

---------------------------------------------------------------------------------------------------
------------------------------------- HELPER FUNCTIONS --------------------------------------------

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/vestinglinear.plutus" validator
`;

    const bashCommands = `# Scenario: An employee is awarded 100,000 ADA that vests over an entire year.
# Total Amount: 100,000 ADA
# Start Time: Jan 1st
# End Time: Dec 31st

# It is exactly halfway through the year (early July). 
# Mathematically, exactly 50,000 ADA is unlocked.
# The employee is desperate for cash to pay rent and wants to withdraw 25,000 ADA today.

# The UTxO currently holds the full 100,000 ADA.

# -------------------------------------------------------------------------
# The Partial Vesting Withdrawal
# The employee takes 25,000 ADA out, and leaves 75,000 ADA locked inside the script
# with the EXACT SAME DATUM so the math continues to track the total schedule perfectly.

$ cardano-cli conway transaction build \\
  --tx-in f29c7d41ef993a40879c882bc283a00508a8e10d291b8d234bd35a0928a6fcf4#1 \\
  --tx-in-script-file vestinglinear.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor":0,"fields":[]}' \\
  --tx-out $(cat vestinglinear.addr)+75000000000 \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"employee_hash..."},{"int":100000000000},{"int":1735689600},{"int":1767225600}]}' \\
  --tx-out $(cat employee.addr)+25000000000 \\
  --required-signer-hash employee_hash_a8b9c0... \\
  --tx-in-collateral d83b72c91a4bc5e1a908a80bdff62ea9825b4df2798aa12365e098a7213baf#0 \\
  --invalid-before 1751328000 \\
  --change-address $(cat employee.addr) \\
  --testnet-magic 2 \\
  --out-file tx-vest.raw

$ cardano-cli conway transaction sign --tx-body-file tx-vest.raw --signing-key-file employee.skey --testnet-magic 2 --out-file tx-vest.signed
$ cardano-cli conway transaction submit --tx-file tx-vest.signed
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                When a startup hires you and offers you equity, they don't give you 10% of the company on day one. They put you on a <strong>Vesting Schedule</strong>. Usually, your equity "unlocks" slowly over a 4-year period. This ensures you stick around and actually build value for the company rather than getting rich and quitting on day two.
            </p>

            <p>
                A standard time-lock vault sits there uselessly until a specific deadline, then opens completely all at once. A <strong>Linear Vesting Contract</strong> is far more elegant. It drips out funds block by block, second by second. If a 100,000 ADA grant vests over 100 days, at noon on day 25 you can legally withdraw exactly 25,000 ADA. It's continuous, mathematical wage-streaming.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="VestingLinear.hs"
            />
            <br />

            <h2 id="explanation">The Mathematics of Dripping Tokens</h2>

            <h3>The Lower Bound Guarantee</h3>

            <p className="pexplaination">
                If the contract allows you to withdraw more ADA the further into the future you are, you have a massive financial incentive to try to convince the blockchain that you are in the year 2099 so you can withdraw 100% of your tokens right now.
            </p>

            <p className="pexplaination pt-2">
                This is why we evaluate time using the <code>lowerBound</code> of the transaction's validity range.
            </p>

            <CodeBlock
                code={`txLowerBound = case lowerBound (PlutusV2.txInfoValidRange info) of ...

elapsedTime = max 0 $ min totalDuration (txLowerBound - tStart)`}
                language="haskell"
                filename="Forcing the Minimum Time"
            />

            <p className="pexplaination pt-2">
                If an employee sets their validity range from Jan 1st to Dec 31st, the script looks exclusively at Jan 1st. It says, "The only thing I am mathematically certain of is that it is <strong>at least</strong> Jan 1st. Therefore, I will only give you the ADA unlocked up to Jan 1st."
            </p>

            <p className="pexplaination">
                To maximize their payout, the employee is forced to set <code>--invalid-before</code> on their CLI command to the current exact time on the node, squeezing the most out of the elapsed time formula without the node rejecting them for claiming to be in the future.
            </p>

            <h3>The Continuing State Mechanics</h3>

            <p className="pexplaination pt-2">
                Much like our Token Sale vending machine, the blockchain doesn't "remember" how much you withdrew yesterday. If the datum says the total schedule is for 100,000 ADA and you're 50% of the way through the year, you are owed 50,000 ADA. 
            </p>

            <p className="pexplaination pt-2">
                But what if you already withdrew 40,000 ADA last month? 
            </p>

            <p className="pexplaination">
                We dynamically deduce this by looking at the current UTxO balance. We know the <code>totalVestAmt </code> is 100,000 ADA (it's permanently stamped on the Datum). We see there is only 60,000 ADA sitting in the UTxO. Therefore, <code>previouslyWithdrawn = 100,000 - 60,000 = 40,000</code>. We subtract your previous withdrawals from your newly calculated total unlocked amount to figure out how much more you're allowed to siphon off today.
            </p>

            <br />

            <h2 id="execution">Execution Lifecycle</h2>

            <p className="pexplaination">
                This CLI command illustrates the mid-year withdrawal perfectly. The employee takes a slice of the pie out for themselves, but painstakingly locks the remainder of the pie right back into the exact same contract address, preserving the original datum so the contract can keep counting correctly until the end of the year.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Vesting Withdrawal CLI Commands"
            />

        </div>
    );
}
