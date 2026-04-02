import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "liquiditypool",
    title: "Liquidity Pool (xy=k) AMM",
    subtitle: "The core pricing formula behind decentralized exchanges, enabling trustless token swapping",
    date: "2025-02-24T18:00:00.000Z",
    readTime: "16 min read",
    tags: ["plutus", "cardano", "defi", "amm", "expert"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=21",
    },
    plutusVersion: "V2",
    complexity: "Expert",
    useCase: "DeFi",
};

export default function LiquidityPoolArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module LiquidityPool where

import qualified Plutus.V2.Ledger.Api as PlutusV2
import           PlutusTx             (BuiltinData, compile, unstableMakeIsData)
import           PlutusTx.Prelude     (Bool, Integer, traceIfFalse, (&&), ($), (+), (-), (*), (>=))
import           Plutus.V1.Ledger.Value (valueOf)
import           Prelude              (IO)
import           Utilities            (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

-- The datum technically holds the configuration of the pool.
-- We need to know exactly which two tokens define the 'x' and 'y' of our xy=k equation.
data PoolDatum = PoolDatum
    { coinA_Policy :: PlutusV2.CurrencySymbol
    , coinA_Name   :: PlutusV2.TokenName
    , coinB_Policy :: PlutusV2.CurrencySymbol
    , coinB_Name   :: PlutusV2.TokenName
    , feeNumerator :: Integer -- e.g. 997 for a 0.3% fee
    , feeDenom     :: Integer -- e.g. 1000
    }
PlutusTx.unstableMakeIsData ''PoolDatum

-- A user can Swap tokens, or a Liquidity Provider can Add/Remove liquidity.
-- For this cheatsheet, we are hyper-focusing on the mathematical core: the Swap.
data PoolAction = Swap | AddLiquidity | RemoveLiquidity
PlutusTx.unstableMakeIsData ''PoolAction

{-# INLINABLE mkPoolValidator #-}
mkPoolValidator :: PoolDatum -> PoolAction -> PlutusV2.ScriptContext -> Bool
mkPoolValidator dat action ctx = case action of

    Swap ->
        -- The golden rule of Automated Market Makers (AMM):
        -- After the user's swap is finished, the product of Coin A * Coin B remaining in the pool
        -- MUST be greater than or equal to the product BEFORE the swap (accounting for fees).
        traceIfFalse "Constant Product formula (xy=k) violated!" validSwapCalculation &&
        
        -- The pool state must roll forward in a single continuing output
        traceIfFalse "Pool state was fragmented or lost!" validStateUpdate

    -- Add/Remove Liquidity logic involves complex minting of LP (Liquidity Provider) tokens.
    _ -> traceIfFalse "Add/Remove Liquidity not shown in this specific swap example." False

  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    -- Figure out exactly what UTxO the pool currently lives in
    ownInput :: PlutusV2.TxOut
    ownInput = PlutusV2.txInInfoResolved $ head [ i | i <- PlutusV2.txInfoInputs info
                                                , PlutusV2.txOutAddress (PlutusV2.txInInfoResolved i) 
                                                  == PlutusV2.txOutAddress (PlutusV2.txInInfoResolved (head (PlutusV2.scriptContextTxInfoInputs info))) ]

    -- Figure out exactly what UTxO the pool is transitioning into
    ownOutput :: PlutusV2.TxOut
    ownOutput = head [ o | o <- PlutusV2.txInfoOutputs info
                         , PlutusV2.txOutAddress o 
                           == PlutusV2.txOutAddress (PlutusV2.txInInfoResolved (head (PlutusV2.scriptContextTxInfoInputs info))) ]

    validStateUpdate :: Bool
    validStateUpdate = 
        let ownOutputsList = [ o | o <- PlutusV2.txInfoOutputs info
                                 , PlutusV2.txOutAddress o == PlutusV2.txOutAddress ownInput ]
        in length ownOutputsList == 1

    -- The xy=k validation with a 0.3% fee (997/1000)
    validSwapCalculation :: Bool
    validSwapCalculation =
        let
            -- 1. Read the STARTING balances (x and y)
            inValA = valueOf (PlutusV2.txOutValue ownInput) (coinA_Policy dat) (coinA_Name dat)
            inValB = valueOf (PlutusV2.txOutValue ownInput) (coinB_Policy dat) (coinB_Name dat)

            -- 2. Read the ENDING balances (x' and y')
            outValA = valueOf (PlutusV2.txOutValue ownOutput) (coinA_Policy dat) (coinA_Name dat)
            outValB = valueOf (PlutusV2.txOutValue ownOutput) (coinB_Policy dat) (coinB_Name dat)

            -- 3. Calculate exactly how much the user put in (or negative if they took it out)
            diffA = outValA - inValA
            diffB = outValB - inValB

            -- We only allow swapping A for B, or B for A. 
            -- If diffA is positive (they deposited A), then diffB MUST be negative (they withdrew B).
            -- We apply the fee ONLY to the deposited amount. (e.g. they deposit 1000, we pretend they deposited 997).
            
            -- Adjusted Out = In + (Diff * 997 / 1000) for deposits, or just Out if it was a withdrawal.
            adjustedOutA = if diffA > 0 
                           then inValA * (feeDenom dat) + diffA * (feeNumerator dat)
                           else outValA * (feeDenom dat)

            adjustedOutB = if diffB > 0 
                           then inValB * (feeDenom dat) + diffB * (feeNumerator dat)
                           else outValB * (feeDenom dat)

            -- The old, fee-less product: k = x * y
            -- Because we multiplied by feeDenom (1000) on both A and B, we must multiply the old k by 1000 * 1000
            -- so both sides of the equation are mathematically scaled equally without decimals.
            oldK = inValA * inValB * (feeDenom dat) * (feeDenom dat)

            -- The new, fee-adjusted product: k' = x' * y'
            newK = adjustedOutA * adjustedOutB
        in
            -- xy >= k
            newK >= oldK

    -- Provide custom length function for lists since PlutusTx lists don't easily compile with base GHC length
    length :: [a] -> Integer
    length []     = 0
    length (_:xs) = 1 + length xs

{-# INLINABLE wrappedMkVal #-}
wrappedMkVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedMkVal = wrapValidator mkPoolValidator

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrappedMkVal ||])

---------------------------------------------------------------------------------------------------
------------------------------------- HELPER FUNCTIONS --------------------------------------------

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/liquiditypool.plutus" validator
`;

    const bashCommands = `# Scenario: There is a DEX Pool holding ADA (Coin A) and SNEK (Coin B).
# The pool currently holds:
# 10,000 ADA
# 10,000,000 SNEK
# k = 10,000 * 10,000,000 = 100,000,000,000

# A user wants to swap 500 ADA for some SNEK. 
# They run the math off-chain with the 0.3% fee:
# 500 ADA * 0.997 = 498.5 ADA added to pool.
# New ADA Balance = 10,498.5
# New SNEK Balance = 100,000,000,000 / 10,498.5 = 9,525,170 SNEK
# The user gets 10,000,000 - 9,525,170 = 474,830 SNEK out.

# -------------------------------------------------------------------------
# Swapping on the DEX
# The user constructs a single transaction that sucks the entire pool UTxO in,
# adds their 500 ADA to their output, subtracts 474,830 SNEK for themselves, 
# and locks the resulting balance closely back into the script UTxO.
# If the math is wrong by even 1 SNEK, the script rejects the transaction.

$ cardano-cli conway transaction build \\
  --tx-in f29c7d41ef993...#0 \\
  --tx-in-script-file liquiditypool.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor":0,"fields":[]}' \\
  --tx-out $(cat liquiditypool.addr)+10498500000+"9525170 a0028f...SNEK" \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":""},{"bytes":""},{"bytes":"a0028f..."},{"bytes":"SNEK"},{"int":997},{"int":1000}]}' \\
  --tx-out $(cat swapper.addr)+2000000+"474830 a0028f...SNEK" \\
  --tx-in-collateral d83b72c9...#0 \\
  --change-address $(cat swapper.addr) \\
  --testnet-magic 2 \\
  --out-file tx-swap.raw

$ cardano-cli conway transaction sign --tx-body-file tx-swap.raw --signing-key-file swapper.skey --testnet-magic 2 --out-file tx-swap.signed
$ cardano-cli conway transaction submit --tx-file tx-swap.signed
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                Before 2018, to trade tokens on crypto exchanges, you had to use an Order Book. You placed an order wanting to buy at $1.05 and waited for some human on the other side of the planet to physically click "Sell" at $1.05.
            </p>

            <p>
                DeFi changed this with the <strong>Automated Market Maker (AMM)</strong>. Instead of order books, a pool of tokens sits in a smart contract. When someone wants to trade, they trade against the pool itself. The pool uses a simple mathematical formula to price tokens dynamically based on supply and demand.
            </p>

            <p>
                That formula is <strong>x * y = k</strong> (The Constant Product formula).
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="LiquidityPool.hs"
            />
            <br />

            <h2 id="explanation">Understanding x * y = k</h2>

            <h3>Understanding Constant Product</h3>

            <p className="pexplaination">
                Imagine a pool holds 100 Apples (<code>x</code>) and 100 Oranges (<code>y</code>).<br/>
                <code>100 * 100 = 10,000</code> (This is <code>k</code>)
            </p>

            <p className="pexplaination pt-2">
                If I want to buy 10 Apples, taking them out of the pool, the pool now only holds 90 Apples. The pool enforces an absolute law: after my trade, the <code>x * y</code> product must STILL equal <code>10,000</code>.<br/>
                <code>90 * y_new = 10,000</code><br/>
                <code>y_new = 111.11</code> Oranges
            </p>

            <p className="pexplaination">
                Since the pool originally had 100 Oranges and now requires 111.11 Oranges, I need to deposit 11.11 Oranges to buy my 10 Apples. The pool calculates the price dynamically. As more people buy Apples, they become scarcer in the pool, which pushes the price up.
            </p>

            <h3>The Fee scaling Trick in Plutus</h3>

            <CodeBlock
                code={`adjustedOutA = if diffA > 0 
               then inValA * 1000 + diffA * 997
               else outValA * 1000

oldK = inValA * inValB * 1000 * 1000
newK = adjustedOutA * adjustedOutB`}
                language="haskell"
                filename="Avoiding Decimals algorithmically"
            />

            <p className="pexplaination pt-2">
                Charging a 0.3% fee (where only 99.7% of the deposit is effective) requires some workarounds in Plutus. <strong>Plutus doesn't support decimal numbers.</strong> If you try to multiply by <code>0.997</code>, the compiler won't accept it.
            </p>

            <p className="pexplaination">
                The solution is to scale everything by 1000. This avoids decimals entirely. We multiply the original <code>k</code> (which is <code>x × y</code>) by <code>1000 × 1000</code> so both sides of the inequality are scaled equally. If you look at MinSwap or SundaeSwap on Cardano, you'll find optimized versions of this same technique.
            </p>

            <br />

            <h2 id="execution">Execution Lifecycle</h2>

            <p className="pexplaination">
                To execute a swap, the user calculates the math strictly off-chain within their wallet frontend. They construct a transaction that attempts to push and pull exactly the correct ADA and Native Tokens out of the UTxO.
            </p>
            
            <p className="pexplaination pt-2">
                The Plutus validator doesn't care how the user calculated the swap. It reads the pool balances before and after, applies the fee coefficients, checks that <code>newK &gt;= oldK</code>, and rejects the transaction if the constant product invariant is violated.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="DEX Swap CLI Commands"
            />

        </div>
    );
}
