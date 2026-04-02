import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "stateful-marketplace",
    title: "Stateful Marketplace",
    subtitle: "A decentralized marketplace utilizing threaded state to securely track active listings, bids, and sales",
    date: new Date().toISOString(),
    readTime: "11 min read",
    tags: ["plutus", "cardano", "marketplace", "state-machine", "advanced"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=16",
    },
    plutusVersion: "V2",
    complexity: "Advanced",
    useCase: "Marketplace",
};

export default function StatefulMarketplaceArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module StatefulMarketplace where

import qualified Plutus.V2.Ledger.Api      as PlutusV2
import           PlutusTx                  (BuiltinData, compile, unstableMakeIsData)
import           PlutusTx.Prelude          (Bool (False), Integer, traceIfFalse,
                                            (==), (&&), ($), (<), (>=), Maybe(..))
import           Plutus.V1.Ledger.Value    (valueOf)
import           Plutus.V2.Ledger.Contexts (getContinuingOutputs)
import           Prelude                   (IO)
import           Utilities                 (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

-- | A marketplace handles thousands of listings. 
-- Rather than one giant state, we create individual UTxOs for each listed asset.

-- | The Parameters define the marketplace itself (e.g., fee collection).
data MarketplaceParams = MarketplaceParams
    { mpFeeAddress :: PlutusV2.PubKeyHash -- Marketplace owner's address
    , mpFeePct     :: Integer             -- e.g., 2 (2%)
    }
PlutusTx.unstableMakeIsData ''MarketplaceParams

-- | The State Datum tracks the current status of a specific listing.
data ListingDatum = ListingDatum
    { ldSeller     :: PlutusV2.PubKeyHash
    , ldAsset      :: PlutusV2.AssetClass -- The NFT/Token being sold
    , ldPrice      :: Integer             -- Asking price in Lovelace
    }
PlutusTx.unstableMakeIsData ''ListingDatum

-- | Actions users can take against this listing.
data MarketAction = Buy | UpdatePrice Integer | Cancel
PlutusTx.unstableMakeIsData ''MarketAction

{-# INLINABLE mkMarketplaceValidator #-}
mkMarketplaceValidator :: MarketplaceParams -> ListingDatum -> MarketAction -> PlutusV2.ScriptContext -> Bool
mkMarketplaceValidator params dat action ctx =
    case action of
        Buy ->
            traceIfFalse "Seller not paid the correct amount!" sellerPaid &&
            traceIfFalse "Marketplace fee not paid!" feePaid

        UpdatePrice newPrice ->
            traceIfFalse "Only seller can update price!" sellerSigned &&
            traceIfFalse "Listing state not properly updated!" (stateUpdated newPrice)

        Cancel ->
            traceIfFalse "Only seller can cancel listing!" sellerSigned &&
            traceIfFalse "Seller must get their asset back!" assetReturned
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    sellerSigned :: Bool
    sellerSigned = PlutusV2.txSignedBy info (ldSeller dat)

    -------------------------------------------------------------------------
    -- Verify Payments
    -------------------------------------------------------------------------
    -- The buyer must pay the asking price.
    sellerPaid :: Bool
    sellerPaid =
        let valueToSeller = PlutusV2.valuePaidTo info (ldSeller dat)
        in valueOf valueToSeller PlutusV2.adaSymbol PlutusV2.adaToken >= ldPrice dat

    -- The buyer must also pay the marketplace fee (Price * Fee% / 100)
    feePaid :: Bool
    feePaid =
        let feeValue = (ldPrice dat * mpFeePct params) \`PlutusTx.Prelude.divide\` 100
            valueToMarket = PlutusV2.valuePaidTo info (mpFeeAddress params)
        in valueOf valueToMarket PlutusV2.adaSymbol PlutusV2.adaToken >= feeValue

    -------------------------------------------------------------------------
    -- Verify State Threading (Updating Price)
    -------------------------------------------------------------------------
    stateUpdated :: Integer -> Bool
    stateUpdated newPrice = case getContinuingOutputs ctx of
        [output] -> case PlutusV2.txOutDatum output of
            PlutusV2.OutputDatum (PlutusV2.Datum rawDatum) ->
                case PlutusTx.fromBuiltinData rawDatum of
                    Just (ListingDatum s a p) -> 
                        -- Ensure Seller and Asset remain exactly the same. Only price changes.
                        s == ldSeller dat && a == ldAsset dat && p == newPrice
                    Nothing -> False
            _ -> False
        _ -> traceIfFalse "Expected exactly one continuing output" False

    -------------------------------------------------------------------------
    -- Verify Asset Return (Cancellation)
    -------------------------------------------------------------------------
    assetReturned :: Bool
    assetReturned =
        let valueReturned = PlutusV2.valuePaidTo info (ldSeller dat)
        in valueOf valueReturned (PlutusV2.assetClassCurrency (ldAsset dat))
                                 (PlutusV2.assetClassName (ldAsset dat)) >= 1

{-# INLINABLE wrappedVal #-}
wrappedVal :: BuiltinData -> BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedVal p = wrapValidator (mkMarketplaceValidator (PlutusTx.unsafeFromBuiltinData p))

validator :: MarketplaceParams -> PlutusV2.Validator
validator p =
    PlutusV2.mkValidatorScript
        $$(PlutusTx.compile [|| wrappedVal ||])
        \`PlutusTx.applyCode\` PlutusTx.liftCode p
`;

    const bashCommands = `# 1. INITIALIZE (List an NFT)
# Seller locks the NFT in the marketplace with a datum (Price: 100 ADA)
$ cardano-cli conway transaction build \\
  --tx-in dummy_seller_nft_utxo_1111#0 \\
  --tx-out $(cat marketplace.addr)+"2000000 + 1 space_budz_policy.SpaceBudz#1337" \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"seller_pkh_aaa..."},{"fields":[{"bytes":"space_budz_policy"},{"bytes":"SpaceBudz#1337"}],"constructor":0},{"int":100000000}]}' \\
  --change-address addr_test1_seller... \\
  --testnet-magic 2 \\
  --out-file tx-list.raw

# ... sign and submit ...

-------------------------------------------------------------------------

# 2. UPDATE STATE (Seller drops price to 75 ADA)
# We consume the script input, and thread it to a Continuing Output at the same address.
$ cardano-cli conway transaction build \\
  --tx-in dummy_listing_utxo_2222#0 \\
  --tx-in-script-file marketplace.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor":1,"fields":[{"int":75000000}]}' \\
  --tx-out $(cat marketplace.addr)+"2000000 + 1 space_budz_policy.SpaceBudz#1337" \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"seller_pkh_aaa..."},{"fields":[{"bytes":"space_budz_policy"},{"bytes":"SpaceBudz#1337"}],"constructor":0},{"int":75000000}]}' \\
  --required-signer-hash seller_pkh_aaa... \\
  --tx-in-collateral dummy_seller_collateral_utxo_3333#0 \\
  --change-address addr_test1_seller... \\
  --testnet-magic 2 \\
  --out-file tx-update.raw

# ... sign and submit ...

-------------------------------------------------------------------------

# 3. BUY (Buyer purchases the NFT)
$ cardano-cli conway transaction build \\
  --tx-in dummy_listing_utxo_updated#0 \\
  --tx-in-script-file marketplace.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor":0,"fields":[]}' \\
  --tx-in dummy_buyer_ada_utxo_4444#0 \\
  --tx-out addr_test1_seller...+75000000 \\
  --tx-out addr_test1_marketplace...+1500000 \\
  --tx-out addr_test1_buyer...+"2000000 + 1 space_budz_policy.SpaceBudz#1337" \\
  --tx-in-collateral dummy_buyer_collateral_utxo_5555#0 \\
  --change-address addr_test1_buyer... \\
  --testnet-magic 2 \\
  --out-file tx-buy.raw

# ... sign and submit ...
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                A decentralized marketplace (like JPG Store or Minswap) handles millions of 
                dollars in volume. On Ethereum, global state arrays track thousands of listings
                within a single massive smart contract. On Cardano, doing that would cause immediate
                concurrency bottlenecks.
            </p>

            <p>
                To utilize the eUTxO model effectively, a <strong>Stateful Marketplace</strong> shards
                its state horizontally. Each active listing is its <em>own independent UTxO</em> living
                at the marketplace script address. Bids, updates, and sales occur in parallel across
                thousands of independent UTxOs.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="StatefulMarketplace.hs"
            />
            <br />

            <h2 id="explanation">How Threaded State Works</h2>

            <h3>The Listing Datum</h3>

            <p className="pexplaination">
                When a user wants to sell an NFT, they lock the NFT at the marketplace validator
                address. They attach a Datum (<code>ListingDatum</code>) that essentially says:
                "I am the owner. This is the NFT class. My asking price is 100 ADA."
            </p>

            <p className="pexplaination pt-2">
                This Datum acts as the verifiable truth of the listing. The validator only exists
                to enforce the rules imposed by that Datum.
            </p>

            <h3>Updating the Price via State Threading</h3>

            <ul className="text-gray-300 list-disc ml-8 pt-2">
                <li className="mb-2"><strong>The Problem:</strong> What if the seller wants to lower the price? Do they have to cancel the listing, get the NFT back, pay fees, and submit a brand new listing transaction?</li>
                <li className="mb-2"><strong>The Solution:</strong> State Threading. The seller triggers the <code>UpdatePrice</code> redeemer. The validator uses <code>getContinuingOutputs</code> to verify that the listing UTxO is being "re-created" at the exact same script address with the exact same NFT, but with a new Price encoded in the Datum.</li>
            </ul>

            <p className="pexplaination pt-2">
                This is a highly efficient way to manage lifecycle state on Cardano. The UTxO is
                consumed and immediately recreated on the other side of the transaction with updated
                Datum variables.
            </p>

            <br />

            <h2 id="execution">Execution Lifecycle</h2>

            <p className="pexplaination">
                Executing a marketplace lifecycle involves carefully constructing inputs and outputs.
                For a purchase, the buyer's wallet software constructs a transaction ensuring the
                seller receives the <code>ldPrice</code> and the marketplace treasury receives its
                royalties. The validator simply signs off on the accounting.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Marketplace CLI Commands"
            />
        </div>
    );
}
