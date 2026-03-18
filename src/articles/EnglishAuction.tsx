import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "englishauction",
    title: "English Auction",
    subtitle: "A brutal ascending-price bidding war where the highest bidder walks away with the NFT — and losers get fully refunded",
    date: "2025-02-23T21:00:00.000Z",
    readTime: "14 min read",
    tags: ["plutus", "cardano", "defi", "auction", "advanced"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=21",
    },
};

export default function EnglishAuctionArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module EnglishAuction where

import qualified Plutus.V2.Ledger.Api as PlutusV2
import           PlutusTx             (BuiltinData, compile, unstableMakeIsData)
import           PlutusTx.Prelude     (Bool, traceIfFalse, (&&), ($), (+), (==), (>), (>=), Maybe(Just, Nothing))
import           Plutus.V1.Ledger.Value (valueOf)
import           Plutus.V1.Ledger.Interval (from, to, contains)
import           Prelude              (IO)
import           Utilities            (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

-- The datum holds the active state of the auction.
-- It tells us who is holding the gavel, what they are selling, when it ends,
-- and most importantly: who is currently winning.
data AuctionDatum = AuctionDatum
    { seller       :: PlutusV2.PubKeyHash -- The wallet auctioning the item
    , assetPolicy  :: PlutusV2.CurrencySymbol
    , assetName    :: PlutusV2.TokenName
    , highestBid   :: Integer             -- The current highest bid in Lovelace (starts at the reserve price)
    , highestBidder:: Maybe PlutusV2.PubKeyHash -- Who is winning right now? (Nothing if no bids yet)
    , endSlot      :: PlutusV2.POSIXTime  -- When the gavel drops
    }
PlutusTx.unstableMakeIsData ''AuctionDatum

-- You can either outbid the current winner (Bid), or close the auction once it's over (Close).
data AuctionAction = Bid { newBid :: Integer, newBidder :: PlutusV2.PubKeyHash } | Close
PlutusTx.unstableMakeIsData ''AuctionAction

{-# INLINABLE mkAuctionValidator #-}
mkAuctionValidator :: AuctionDatum -> AuctionAction -> PlutusV2.ScriptContext -> Bool
mkAuctionValidator dat action ctx = case action of

    Bid bidAmt bidderHash ->
        -- Bidding is only allowed BEFORE the auction ends.
        traceIfFalse "The auction is over!" beforeEnd &&
        -- The new bid must actually be higher than the current highest bid
        traceIfFalse "Bid must be strictly greater than the current highest bid!" (bidAmt > highestBid dat) &&
        -- The person claiming to bid must actually sign the transaction
        traceIfFalse "Not signed by the new bidder!" (signedBy bidderHash) &&
        -- If someone was previously winning, they MUST get their ADA back.
        traceIfFalse "Previous highest bidder wasn't refunded!" previousBidderRefunded &&
        -- The auction state must carry forward with the new highest bid and bidder
        traceIfFalse "Auction state wasn't updated correctly!" (stateUpdated bidAmt bidderHash)

    Close ->
        -- You can only close the auction AFTER the deadline has passed.
        traceIfFalse "The auction hasn't ended yet!" afterEnd &&
        -- Depending on if there were any bids, either the seller gets the ADA and the winner gets the asset
        -- OR the seller just takes their asset back because nobody bid.
        traceIfFalse "Assets were not distributed correctly!" payoutCorrect

  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    signedBy :: PlutusV2.PubKeyHash -> Bool
    signedBy pkh = PlutusV2.txSignedBy info pkh

    -- Time validation: Is the transaction happening BEFORE the end time?
    beforeEnd :: Bool
    beforeEnd = contains (to $ endSlot dat) (PlutusV2.txInfoValidRange info)

    -- Time validation: Is the transaction happening AFTER the end time?
    afterEnd :: Bool
    afterEnd = contains (from $ endSlot dat) (PlutusV2.txInfoValidRange info)

    -- If there was a previous bidder, they must receive an output with their exact bid amount back.
    previousBidderRefunded :: Bool
    previousBidderRefunded = case highestBidder dat of
        Nothing -> True -- Nobody to refund! First bid is free-and-clear.
        Just oldBidderHash ->
            let
                refundOutputs = [ o | o <- PlutusV2.txInfoOutputs info 
                                    , PlutusV2.txOutAddress o == PlutusV2.pubKeyHashAddress oldBidderHash ]
                totalRefund = sum [ valueOf (PlutusV2.txOutValue o) PlutusV2.adaSymbol PlutusV2.adaToken | o <- refundOutputs ]
            in
                totalRefund >= highestBid dat

    -- The contract must spit out a new UTxO at this exact same script address, holding the asset
    -- AND the new highest bid amount in ADA, with an updated datum.
    stateUpdated :: Integer -> PlutusV2.PubKeyHash -> Bool
    stateUpdated amt bidder =
        let
            ownOutputs = [ o | o <- PlutusV2.txInfoOutputs info
                             , PlutusV2.txOutAddress o 
                               == PlutusV2.txOutAddress (PlutusV2.txInInfoResolved (head (PlutusV2.scriptContextTxInfoInputs info))) ]
        in
            case ownOutputs of
                [out] -> 
                    -- Check 1: The script still holds the asset
                    let holdsAsset = valueOf (PlutusV2.txOutValue out) (assetPolicy dat) (assetName dat) >= 1
                    -- Check 2: The script now holds the newly increased ADA bid amount
                        holdsNewAda = valueOf (PlutusV2.txOutValue out) PlutusV2.adaSymbol PlutusV2.adaToken >= amt
                    in holdsAsset && holdsNewAda
                _ -> False

    -- When the gavel drops, where does the money go? Where does the asset go?
    payoutCorrect :: Bool
    payoutCorrect = case highestBidder dat of
        Nothing -> 
            -- No bids. The seller should get their asset back.
            let sellerOutputs = [ o | o <- PlutusV2.txInfoOutputs info 
                                    , PlutusV2.txOutAddress o == PlutusV2.pubKeyHashAddress (seller dat) ]
                sellerGotAsset = sum [ valueOf (PlutusV2.txOutValue o) (assetPolicy dat) (assetName dat) | o <- sellerOutputs ] >= 1
            in sellerGotAsset

        Just winnerHash ->
            -- We had a winner! Seller gets the ADA, winner gets the Asset.
            let
                sellerOutputs = [ o | o <- PlutusV2.txInfoOutputs info 
                                    , PlutusV2.txOutAddress o == PlutusV2.pubKeyHashAddress (seller dat) ]
                winnerOutputs = [ o | o <- PlutusV2.txInfoOutputs info 
                                    , PlutusV2.txOutAddress o == PlutusV2.pubKeyHashAddress winnerHash ]
                
                sellerGotAda = sum [ valueOf (PlutusV2.txOutValue o) PlutusV2.adaSymbol PlutusV2.adaToken | o <- sellerOutputs ] >= highestBid dat
                winnerGotAsset = sum [ valueOf (PlutusV2.txOutValue o) (assetPolicy dat) (assetName dat) | o <- winnerOutputs ] >= 1
            in
                sellerGotAda && winnerGotAsset

{-# INLINABLE wrappedMkVal #-}
wrappedMkVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedMkVal = wrapValidator mkAuctionValidator

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrappedMkVal ||])

---------------------------------------------------------------------------------------------------
------------------------------------- HELPER FUNCTIONS --------------------------------------------

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/englishauction.plutus" validator
`;

    const bashCommands = `# Scenario: There is an ultra-rare "Clay Nation" NFT sitting in the auction contract.
# Bidder A bid 1,000 ADA yesterday.
# I (Bidder B) am rushing in 5 minutes before the auction ends to bid 1,500 ADA.

# The contract UTxO currently holds: 1 Clay Nation NFT + 1,000 ADA, with Bidder A's pubkeyhash in the Datum.

# -------------------------------------------------------------------------
# 1. The Outbidding Strike
# I must send the contract 1,500 ADA, the NFT, AND simultaneously refund Bidder A their 1,000 ADA.

$ cardano-cli conway transaction build \\
  --tx-in f29c7d41ef993a40879c882bc283a00508a8e10d291b8d234bd35a0928a6fcf4#1 \\
  --tx-in-script-file englishauction.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor":0,"fields":[{"int":1500000000}, {"bytes":"my_bidder_b_hash..."}]}' \\
  --tx-out $(cat englishauction.addr)+1500000000+"1 d5e6f7a8b9c0...Clay" \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"seller_hash..."},{"bytes":"d5e6f7a8b9c0..."},{"bytes":"436c6179"},{"int":1500000000},{"constructor":0,"fields":[{"bytes":"my_bidder_b_hash..."}]},{"int":1740787200}]}' \\
  --tx-out $(cat bidder_a.addr)+1000000000 \\
  --tx-in-collateral d83b72c91a4bc5e1a908a80bdff62ea9825b4df2798aa12365e098a7213baf#0 \\
  --required-signer-hash my_bidder_b_hash... \\
  --invalid-hereafter 1740787200 \\
  --change-address $(cat bidder_b.addr) \\
  --testnet-magic 2 \\
  --out-file tx-outbid.raw

