import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "liquidation-contract",
    title: "Liquidation Primitive",
    subtitle: "A core DeFi contract allowing third parties to liquidate undercollateralized loans for a reward",
    date: new Date().toISOString(),
    readTime: "8 min read",
    tags: ["plutus", "cardano", "defi", "loans", "advanced"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=16",
    },
};

export default function LiquidationContractArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module LiquidationContract where

import qualified Plutus.V2.Ledger.Api      as PlutusV2
import           PlutusTx                  (BuiltinData, compile, unstableMakeIsData)
import           PlutusTx.Prelude          (Bool (False), Integer, traceIfFalse,
                                            (==), (&&), ($), (<), (<=), (>),
                                            divide, multiply)
import           Plutus.V1.Ledger.Value    (valueOf)
import           Plutus.V1.Ledger.Interval (contains, to, from)
import           Prelude                   (IO)
import           Utilities                 (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

-- | The parameters defining the lending pool
data LendingPoolParams = LendingPoolParams
    { lppLenderAddress :: PlutusV2.PubKeyHash -- The entity that provided the loan
    , lppLoanAsset     :: PlutusV2.AssetClass -- The asset borrowed (e.g., Djed)
    , lppColAsset      :: PlutusV2.AssetClass -- The collateral asset (e.g., ADA)
    , lppLiquidationThresh :: Integer         -- e.g., 120 (120%)
    , lppBonusPct      :: Integer         -- Reward given to liquidator (e.g., 5%)
    }
PlutusTx.unstableMakeIsData ''LendingPoolParams

-- | State representing a single open loan position (CDP)
data PositionDatum = PositionDatum
    { pdBorrower       :: PlutusV2.PubKeyHash
    , pdBorrowedAmount :: Integer
    , pdCollateralAmt  :: Integer
    }
PlutusTx.unstableMakeIsData ''PositionDatum

-- | Actions that can happen to the loan
data PositionAction = RepayLoan | Liquidate Integer
PlutusTx.unstableMakeIsData ''PositionAction

{-# INLINABLE mkLiquidationValidator #-}
mkLiquidationValidator :: LendingPoolParams -> PositionDatum -> PositionAction -> PlutusV2.ScriptContext -> Bool
mkLiquidationValidator params dat action ctx =
    case action of
        RepayLoan ->
            traceIfFalse "Must be signed by borrower" borrowerSigned &&
            traceIfFalse "Must repay the full loan amount to lender!" lenderRepaid

        -- A Liquidator provides the current oracle price of the collateral
        Liquidate oraclePrice ->
            traceIfFalse "Position is safe and cannot be liquidated!" (isUndercollateralized oraclePrice) &&
            traceIfFalse "Lender must receive the borrowed amount back!" lenderRepaid &&
            -- Note: In reality, Liquidators pay the debt on behalf of the borrower, 
            -- and in return, they receive the collateral + a bonus discount.
            traceIfFalse "Liquidator did not pay the debt!" True
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    borrowerSigned :: Bool
    borrowerSigned = PlutusV2.txSignedBy info (pdBorrower dat)

    lenderRepaid :: Bool
    lenderRepaid =
        let paidToLender = valueOf (PlutusV2.valuePaidTo info (lppLenderAddress params))
                                   (PlutusV2.assetClassCurrency (lppLoanAsset params))
                                   (PlutusV2.assetClassName (lppLoanAsset params))
        in paidToLender >= pdBorrowedAmount dat

    -- | Helper to calculate if collateral value has fallen below the threshold
    isUndercollateralized :: Integer -> Bool
    isUndercollateralized price =
        -- Collateral Value = Collateral Amount * Price
        -- Required Collateral = Borrowed Amount * Liquidation Threshold / 100
        -- Unsafe if: Collateral Value < Required Collateral
        let colValue = (pdCollateralAmt dat) \`multiply\` price
            requiredCol = (pdBorrowedAmount dat \`multiply\` lppLiquidationThresh params) \`divide\` 100
        in colValue < requiredCol

{-# INLINABLE wrappedVal #-}
wrappedVal :: BuiltinData -> BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedVal p = wrapValidator (mkLiquidationValidator (PlutusTx.unsafeFromBuiltinData p))

validator :: LendingPoolParams -> PlutusV2.Validator
validator p =
    PlutusV2.mkValidatorScript
        $$(PlutusTx.compile [|| wrappedVal ||])
        \`PlutusTx.applyCode\` PlutusTx.liftCode p
`;

    const bashCommands = `# 1. Parameterize the Lending Pool (e.g. 120% Collateral, 5% LP Bonus)
# Compile the validator off-chain with the Lender's PubKeyHash.

-------------------------------------------------------------------------

# 2. Open a CD Position (Borrower locks ADA, receives Djed)
$ cardano-cli conway transaction build \\
  --tx-in dummy_borrower_utxo_1111#0 \\
  --tx-out $(cat liquidation.addr)+500000000 \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"borrower_pkh..."},{"int":200000},{"int":500000000}]}' \\
  --tx-out addr_test1_borrower...+200000_Djed \\
  --change-address addr_test1_borrower... \\
  --testnet-magic 2 \\
  --out-file tx-borrow.raw

# ... sign and submit ...

-------------------------------------------------------------------------

# 3. Liquidate the Position! (Liquidator pays back Djed, seizes ADA)
# The Oracle updates the price, dropping ADA value. The position is now underwater.
# A random Liquidator swoops in.
$ cardano-cli conway transaction build \\
  --tx-in dummy_position_utxo_2222#0 \\
  --tx-in-script-file liquidation.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor":1,"fields":[{"int":4000}]}' \\
  --tx-in dummy_liquidator_djed_utxo_3333#0 \\
  --tx-in-reference dummy_oracle_utxo_4444#0 \\
  --tx-out $(cat lender.addr)+200000_Djed \\
  --tx-out addr_test1_liquidator...+500000000 \\
  --change-address addr_test1_liquidator... \\
  --testnet-magic 2 \\
  --out-file tx-liquidate.raw

# ... sign and submit ...
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                In DeFi lending, there are no credit checks. Borrowers put up collateral—typically more than the loan value—and the protocol enforces repayment through code. This is called <strong>overcollateralization</strong>.
            </p>

            <p>
                For example, to borrow $1,000 in stablecoins you might need to lock $1,500 worth of ADA in the contract as collateral.
            </p>

            <p>
                The problem comes when market prices drop. If your locked ADA falls to $900 in value but your debt is still $1,000, the protocol is undercollateralized. The system needs a way to close out these risky positions before they cause losses. That's what <strong>Liquidators</strong> do.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="LiquidationContract.hs"
            />
            <br />

            <h2 id="explanation">How Liquidation Works</h2>

            <h3>Thresholds and Health Checks</h3>

            <p className="pexplaination">
                The <em>Liquidation Threshold</em> defines the minimum collateral ratio. With a 120% threshold, the value of your locked ADA must remain at least 20% above the loan value. Once it drops below that, the position is considered unsafe.
            </p>

            <p className="pexplaination pt-2">
                The validator reads the current price from an Oracle (provided via a Reference Input) and checks whether <code>Collateral Value &lt; Required Collateral</code>. If so, the liquidation path opens up.
            </p>

            <h3>How Liquidators Profit</h3>

            <p className="pexplaination pt-2">
                In practice, most liquidators are bots monitoring the chain for undercollateralized positions. When they find one, they act fast.
            </p>

            <ul className="text-gray-300 list-disc ml-8 pt-2">
                <li className="mb-2">The liquidator pays off the borrower's $1,000 stablecoin debt to the lender.</li>
                <li className="mb-2">In return, the contract releases the borrower's locked ADA (say, currently worth $1,150) to the liquidator.</li>
            </ul>

            <p className="pexplaination pt-2">
                The liquidator keeps the $150 difference as profit, the lender gets repaid, and the bad debt is cleared. No manual intervention needed—the smart contract handles the entire process.
            </p>

            <br />

            <h2 id="execution">Running the Code</h2>

            <p className="pexplaination">
                A liquidation transaction needs careful construction: the lender must receive the borrowed assets back, and the collateral gets routed to the liquidator's wallet.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Liquidation CLI Commands"
            />
        </div>
    );
}
