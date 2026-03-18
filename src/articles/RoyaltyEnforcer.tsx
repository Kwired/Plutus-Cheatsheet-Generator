import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "royalty-enforcer",
    title: "Royalty Enforcer",
    subtitle: "A validator that guarantees creators receive a percentage of every NFT sale — forever",
    date: "2025-02-23T16:00:00.000Z",
    readTime: "7 min read",
    tags: ["plutus", "cardano", "nft", "royalties", "intermediate"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=20",
    },
};

export default function RoyaltyEnforcerArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module RoyaltyEnforcer where

import qualified Plutus.V2.Ledger.Api      as PlutusV2
import           Plutus.V2.Ledger.Contexts (getContinuingOutputs)
import           PlutusTx                  (BuiltinData, compile, unstableMakeIsData,
                                            fromBuiltinData)
import           PlutusTx.Prelude          (Bool (False), Integer,
                                            traceIfFalse, (==), (&&), ($), (>=),
                                            divide, (*))
import           Plutus.V1.Ledger.Value    (valueOf)
import           Prelude                   (IO)
import           Utilities                 (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

-- The Datum stores the royalty terms: who the creator is, what NFT this applies to,
-- and what percentage of every sale goes to the creator.

data RoyaltyDatum = RoyaltyDatum
    { creator        :: PlutusV2.PubKeyHash       -- Creator's wallet
    , nftPolicyId    :: PlutusV2.CurrencySymbol   -- The NFT collection policy
    , nftTokenName   :: PlutusV2.TokenName        -- Specific NFT token name
    , royaltyBps     :: Integer                   -- Royalty in basis points (500 = 5%)
    , currentOwner   :: PlutusV2.PubKeyHash       -- Who currently owns the NFT
    }
PlutusTx.unstableMakeIsData ''RoyaltyDatum

-- The Redeemer declares the sale price so the validator can calculate the royalty cut
data RoyaltyAction = Sell
    { salePrice  :: Integer                       -- Sale price in Lovelace
    , newBuyer   :: PlutusV2.PubKeyHash           -- Who is buying the NFT
    }
PlutusTx.unstableMakeIsData ''RoyaltyAction

{-# INLINABLE mkRoyaltyValidator #-}
mkRoyaltyValidator :: RoyaltyDatum -> RoyaltyAction -> PlutusV2.ScriptContext -> Bool
mkRoyaltyValidator dat (Sell price buyer) ctx =
    -- Only the current owner can initiate a sale
    traceIfFalse "Only the current owner can sell!" signedByOwner &&

    -- The creator must receive their royalty cut
    traceIfFalse "Creator royalty not paid!" royaltyPaid &&

    -- The seller must receive the sale price minus the royalty
    traceIfFalse "Seller not paid correctly!" sellerPaid &&

    -- The NFT must remain at the script address with updated ownership
    traceIfFalse "NFT must stay at the script with updated owner!" nftRelockedCorrectly
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    signedByOwner :: Bool
    signedByOwner = PlutusV2.txSignedBy info (currentOwner dat)

    -- Calculate royalty: (price * bps) / 10000
    -- 500 bps = 5%, so for a 100 ADA sale: (100_000_000 * 500) / 10000 = 5_000_000
    royaltyAmount :: Integer
    royaltyAmount = divide (price * royaltyBps dat) 10000

    royaltyPaid :: Bool
    royaltyPaid =
        valueOf (PlutusV2.valuePaidTo info (creator dat))
                PlutusV2.adaSymbol PlutusV2.adaToken >= royaltyAmount

    sellerPaid :: Bool
    sellerPaid =
        valueOf (PlutusV2.valuePaidTo info (currentOwner dat))
                PlutusV2.adaSymbol PlutusV2.adaToken >= (price - royaltyAmount)

    -- The NFT must return to this same script, with the owner updated to the buyer
    nftRelockedCorrectly :: Bool
    nftRelockedCorrectly = case getContinuingOutputs ctx of
        [output] ->
            -- NFT token is present in the output
            valueOf (PlutusV2.txOutValue output) (nftPolicyId dat) (nftTokenName dat) >= 1 &&
            -- New datum has the buyer as the current owner
            case PlutusV2.txOutDatum output of
                PlutusV2.OutputDatum (PlutusV2.Datum rawDatum) ->
                    case fromBuiltinData rawDatum of
                        Just newDat ->
                            creator newDat     == creator dat &&
                            nftPolicyId newDat == nftPolicyId dat &&
                            nftTokenName newDat == nftTokenName dat &&
                            royaltyBps newDat  == royaltyBps dat &&
                            currentOwner newDat == buyer
                        Nothing -> False
                _ -> False
        _ -> False

{-# INLINABLE wrappedMkVal #-}
wrappedMkVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedMkVal = wrapValidator mkRoyaltyValidator

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrappedMkVal ||])

---------------------------------------------------------------------------------------------------
------------------------------------- HELPER FUNCTIONS --------------------------------------------

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/royalty.plutus" validator
`;

    const bashCommands = `# 1. Lock the NFT at the Royalty Script with initial ownership
# Datum: creator PKH, NFT policy, token name, 500 bps (5%), current owner = creator
$ cardano-cli conway transaction build \\
  --tx-in dummy_tx_hash_uuid_here_1111111111111111#0 \\
  --tx-out $(cat royalty.addr)+"2000000 + 1 nft_policy_hex.DragonKnight" \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"creator_pkh_aaa..."},{"bytes":"nft_policy_hex_bbb..."},{"bytes":"447261676f6e4b6e69676874"},{"int":500},{"bytes":"creator_pkh_aaa..."}]}' \\
  --change-address addr_test1_creator_address \\
  --testnet-magic 2 \\
  --out-file tx-lock-nft-royalty.raw