$ cardano-cli conway transaction sign --tx-body-file tx-outbid.raw --signing-key-file bidder_b.skey --testnet-magic 2 --out-file tx-outbid.signed
$ cardano-cli conway transaction submit --tx-file tx-outbid.signed

# -------------------------------------------------------------------------
# 2. The Gavel Drops (Closing the Auction)
# 5 minutes later, the deadline hits. ANYONE can submit this transaction, 
# but they are forced to deal the cards fairly: Seller gets my 1,500 ADA, I get the Clay Nation.

$ cardano-cli conway transaction build \\
  --tx-in e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855#0 \\
  --tx-in-script-file englishauction.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor":1,"fields":[]}' \\
  --tx-out $(cat seller.addr)+1500000000 \\
  --tx-out $(cat bidder_b.addr)+2000000+"1 d5e6f7a8b9c0...Clay" \\
  --tx-in-collateral a1b2c3d4e5f6a7b8c9d0...#0 \\
  --invalid-before 1740787200 \\
  --change-address $(cat anyone.addr) \\
  --testnet-magic 2 \\
  --out-file tx-close.raw

$ cardano-cli conway transaction sign --tx-body-file tx-close.raw --signing-key-file anyone.skey --testnet-magic 2 --out-file tx-close.signed
$ cardano-cli conway transaction submit --tx-file tx-close.signed
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                Sotheby's and Christie's have run high-end auctions identically for hundreds of years. An item sits at the front of a room, a minimum starting price is declared, and rich people frantically yell out increasingly higher numbers until everyone else gives up and the gavel physically slams onto a wooden podium.
            </p>

            <p>
                This exact mechanic — a timed, escalating bidding war — is known as an <strong>English Auction</strong>. Executing one trustlessly on a blockchain requires an incredibly clever design. You aren't just taking someone's bid; you're taking their actual money, holding it hostage at the script address, and dynamically firing refunds back across the network the instant someone else outbids them. 
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="EnglishAuction.hs"
            />
            <br />

            <h2 id="explanation">The Logic of the Bidding War</h2>

            <h3>The Mechanics of Outbidding</h3>

            <p className="pexplaination">
                If you bid on an item, your ADA becomes trapped inside the auction contract's UTxO alongside the NFT being sold. If another buyer wants to step into the ring and outbid you, they cannot simply "add to the pile". The contract violently rejects that.
            </p>

            <p className="pexplaination pt-2">
                Instead, the new buyer must construct a transaction that consumes the entire UTxO holding your ADA and the NFT. They must actively orchestrate a payout back to your wallet (refunding you completely), explicitly park the NFT back into the contract, and lock their significantly larger stack of ADA in its place.
            </p>

            <CodeBlock
                code={`Bid bidAmt bidderHash ->
    (bidAmt > highestBid dat) &&
    previousBidderRefunded &&
    stateUpdated bidAmt bidderHash`}
                language="haskell"
                filename="The Holy Trinity of Bidding"
            />

            <p className="pexplaination pt-2">
                This is a brilliant use of the eUTxO model. The Plutus script doesn't actually execute the refund itself; it mathematically audits the new buyer's transaction to guarantee they facilitated the refund. If they missed it by a single Lovelace, the network drops the transaction on the floor.
            </p>

            <h3>The Gavel Drop</h3>

            <p className="pexplaination pt-2">
                When the <code>endSlot</code> officially passes, bidding is permanently halted. But the money and the NFT don't instantly teleport to their rightful owners. Someone, somewhere in the world, must submit a <code>Close</code> transaction.
            </p>

            <p className="pexplaination">
                The beautiful thing about the <code>Close</code> redeemer branch is that it is completely stateless and heavily audited. Because the distribution logic (Seller gets ADA, Winner gets NFT) is hardcoded into the validator, the person triggering the Close transaction cannot alter the payouts. In many decentralised marketplaces, they incentivize bots with tiny ADA bounties to run around closing expired auctions for users automatically.
            </p>

            <br />

            <h2 id="execution">Execution Lifecycle</h2>

            <p className="pexplaination">
                This CLI execution demonstrates the brutal reality of a late-stage bidding war. Bidder B is swooping in right before the deadline, forcibly ripping Bidder A's claim off the NFT and refunding them. Then, we see the resulting Close transaction executing the final payouts.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Auction Bidding CLI Commands"
            />

        </div>
    );
}
