import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "flashloan",
    title: "Flash Loan Contract",
    subtitle: "Borrow 100 million ADA with zero collateral, provided you return it in the exact same heartbeat",
    date: "2025-02-24T21:00:00.000Z",
    readTime: "8 min read",
    tags: ["plutus", "cardano", "defi", "flashloan", "expert"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=21",
    },
};

export default function FlashLoanArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module FlashLoan where

import qualified Plutus.V2.Ledger.Api as PlutusV2
import           PlutusTx             (BuiltinData, compile, unstableMakeIsData)
import           PlutusTx.Prelude     (Bool, Integer, traceIfFalse, (&&), ($), (*), (+), (-), (>=), divide)
import           Plutus.V1.Ledger.Value (valueOf)
import           Prelude              (IO)
import           Utilities            (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

-- The datum dictates who actually owns the flash loan pool and the mathematically enforced fee.
-- E.g., a feeNumerator of 1 and feeDenom of 1000 = 0.1% fee on all loans.
data PoolDatum = PoolDatum 
    { poolOwner    :: PlutusV2.PubKeyHash 
    , feeNumerator :: Integer 
    , feeDenom     :: Integer
    }
PlutusTx.unstableMakeIsData ''PoolDatum

-- The user doesn't even need to tell the contract how much they are borrowing.
-- The contract mathematically deduces it by looking at the inputs and outputs.
-- Either you Borrow, or the owner forcefully shuts it down with Close.
data PoolAction = Borrow | Close
PlutusTx.unstableMakeIsData ''PoolAction

{-# INLINABLE mkFlashLoanValidator #-}
mkFlashLoanValidator :: PoolDatum -> PoolAction -> PlutusV2.ScriptContext -> Bool
mkFlashLoanValidator dat action ctx = case action of

    Borrow ->
        -- Provide the liquidity, check the math, demand it back instantly.
        traceIfFalse "The pool was not fully repaid with the correct fee!" validRepayment

    Close ->
        -- Shut down the pool and return all funds back to the creator.
        traceIfFalse "Only the owner can close down the pool!" (signedBy $ poolOwner dat)

  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    signedBy :: PlutusV2.PubKeyHash -> Bool
    signedBy pkh = PlutusV2.txSignedBy info pkh

    -- This relies heavily on the EUTxO model. An attacker cannot "take the money and run",
    -- because the Plutus script forces them to construct a transaction output that puts
    -- the exact required amount *back* into the exact same smart contract address.
    validRepayment :: Bool
    validRepayment = 
        let
            -- 1. How much ADA is currently sitting in the script UTxO being consumed?
            ownInput = PlutusV2.txInInfoResolved $ head [ i | i <- PlutusV2.txInfoInputs info
                                                        , PlutusV2.txOutAddress (PlutusV2.txInInfoResolved i) 
                                                          == PlutusV2.txOutAddress (PlutusV2.txInInfoResolved (head (PlutusV2.scriptContextTxInfoInputs info))) ]
            
            startingAda = valueOf (PlutusV2.txOutValue ownInput) PlutusV2.adaSymbol PlutusV2.adaToken

            -- 2. What is the fee?
            -- Fee = (borrowed amount * numerator) / denominator
            -- In a Flash Loan, the *entire* UTxO is technically 'borrowed' during the transaction, 
            -- so the fee applies to the entire pool size.
            requiredFee = (startingAda * feeNumerator dat) \`divide\` feeDenom dat

            -- What must the borrower put back into the script?
            targetAda = startingAda + requiredFee

            -- 3. Did they actually put it back?
            -- We find the "continuing output" that goes back to the script address.
            ownOutputs = [ o | o <- PlutusV2.txInfoOutputs info
                             , PlutusV2.txOutAddress o 
                               == PlutusV2.txOutAddress (PlutusV2.txInInfoResolved (head (PlutusV2.scriptContextTxInfoInputs info))) ]
        in
            case ownOutputs of
                [out] -> 
                    -- Ensure the returned amount is equal to or greater than what's mathematically required
                    let actualReturned = valueOf (PlutusV2.txOutValue out) PlutusV2.adaSymbol PlutusV2.adaToken
                    in actualReturned >= targetAda
                _ -> False -- If they tried to split it into multiple UTxOs or none at all, instantly fail.

{-# INLINABLE wrappedMkVal #-}
wrappedMkVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedMkVal = wrapValidator mkFlashLoanValidator

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrappedMkVal ||])

---------------------------------------------------------------------------------------------------
------------------------------------- HELPER FUNCTIONS --------------------------------------------

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/flashloan.plutus" validator
`;

    const bashCommands = `# Scenario: A flash loan pool currently holds 100,000 ADA.
# The fee is strictly 0.5% (numerator = 5, denominator = 1000).
# The fee on 100,000 ADA is therefore 500 ADA.

# A user spots an arbitrage opportunity: buying Token X on Dex A for 90,000 ADA, 
# and instantly selling it on Dex B for 95,000 ADA (5,000 ADA profit). 
# But they don't have 90,000 ADA in their own wallet.

# -------------------------------------------------------------------------
# The Magic Bullet (The Flash Loan Transaction)
# The user constructs a MASSIVE transaction doing everything below sequentially
# but submitting it as one single atomic action:

$ cardano-cli conway transaction build \\
  --tx-in f29c7d41ef993...#0 \\  # Input 1: The 100,000 ADA Flash Loan UTxO
  --tx-in-script-file flashloan.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor":0,"fields":[]}' \\
  --tx-in f30d8e52...#1 \\       # Input 2: Dex A Liquidity Pool UTxO (to buy Token X)
  --tx-in f41e9f63...#2 \\       # Input 3: Dex B Liquidity Pool UTxO (to sell Token X)
  \\
  # Output 1: Return the 100,000 ADA + 500 ADA fee explicitly back to the Flash pool.
  # This mathematically satisfies the flashloan.plutus traceIfFalse condition.
  --tx-out $(cat flashloan.addr)+100500000000 \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"owner_hash..."},{"int":5},{"int":1000}]}' \\
  \\
  # Output 2: Updating Dex A's state (it took 90k ADA, gave Token X)
  --tx-out $(cat dexa.addr)+... \\ 
  \\
  # Output 3: Updating Dex B's state (it took Token X, gave 95k ADA)
  --tx-out $(cat dexb.addr)+... \\
  \\
  # Output 4: The 4,500 ADA remaining arbitrage profit goes entirely to the user's wallet!
  --change-address $(cat user.addr) \\
  --testnet-magic 2 \\
  --out-file tx-flash.raw

$ cardano-cli conway transaction sign --tx-body-file tx-flash.raw --signing-key-file user.skey --testnet-magic 2 --out-file tx-flash.signed
$ cardano-cli conway transaction submit --tx-file tx-flash.signed

# Result: If ANY of the AMM mathematics fail, or if the user fails to return
# exactly 100,500 ADA to the flash pool output, the node violently rejects everything 
# and the 100,000 ADA loan functionally never ever happened.
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                In the traditional banking world, obtaining a massive loan requires plunging yourself into debt, providing a house as collateral, submitting to a credit check, and signing endless paperwork. If you don't pay the bank back, they take your house.
            </p>

            <p>
                A <strong>Flash Loan</strong> is a concept that simply cannot exist off a blockchain. It allows a completely anonymous user with 0 ADA and 0 collateral to borrow, say, $10 Million Dollars. There are no credit checks. There are no repo men. You can do absolutely anything you want with the $10 Million Dollars—invest it, trade it, buy NFTs, stake it—on one singular condition:
            </p>

            <p>
                <strong>The $10 Million Dollars must be fully repaid in the exact same transaction it was borrowed.</strong>
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="FlashLoan.hs"
            />
            <br />

            <h2 id="explanation">The Logic of God Mode</h2>

            <h3>The Atomic Impossibility of Defaulting</h3>

            <p className="pexplaination">
                How does a smart contract guarantee you won't take the $10 Million and run? To understand, you have to realize that a Cardano transaction isn't just one action; it is a meticulously crafted algebraic formula containing <var>inputs</var> and <var>outputs</var>.
            </p>

            <p className="pexplaination pt-2">
                A "transaction" in Cardano is evaluated atomically. It is an all-or-nothing prospect. Either every single math check in every single script within the transaction passes flawlessly, or the entire transaction is physically incapable of being written to the blockchain. If it isn't written to the block, no money ever moved anywhere.
            </p>

            <CodeBlock
                code={`targetAda = startingAda + requiredFee

actualReturned = valueOf (PlutusV2.txOutValue out)
in actualReturned >= targetAda`}
                language="haskell"
                filename="The Repayment Trap"
            />

            <p className="pexplaination pt-2">
                The Flash Loan validator script is terrifyingly simple. It demands to see a continuing output going back to its own address containing the starting balance plus the fee. If you borrow 100,000 ADA and use it all up buying NFTs without bothering to secure another 100,500 ADA from somewhere else to plug into the output, the validator simply returns <code>False</code>. Because it returned <code>False</code>, the ledger rejects the transaction. Because the ledger rejected it, the 100,000 ADA never actually left the pool.
            </p>

            <h3>The Magic of Arbitrage</h3>

            <p className="pexplaination pt-2">
                If the money has to be returned in the exact same transaction, what's point? Why borrow money you can't keep? <strong>Arbitrage.</strong>
            </p>

            <p className="pexplaination">
                Because Plutus allows a transaction to string together multiple smart contracts simultaneously, you can easily borrow 1,000,000 ADA from the Flash Loan, immediately interact with Dex A in the same transaction to buy Hosky Tokens, interact with Dex B to dump the Hosky tokens for 1,100,000 ADA, repay the 1,005,000 ADA owed to the flash loan, and pocket a staggering 95,000 ADA profit. All with zero personal risk or starting capital besides the transaction fee.
            </p>

            <br />

            <h2 id="execution">Execution Lifecycle</h2>

            <p className="pexplaination">
                Take a close look at this CLI transaction. The borrower is simultaneously consuming 3 different inputs: the flash loan, Dex A, and Dex B. The outputs explicitly map exactly where the reshuffled funds go.
            </p>
            
            <p className="pexplaination pt-2">
                There is no magic "execute line 1, then execute line 2, then execute line 3." In the eUTxO model, all state changes resolve identically at once. The user provides the fully formed puzzle, and the node mathematicians (validators) merely verify it doesn't break any rules.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="The God-Transaction CLI Commands"
            />

        </div>
    );
}
