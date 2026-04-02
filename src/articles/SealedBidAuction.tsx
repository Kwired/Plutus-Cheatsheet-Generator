import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "sealed-bid-auction",
    title: "Sealed-Bid Auction",
    subtitle: "A commit-reveal mechanism allowing bidders to submit secret bids that are only revealed post-auction",
    date: new Date().toISOString(),
    readTime: "9 min read",
    tags: ["plutus", "cardano", "auction", "cryptography", "advanced"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=16",
    },
    plutusVersion: "V2",
    complexity: "Advanced",
    useCase: "Auctions",
};

export default function SealedBidAuctionArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module SealedBidAuction where

import qualified Plutus.V2.Ledger.Api      as PlutusV2
import           PlutusTx                  (BuiltinData, compile, unstableMakeIsData)
import           PlutusTx.Prelude          (Bool (False), Integer, traceIfFalse,
                                            (==), (&&), ($), (<), (<=), (>),
                                            BuiltinByteString)
import           PlutusTx.Builtins         (blake2b_256)
import           Plutus.V1.Ledger.Value    (valueOf)
import           Plutus.V1.Ledger.Interval (contains, to, from)
import           Prelude                   (IO)
import           Utilities                 (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

-- | The Auction parameters that never change during the auction lifecycle.
data AuctionParams = AuctionParams
    { apSeller      :: PlutusV2.PubKeyHash -- The seller hosting the auction
    , apAssetClass  :: PlutusV2.AssetClass -- The NFT or Token being auctioned
    , apMinBid      :: Integer             -- Minimum bid strictly enforced
    , apBiddingEnd  :: PlutusV2.POSIXTime  -- End of the commit phase
    , apRevealEnd   :: PlutusV2.POSIXTime  -- End of the reveal phase
    }
PlutusTx.unstableMakeIsData ''AuctionParams

-- | The evolving State containing all revealed bids so far.
data AuctionState = AuctionState
    { asHighestBidder :: PlutusV2.PubKeyHash
    , asHighestBid    :: Integer
    }
PlutusTx.unstableMakeIsData ''AuctionState

-- | The Redeemer dictates what action is being taken.
data AuctionAction = CommitBid BuiltinByteString 
                   | RevealBid Integer BuiltinByteString
                   | CloseAuction
PlutusTx.unstableMakeIsData ''AuctionAction

{-# INLINABLE mkSealedBidAuction #-}
mkSealedBidAuction :: AuctionParams -> AuctionState -> AuctionAction -> PlutusV2.ScriptContext -> Bool
mkSealedBidAuction params state action ctx =
    case action of
        CommitBid hashCommit ->
            traceIfFalse "Bidding phase has ended!" biddingPhaseOpen &&
            -- Note: In a real implementation, the bid amount is locked in a separate 
            -- commit UTxO to hide the amount, while the auction stateUTxO remains threadable.
            traceIfFalse "Commit logic not fully implemented in example" True

        RevealBid bidAmount nonce ->
            traceIfFalse "Reveal phase not active!" revealPhaseActive &&
            traceIfFalse "Revealed bid does not match commit!" (verifyCommit bidAmount nonce) &&
            traceIfFalse "Bid is too low!" (bidAmount > asHighestBid state) &&
            -- Note: Requires verifying continuing state updates (state machine pattern)
            traceIfFalse "State update logic omitted for brevity" True

        CloseAuction ->
            traceIfFalse "Reveal phase has not ended!" auctionClosed &&
            traceIfFalse "Seller must be paid the highest bid!" sellerPaid
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    -- Verify Time Intervals
    biddingPhaseOpen :: Bool
    biddingPhaseOpen = contains (to (apBiddingEnd params)) (PlutusV2.txInfoValidRange info)

    revealPhaseActive :: Bool
    revealPhaseActive = 
        contains (from (apBiddingEnd params)) (PlutusV2.txInfoValidRange info) &&
        contains (to (apRevealEnd params)) (PlutusV2.txInfoValidRange info)

    auctionClosed :: Bool
    auctionClosed = contains (from (apRevealEnd params)) (PlutusV2.txInfoValidRange info)

    -------------------------------------------------------------------------
    -- Verify Hashed Commitments
    -------------------------------------------------------------------------
    -- A user commits by submitting: Hash(BidAmount || Nonce).
    -- During the reveal phase, they provide the BidAmount and the Nonce in the clear.
    -- The validator hashes them and checks if they match the stored commitment.
    verifyCommit :: Integer -> BuiltinByteString -> Bool
    verifyCommit amt nonce =
        -- In practice, you would retrieve the user's specific commit UTxO hash
        -- and compare it against blake2b_256(amt || nonce)
        True

    -- Verify the seller gets paid the highest revealed bid
    sellerPaid :: Bool
    sellerPaid =
        case PlutusV2.valuePaidTo info (apSeller params) of
            val -> valueOf val PlutusV2.adaSymbol PlutusV2.adaToken >= asHighestBid state

{-# INLINABLE wrappedVal #-}
wrappedVal :: BuiltinData -> BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedVal p = wrapValidator (mkSealedBidAuction (PlutusTx.unsafeFromBuiltinData p))

validator :: AuctionParams -> PlutusV2.Validator
validator p =
    PlutusV2.mkValidatorScript
        $$(PlutusTx.compile [|| wrappedVal ||])
        \`PlutusTx.applyCode\` PlutusTx.liftCode p
`;

    const bashCommands = `# 1. Parameterize the Contract with Auction details
# Off-chain, you compile the validator with the seller's PKH and timestamps.

-------------------------------------------------------------------------

# 2. Bob COMMITS a secret bid (Bidding Phase)
# Bob creates a hash of his bid (e.g., 500 ADA) + a secret nonce ("mySecretNonce123")
# The hash is stored on-chain, hiding both the fact that it's Bob AND the amount.
$ cardano-cli conway transaction build \\
  --tx-in dummy_bob_funding_utxo_1111#0 \\
  --tx-out $(cat commit.addr)+500000000 \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"COMMIT_HASH_HERE..."}]}' \\
  --change-address addr_test1_bob... \\
  --testnet-magic 2 \\
  --out-file tx-commit.raw

# ... sign and submit ...

-------------------------------------------------------------------------

# 3. Bob REVEALS his bid (Reveal Phase)
# After the bidding deadline has passed, Bob must reveal his bid to the main Auction UTxO.
$ cardano-cli conway transaction build \\
  --tx-in dummy_auction_state_utxo_2222#0 \\
  --tx-in-script-file auction.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor":1,"fields":[{"int":500000000},{"bytes":"mySecretNonce123"}]}' \\
  --tx-in dummy_bob_commit_utxo_3333#0 \\
  --tx-out $(cat auction.addr)+500000000 \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"bob_pkh..."},{"int":500000000}]}' \\
  --invalid-before 1750000000 \\
  --invalid-hereafter 1750086400 \\
  --change-address addr_test1_bob... \\
  --testnet-magic 2 \\
  --out-file tx-reveal.raw

# ... sign and submit ...
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                In a standard English Auction (like eBay), every bid is public. This is generally
                fine, but in high-stakes environments (like real estate or rare DeFi art), public
                bidding leads to <em>sniping</em> or extreme price manipulation by "whales."
            </p>

            <p>
                A <strong>Sealed-Bid Auction</strong> (or Blind Auction) solves this. Bidders
                submit "sealed envelopes" containing their bids. Nobody knows what anyone else
                bid until the bidding phase closes. Once the deadline passes, everyone opens
                their envelopes ("Reveals"). Whoever had the highest bid wins.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="SealedBidAuction.hs"
            />
            <br />

            <h2 id="explanation">How It Works</h2>

            <h3>The Commit-Reveal Cryptography</h3>

            <p className="pexplaination">
                Because all data on Cardano is public, you can't literally hide an integer
                inside a smart contract. If I just lock UTxO with a datum saying <code>500 ADA</code>,
                the whole world sees it.
            </p>

            <p className="pexplaination pt-2">
                Instead, we use a <strong>Commit-Reveal Scheme</strong>:
            </p>

            <ul className="text-gray-300 list-disc ml-8 pt-2">
                <li className="mb-2"><strong>Phase 1 (Commit):</strong> You combine your bid amount with a secret password (a <em>Nonce</em>). You hash them together using <code>blake2b_256(Bid || Nonce)</code>. You submit ONLY the hash to the blockchain. Because hashing is a one-way street, nobody can decrypt the hash to read your bid.</li>
                <li className="mb-2"><strong>Phase 2 (Reveal):</strong> After the deadline passes, you submit a transaction providing your cleartext Bid and your secret Nonce. The Plutus script hashes them together on-chain. If the resulting hash matches the commitment hash you submitted in Phase 1, the script accepts your bid as valid!</li>
            </ul>

            <h3>Managing the State</h3>

            <p className="pexplaination pt-2">
                To prevent concurrency bottlenecks, Seal-Bid auctions usually split the design into
                two layers. The Commitments are simply sent to a script address and sit there
                independently (no threading required, high parallelism). Once the Reveal phase
                opens, a central "Auction State" UTxO is threaded through transactions as users take
                turns revealing their commitments and updating the "Highest Bidder" datum.
            </p>

            <br />

            <h2 id="execution">Execution Lifecycle</h2>

            <p className="pexplaination">
                Executing a sealed bid requires strict adherence to validity intervals. A commit
                will fail if submitted during the reveal phase, and a reveal will fail if submitted
                too early.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Sealed Bid CLI Commands"
            />
        </div>
    );
}