# ... sign and submit ...

-------------------------------------------------------------------------

# 2. Sell the NFT for 100 ADA — Creator automatically gets 5 ADA royalty
# Redeemer: Sell {price: 100000000, newBuyer: buyer_pkh}
$ cardano-cli conway transaction build \\
  --tx-in dummy_royalty_utxo_hash_2222222222222222#0 \\
  --tx-in-script-file royalty.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor":0,"fields":[{"int":100000000},{"bytes":"buyer_pkh_ddd..."}]}' \\
  --tx-in dummy_buyer_funding_utxo_333333333333333#0 \\
  --tx-out addr_test1_creator_address+5000000 \\
  --tx-out addr_test1_seller_address+95000000 \\
  --tx-out $(cat royalty.addr)+"2000000 + 1 nft_policy_hex.DragonKnight" \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"creator_pkh_aaa..."},{"bytes":"nft_policy_hex_bbb..."},{"bytes":"447261676f6e4b6e69676874"},{"int":500},{"bytes":"buyer_pkh_ddd..."}]}' \\
  --required-signer-hash creator_pkh_aaa \\
  --tx-in-collateral dummy_collateral_hash_uuid_here_4444#0 \\
  --change-address addr_test1_seller_address \\
  --testnet-magic 2 \\
  --out-file tx-sell-nft.raw

$ cardano-cli conway transaction sign \\
  --tx-body-file tx-sell-nft.raw \\
  --signing-key-file ../../../keys/seller.skey \\
  --testnet-magic 2 \\
  --out-file tx-sell-nft.signed

$ cardano-cli conway transaction submit --tx-file tx-sell-nft.signed
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                On platforms like OpenSea, creators set royalty percentages on their NFTs.
                But here's the dirty secret: those royalties are enforced by the <em>marketplace</em>,
                not by the blockchain. If someone sells the NFT on a different platform
                that ignores royalties, the creator gets nothing.
            </p>

            <p>
                On Cardano, we can do better. The <strong>Royalty Enforcer</strong> locks
                the NFT inside a validator that <em>mathematically guarantees</em> the
                creator receives their cut on every single sale. The NFT can never leave
                the script without the royalty being paid. It's not a suggestion — it's
                cryptographic law.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="RoyaltyEnforcer.hs"
            />
            <br />

            <h2 id="explanation">How It Really Works</h2>

            <h3>Basis Points for Precision</h3>

            <p className="pexplaination">
                The royalty is specified in <strong>basis points</strong> (bps), where
                10,000 bps = 100%. This is the same standard used in traditional finance.
                A 5% royalty is 500 bps. The math is simple and avoids floating-point
                issues that don't exist in Plutus anyway:
            </p>

            <CodeBlock
                code={`royaltyAmount = divide (price * royaltyBps dat) 10000

-- Example: 100 ADA sale at 5% royalty
-- divide (100_000_000 * 500) 10000 = 5_000_000 Lovelace = 5 ADA`}
                language="haskell"
                filename="Royalty Calculation"
            />

            <h3>The NFT Prison Pattern</h3>

            <p className="pexplaination pt-2">
                The key insight is that the NFT <em>never leaves the script</em>. Every
                sale is really a state update: the old UTxO (NFT + old owner datum) is
                consumed, and a new UTxO (NFT + new owner datum) is created at the same
                script address. The validator verifies four things simultaneously:
            </p>

            <CodeBlock
                code={`nftRelockedCorrectly = case getContinuingOutputs ctx of
    [output] ->
        -- 1. NFT token is still there
        valueOf (...) >= 1 &&
        -- 2-5. Datum preserved (creator, policy, token, bps)
        --       except currentOwner flips to the buyer
        currentOwner newDat == buyer`}
                language="haskell"
                filename="Re-Locking Verification"
            />

            <p className="pexplaination">
                The royalty terms (creator address, percentage) are{" "}
                <strong>immutable</strong> — the validator rejects any attempt to change
                them. Only the <code>currentOwner</code> field is allowed to change. This
                means the creator's royalty rights are permanently locked in, across
                unlimited future sales.
            </p>

            <h3>Guaranteed Dual Payment</h3>

            <p className="pexplaination pt-2">
                The validator checks both sides: the creator receives at least{" "}
                <code>royaltyAmount</code> in ADA, and the seller receives at least{" "}
                <code>price - royaltyAmount</code>. Using <code>valuePaidTo</code> for
                both ensures neither party can be shortchanged. If the buyer tries to
                set a fake price of 0 to avoid royalties, the seller's payment check
                would fail.
            </p>

            <br />

            <h2 id="execution">Execution Lifecycle</h2>

            <p className="pexplaination">
                The creator locks their NFT once, setting the royalty terms. From that
                point on, every subsequent sale automatically routes the royalty cut
                without any involvement from the creator.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Royalty Enforcer CLI Commands"
            />

            <h3>The Trade-Off</h3>

            <p className="pexplaination pt-2">
                The downside of this pattern is that the NFT is permanently script-locked.
                It can't sit in a regular wallet — it always lives at the script address,
                with the datum tracking who "owns" it. This means standard wallets won't
                show it as a normal NFT. You'd need a specialized front-end that understands
                the royalty script. But the trade-off is ironclad royalty enforcement that
                no marketplace can circumvent.
            </p>

        </div>
    );
}
