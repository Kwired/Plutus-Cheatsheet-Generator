/* eslint-disable react-refresh/only-export-components */
import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "royalty-enforcer",
    title: "Royalty Enforcer",
    subtitle: "Script-level royalty enforcement for NFT sales on Cardano",
    date: "2025-02-23T15:00:00.000Z",
    readTime: "7 min read",
    tags: ["plutus", "cardano", "nft", "royalties", "intermediate"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=20",
    },
    plutusVersion: "V2",
    complexity: "Intermediate",
    useCase: "NFTs",

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

-- | Royalty terms: creator address, which NFT, royalty percentage in basis points.
-- The NFT stays locked at this script forever. Only the currentOwner field changes.

data RoyaltyDatum = RoyaltyDatum
    { creator        :: PlutusV2.PubKeyHash
    , nftPolicyId    :: PlutusV2.CurrencySymbol
    , nftTokenName   :: PlutusV2.TokenName
    , royaltyBps     :: Integer       -- 500 = 5%, 10000 = 100%
    , currentOwner   :: PlutusV2.PubKeyHash
    }
PlutusTx.unstableMakeIsData ''RoyaltyDatum

data RoyaltyAction = Sell
    { salePrice  :: Integer
    , newBuyer   :: PlutusV2.PubKeyHash
    }
PlutusTx.unstableMakeIsData ''RoyaltyAction

{-# INLINABLE mkRoyaltyValidator #-}
mkRoyaltyValidator :: RoyaltyDatum -> RoyaltyAction -> PlutusV2.ScriptContext -> Bool
mkRoyaltyValidator dat (Sell price buyer) ctx =
    traceIfFalse "Only the current owner can sell!" signedByOwner &&
    traceIfFalse "Creator royalty not paid!" royaltyPaid &&
    traceIfFalse "Seller not paid correctly!" sellerPaid &&
    traceIfFalse "NFT must stay at the script with updated owner!" nftRelockedCorrectly
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    signedByOwner :: Bool
    signedByOwner = PlutusV2.txSignedBy info (currentOwner dat)

    -- (price * bps) / 10000
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

    nftRelockedCorrectly :: Bool
    nftRelockedCorrectly = case getContinuingOutputs ctx of
        [output] ->
            valueOf (PlutusV2.txOutValue output) (nftPolicyId dat) (nftTokenName dat) >= 1 &&
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

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/royalty.plutus" validator
`;

    const bashCommands = `# 1. Lock the NFT at the royalty script
# Datum: creator, NFT policy, token name, 500 bps (5%), initial owner = creator
$ cardano-cli conway transaction build \\
  --tx-in abcdef1234567890abcdef1234564a7b1c2d3e8f90a5b6c7d8e9f01234567890#0 \\
  --tx-out $(cat royalty.addr)+"2000000 + 1 nft_policy_hex.DragonKnight" \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"creator_pkh_aaa..."},{"bytes":"nft_policy_hex_bbb..."},{"bytes":"447261676f6e4b6e69676874"},{"int":500},{"bytes":"creator_pkh_aaa..."}]}' \\
  --change-address addr_test1_creator_address \\
  --testnet-magic 2 \\
  --out-file tx-lock-nft-royalty.raw

# ... sign and submit ...

-------------------------------------------------------------------------

# 2. Sell for 100 ADA — creator gets 5 ADA, seller gets 95 ADA
# Redeemer: Sell {price: 100000000, newBuyer: buyer_pkh}
$ cardano-cli conway transaction build \\
  --tx-in 1234564a7b1c2d3e8f90a5b6c7d8e9f01234567890abcdef1234567890abcdef#0 \\
  --tx-in-script-file royalty.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor":0,"fields":[{"int":100000000},{"bytes":"buyer_pkh_ddd..."}]}' \\
  --tx-in 7b1c2d3e8f90a5b6c7d8e9f01234567890abcdef1234567890abcdef1234564a#0 \\
  --tx-out addr_test1_creator_address+5000000 \\
  --tx-out addr_test1_seller_address+95000000 \\
  --tx-out $(cat royalty.addr)+"2000000 + 1 nft_policy_hex.DragonKnight" \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"creator_pkh_aaa..."},{"bytes":"nft_policy_hex_bbb..."},{"bytes":"447261676f6e4b6e69676874"},{"int":500},{"bytes":"buyer_pkh_ddd..."}]}' \\
  --required-signer-hash creator_pkh_aaa \\
  --tx-in-collateral 2d3e8f90a5b6c7d8e9f01234567890abcdef1234567890abcdef1234564a7b1c#0 \\
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
                On platforms like OpenSea, royalties are enforced by the marketplace,
                not the blockchain. If someone sells the NFT on a different platform
                that doesn't respect royalties, the creator gets nothing.
            </p>

            <p>
                On Cardano, the <strong>Royalty Enforcer</strong> locks
                the NFT inside a validator that guarantees the
                creator receives their cut on every sale. The NFT can't leave
                the script without the royalty being paid — it's enforced at the
                protocol level.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="RoyaltyEnforcer.hs"
            />
            <br />

            <h2 id="explanation">How It Works</h2>

            <h3>Basis points</h3>

            <p className="pexplaination">
                Royalty percentage is in basis points (bps) where 10,000 = 100%. A 5%
                royalty is 500 bps. The math avoids any floating point:
            </p>

            <CodeBlock
                code={`royaltyAmount = divide (price * royaltyBps dat) 10000

-- 100 ADA sale at 5%:
-- divide (100_000_000 * 500) 10000 = 5_000_000 lovelace = 5 ADA`}
                language="haskell"
                filename="Royalty Math"
            />

            <h3>The Lock Pattern</h3>

            <p className="pexplaination pt-2">
                The NFT never touches a regular wallet. Every sale consumes the old UTxO
                (NFT + old owner datum) and creates a new one at the same script address
                (NFT + new owner datum). The validator verifies four things at once:
                the token is still there, and the creator/policy/tokenName/bps fields
                are unchanged — only <code>currentOwner</code> flips to the buyer.
            </p>

            <CodeBlock
                code={`nftRelockedCorrectly = case getContinuingOutputs ctx of
    [output] ->
        valueOf (...) >= 1 &&           -- token present
        creator newDat == creator dat && -- immutable
        royaltyBps newDat == royaltyBps dat && -- immutable
        currentOwner newDat == buyer     -- updated`}
                language="haskell"
                filename="Re-Lock Check"
            />

            <p className="pexplaination">
                Both payments are verified too — creator gets at least{" "}
                <code>royaltyAmount</code>, seller gets at least{" "}
                <code>price - royaltyAmount</code>. Setting a fake price of 0 to skip
                royalties would also zero out the seller's payment, so nobody benefits
                from gaming it.
            </p>

            <br />

            <h2 id="execution">Execution</h2>

            <p className="pexplaination">
                Creator locks the NFT once with their royalty terms baked in. Every
                subsequent sale routes the royalty automatically.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Royalty Enforcer CLI Commands"
            />

            <h2 id="limitations">Limitations</h2>

            <p className="pexplaination">
                The trade-off: the NFT is permanently locked at the script address. Standard
                wallets won't display it as a normal NFT in your collection. You'd need
                a front-end that understands this script and queries the datum to show
                ownership. For projects where royalty enforcement is a hard requirement,
                that's an acceptable trade-off. For casual collectibles it might not be.
            </p>

        </div>
    );
}
