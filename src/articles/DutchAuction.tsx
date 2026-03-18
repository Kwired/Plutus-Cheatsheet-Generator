import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "dutchauction",
    title: "Dutch Auction",
    subtitle: "A brutal game of chicken where the price of an asset drops every second until someone finally buys it",
    date: "2025-02-23T23:00:00.000Z",
    readTime: "11 min read",
    tags: ["plutus", "cardano", "defi", "auction", "advanced"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=21",
    },
};

export default function DutchAuctionArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module DutchAuction where

import qualified Plutus.V2.Ledger.Api as PlutusV2
import           PlutusTx             (BuiltinData, compile, unstableMakeIsData)
import           PlutusTx.Prelude     (Bool, Integer, traceIfFalse, (&&), ($), (+), (-), (*), (/), (<=), (>=), max)
import           Plutus.V1.Ledger.Value (valueOf)
import           Plutus.V1.Ledger.Interval (to, contains, upperBound)
import           Prelude              (IO)
import           Utilities            (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

-- The datum calculates the steepness of the price drop.
data DutchDatum = DutchDatum
    { seller         :: PlutusV2.PubKeyHash -- The wallet auctioning the item
    , assetPolicy    :: PlutusV2.CurrencySymbol
    , assetName      :: PlutusV2.TokenName
    , startPrice     :: Integer             -- The massively inflated initial price
    , reservePrice   :: Integer             -- The absolute minimum price the seller will accept
    , startTime      :: PlutusV2.POSIXTime  -- When the drop begins
    , endTime        :: PlutusV2.POSIXTime  -- When the drop ends (and hits reserve price)
    }
PlutusTx.unstableMakeIsData ''DutchDatum

-- Two actions: Either someone buys it at the *current* calculated price, 
-- or the seller reclaims it (after the deadline or if they change their mind).
data DutchAction = Buy | Reclaim
PlutusTx.unstableMakeIsData ''DutchAction

{-# INLINABLE mkDutchValidator #-}
mkDutchValidator :: DutchDatum -> DutchAction -> PlutusV2.ScriptContext -> Bool
mkDutchValidator dat action ctx = case action of

    Buy ->
        -- Ensure the buyer is paying the correct dynamically-calculated amount of ADA
        traceIfFalse "Incorrect payment amount for the current time!" validPayment &&
        -- The buyer must actually receive the asset
        traceIfFalse "Buyer did not receive the asset!" buyerGotAsset &&
        -- Ensure this transaction is strictly pinned to a specific time range to lock in the price
        traceIfFalse "Transaction validity range is too wide or invalid!" validTimeRange

    Reclaim ->
        -- Only the seller can cancel the auction or take the asset back if nobody buys it
        traceIfFalse "Only the seller can reclaim the asset!" (signedBy $ seller dat)

  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    signedBy :: PlutusV2.PubKeyHash -> Bool
    signedBy pkh = PlutusV2.txSignedBy info pkh

    -- Plutus txInfoValidRange gives us the [lowerBound, upperBound] of when this tx is valid.
    -- To calculate the price safely, we look at the LATEST possible time this tx could execute (upperBound).
    -- If the buyer pays the price set at the upperBound, we guarantee the seller isn't cheated.
    txUpperBound :: PlutusV2.POSIXTime
    txUpperBound = case upperBound (PlutusV2.txInfoValidRange info) of
        PlutusV2.Extended (PlutusV2.POSIXTime t) -> PlutusV2.POSIXTime t
        _                                        -> traceError "Invalid upper bound!"

    -- Helper to fail if no bound is found
    traceError :: BuiltinData -> PlutusV2.POSIXTime
    traceError _ = PlutusTx.Prelude.error () 

    -- Is the transaction bounded safely?
    validTimeRange :: Bool
    validTimeRange = contains (to $ endTime dat) (PlutusV2.txInfoValidRange info)

    -- The core mathematical logic of the Dutch Auction
    -- Price drops linearly from strictly 'startPrice' to strictly 'reservePrice'
    currentPrice :: Integer
    currentPrice = 
        let 
            (PlutusV2.POSIXTime tMax) = txUpperBound
            (PlutusV2.POSIXTime tStart) = startTime dat
            (PlutusV2.POSIXTime tEnd) = endTime dat

            -- Total time and total price drop over the entire auction
            totalDuration = tEnd - tStart
            totalDrop = startPrice dat - reservePrice dat

            -- How much time has elapsed up to the VERY LATEST this tx could be included in a block?
            elapsedTime = max 0 (tMax - tStart)

            -- Linear interpolation: drop = (elapsedTime / totalDuration) * totalDrop
            -- NOTE: We multiply before dividing to prevent integer truncation errors!
            priceReduction = (elapsedTime * totalDrop) / totalDuration

            -- The calculated price at the upper bound limit
            calculatedPrice = startPrice dat - priceReduction
        in
            -- Never let the price drop below the reserve!
            max (reservePrice dat) calculatedPrice

    -- Did the seller actually receive the calculated ADA?
    validPayment :: Bool
    validPayment =
        let
            requiredAda = currentPrice
            sellerOutputs = [ o | o <- PlutusV2.txInfoOutputs info 
                                , PlutusV2.txOutAddress o == PlutusV2.pubKeyHashAddress (seller dat) ]
            
            totalPaid = sum [ valueOf (PlutusV2.txOutValue o) PlutusV2.adaSymbol PlutusV2.adaToken | o <- sellerOutputs ]
        in
            totalPaid >= requiredAda

    -- Did the buyer take the asset out of the script?
    -- (We don't need to check *who* the buyer is; anyone paying the seller is allowed to take the asset from the script UTxO)
    buyerGotAsset :: Bool
    buyerGotAsset = 
        let
            -- We just check that the script *no longer* holds the asset in any continuing output
            ownOutputs = [ o | o <- PlutusV2.txInfoOutputs info
                             , PlutusV2.txOutAddress o 
                               == PlutusV2.txOutAddress (PlutusV2.txInInfoResolved (head (PlutusV2.scriptContextTxInfoInputs info))) ]
            
            scriptStillHolding = sum [ valueOf (PlutusV2.txOutValue o) (assetPolicy dat) (assetName dat) | o <- ownOutputs ]
        in
            scriptStillHolding == 0

{-# INLINABLE wrappedMkVal #-}
wrappedMkVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedMkVal = wrapValidator mkDutchValidator

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrappedMkVal ||])

---------------------------------------------------------------------------------------------------
------------------------------------- HELPER FUNCTIONS --------------------------------------------

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/dutchauction.plutus" validator
`;

    const bashCommands = `# Scenario: Selling a rare "Hosky" Developer Node NFT.
# Start Price: 10,000 ADA
# Reserve (Minimum) Price: 1,000 ADA
# Duration: Starts Jan 1st, Ends Jan 10th. (Price drops 1,000 ADA every single day).

# Today is Jan 5th. The price should mathematically be 5,000 ADA right now.
# I (the bold buyer) am stepping in to buy it before anyone else does.

# -------------------------------------------------------------------------
# 1. The Dynamic Buy Transaction
# I must pay the seller exactly 5,000 ADA. 
# CRITICAL: I must set a tight --invalid-hereafter bound to lock in my price calculation!

$ cardano-cli conway transaction build \\
  --tx-in e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855#0 \\
  --tx-in-script-file dutchauction.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor":0,"fields":[]}' \\
  --tx-out $(cat seller.addr)+5000000000 \\
  --tx-out $(cat mywallet.addr)+2000000+"1 d5e6f7a8b9c0...Node" \\
  --tx-in-collateral d83b72c91a4bc5e1a908a80bdff62ea9825b4df2798aa12365e098a7213baf#0 \\
  --invalid-before 1736035200 \\
  --invalid-hereafter 1736035400 \\
  --change-address $(cat mywallet.addr) \\
  --testnet-magic 2 \\
  --out-file tx-buy.raw

$ cardano-cli conway transaction sign --tx-body-file tx-buy.raw --signing-key-file mywallet.skey --testnet-magic 2 --out-file tx-buy.signed
$ cardano-cli conway transaction submit --tx-file tx-buy.signed
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                In a standard English Auction, the price goes up as buyers yell at each other. A <strong>Dutch Auction</strong> flips this on its head. The seller lists the item at a wildly inflated price (e.g., 10,000 ADA). Every single second that ticks by, the price slowly drops. Eventually, it hits the absolute floor price (e.g., 1,000 ADA).
            </p>

            <p>
                The catch? The first person to click "Buy" instantly wins the item. You are playing a brutal game of chicken against the rest of the world. Do you buy it now for 5,000 ADA? Or do you wait until tomorrow to try and get it for 4,000 ADA, risking that someone else scoops it up tonight while you sleep?
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="DutchAuction.hs"
            />
            <br />

            <h2 id="explanation">The Mathematics of Time</h2>

            <h3>Calculating the Drop</h3>

            <p className="pexplaination">
                Unlike our other time-locked contracts that just check if a deadline has passed, a Dutch Auction uses the raw POSIX milliseconds to actively perform geometry. 
            </p>

            <p className="pexplaination pt-2">
                We take the total ADA drop amount and multiply it by how much time has passed. Notice that in the Plutus Haskell code, we explicitly multiply <strong>before</strong> we divide: <code>(elapsedTime * totalDrop) / totalDuration</code>. If you reversed this to <code>totalDrop * (elapsedTime / totalDuration)</code>, you would introduce catastrophic integer truncation bugs. Plutus does not natively handle floating-point decimals. If <code>elapsedTime / totalDuration</code> evaluates to 0.75, Plutus would violently truncate it to <code>0</code>, completely destroying your price curve.
            </p>

            <h3>The Upper Bound Trap</h3>

            <p className="pexplaination pt-2">
                If the price is constantly falling, what prevents a buyer from lying to the script and saying "Hey, it's basically the end of the auction, give it to me for the lowest price"?
            </p>

            <CodeBlock
                code={`txUpperBound = case upperBound (PlutusV2.txInfoValidRange info) of ...

elapsedTime = max 0 (txUpperBound - tStart)`}
                language="haskell"
                filename="Forcing the Maximum Price"
            />

            <p className="pexplaination pt-2">
                This is the crown jewel of the Dutch Auction validator. When a buyer submits a transaction, they define a time range in which the transaction is valid (e.g., between 1:00 PM and 1:05 PM). The Plutus script doesn't look at the beginning of that range. It looks at the <strong>latest possible millisecond</strong> the transaction could mathematically execute (the <code>txUpperBound</code>).
            </p>

            <p className="pexplaination">
                By calculating the elapsed time against the <i>end</i> of the buyer's validity range, the script forces the buyer to pay the highest possible price within that window. If the buyer wants a cheaper price, they have to wait. They cannot exploit the transaction validity bounds to peer into the future.
            </p>

            <br />

            <h2 id="execution">Execution Lifecycle</h2>

            <p className="pexplaination">
                Notice the CLI formulation here. We must tightly bind the transaction using <strong>both</strong> <code>--invalid-before</code> and <code>--invalid-hereafter</code>. If we simply left <code>--invalid-hereafter</code> unbounded to infinity, the script would calculate the elapsed time to infinity, meaning the buyer would only have to pay the minimum reserve price! The script forces the buyer to lock in a narrow time window, ensuring the seller gets fairly paid for exactly when the transaction resolves.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Dutch Auction CLI Commands"
            />

        </div>
    );
}
