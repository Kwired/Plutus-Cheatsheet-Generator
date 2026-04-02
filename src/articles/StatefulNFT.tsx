import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "stateful-nft",
    title: "Stateful NFT",
    subtitle: "An NFT whose on-chain metadata evolves over time, controlled exclusively by its owner",
    date: "2025-02-23T10:00:00.000Z",
    readTime: "8 min read",
    tags: ["plutus", "cardano", "nft", "state-machine", "intermediate"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=14",
    },
};

export default function StatefulNFTArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module StatefulNFT where

import qualified Plutus.V2.Ledger.Api      as PlutusV2
import           Plutus.V2.Ledger.Contexts (getContinuingOutputs)
import           PlutusTx                  (BuiltinData, compile, unstableMakeIsData,
                                            fromBuiltinData)
import           PlutusTx.Prelude          (Bool (False), Integer, BuiltinByteString,
                                            traceIfFalse, (==), (+), (&&), ($), (>=))
import           Plutus.V1.Ledger.Value    (valueOf)
import           Prelude                   (IO)
import           Utilities                 (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

-- The Datum stores the NFT's mutable state. Think of it like an RPG character sheet
-- living directly on the blockchain. The owner can "level up" their NFT by spending 
-- the UTxO and creating a new one with an updated datum.

data NFTDatum = NFTDatum
    { nftOwner     :: PlutusV2.PubKeyHash   -- Who owns this NFT
    , nftName      :: BuiltinByteString     -- The NFT's display name
    , nftLevel     :: Integer               -- Power level / evolution stage
    , nftPolicyId  :: PlutusV2.CurrencySymbol -- The NFT's minting policy (identity proof)
    , nftTokenName :: PlutusV2.TokenName      -- The NFT's token name
    }
PlutusTx.unstableMakeIsData ''NFTDatum

-- Two things an owner can do with their Stateful NFT
data NFTAction = Upgrade | Transfer PlutusV2.PubKeyHash
PlutusTx.unstableMakeIsData ''NFTAction

{-# INLINABLE mkStatefulNFTValidator #-}
mkStatefulNFTValidator :: NFTDatum -> NFTAction -> PlutusV2.ScriptContext -> Bool
mkStatefulNFTValidator dat action ctx =
    -- No matter what action, only the current owner can touch this NFT
    traceIfFalse "Not signed by the NFT owner!" signedByOwner &&
    -- The actual NFT token must travel with the datum (no separating them)
    traceIfFalse "NFT token must remain at the script!" nftStaysAtScript &&
    case action of
        Upgrade ->
            -- Owner is leveling up. The new datum must have level incremented by 1
            -- and ownership stays the same.
            traceIfFalse "Level must increase by exactly 1!" levelIncremented &&
            traceIfFalse "Owner must not change during upgrade!" ownerPreserved

        Transfer newOwner ->
            -- Owner is handing the NFT to someone else. The level stays the same,
            -- but the owner field updates to the new PubKeyHash.
            traceIfFalse "New owner not set correctly!" (newOwnerSet newOwner) &&
            traceIfFalse "Level must not change during transfer!" levelPreserved
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    signedByOwner :: Bool
    signedByOwner = PlutusV2.txSignedBy info (nftOwner dat)

    -- Extract the single continuing output back to this script
    continuingOutput :: PlutusV2.TxOut
    continuingOutput = case getContinuingOutputs ctx of
        [o] -> o
        _   -> PlutusV2.error ()

    -- Parse the new datum from the continuing output
    newDatum :: NFTDatum
    newDatum = case PlutusV2.txOutDatum continuingOutput of
        PlutusV2.OutputDatum (PlutusV2.Datum rawDatum) ->
            case fromBuiltinData rawDatum of
                Just d  -> d
                Nothing -> PlutusV2.error ()
        _ -> PlutusV2.error ()

    -- The actual NFT token must be present in the continuing output
    nftStaysAtScript :: Bool
    nftStaysAtScript =
        valueOf (PlutusV2.txOutValue continuingOutput) (nftPolicyId dat) (nftTokenName dat) >= 1

    levelIncremented :: Bool
    levelIncremented = nftLevel newDatum == nftLevel dat + 1

    ownerPreserved :: Bool
    ownerPreserved = nftOwner newDatum == nftOwner dat

    levelPreserved :: Bool
    levelPreserved = nftLevel newDatum == nftLevel dat

    newOwnerSet :: PlutusV2.PubKeyHash -> Bool
    newOwnerSet newOwner = nftOwner newDatum == newOwner

{-# INLINABLE wrappedMkVal #-}
wrappedMkVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedMkVal = wrapValidator mkStatefulNFTValidator

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrappedMkVal ||])

---------------------------------------------------------------------------------------------------
------------------------------------- HELPER FUNCTIONS --------------------------------------------

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/stateful_nft.plutus" validator
`;

    const bashCommands = `# 1. Lock an NFT at the Script with its initial state (Level 0)
# The datum stores owner hash, NFT name, starting level, policy ID, and token name.
# JSON Datum: {"constructor":0,"fields":[{"bytes":"owner_pkh_aaa..."},{"bytes":"4d79447261676f6e"},{"int":0},{"bytes":"policy_id_hex..."},{"bytes":"token_name_hex..."}]}

$ cardano-cli conway transaction build \\
  --tx-in dummy_tx_hash_uuid_here_1111111111111111#0 \\
  --tx-out $(cat stateful_nft.addr)+"2000000 + 1 policy_id_hex.token_name_hex" \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"owner_pkh_aaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"bytes":"4d79447261676f6e"},{"int":0},{"bytes":"policy_id_hex_here_bbbbbbbbbbbbb"},{"bytes":"token_name_hex_ccccccccccccccc"}]}' \\
  --change-address addr_test1_dummy_owner_address \\
  --testnet-magic 2 \\
  --out-file tx-lock-nft.raw

# ... sign and submit ...

-------------------------------------------------------------------------

# 2. Upgrade the NFT from Level 0 → Level 1
# Redeemer: Upgrade (Constructor 0) -> {"constructor": 0, "fields": []}
# The output datum MUST have level = 1, or the script rejects it.

$ cardano-cli conway transaction build \\
  --tx-in dummy_tx_hash_uuid_holding_nft_222222222#0 \\
  --tx-in-script-file stateful_nft.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor": 0, "fields": []}' \\
  --tx-out $(cat stateful_nft.addr)+"2000000 + 1 policy_id_hex.token_name_hex" \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"owner_pkh_aaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"bytes":"4d79447261676f6e"},{"int":1},{"bytes":"policy_id_hex_here_bbbbbbbbbbbbb"},{"bytes":"token_name_hex_ccccccccccccccc"}]}' \\
  --required-signer-hash owner_pkh_aaaaaaaaaaaaaaaaaaaaaaaaaaaa \\
  --tx-in-collateral dummy_collateral_hash_uuid_here_3333#0 \\
  --change-address addr_test1_dummy_owner_address \\
  --testnet-magic 2 \\
  --out-file tx-upgrade-nft.raw

# Sign with the owner's key
$ cardano-cli conway transaction sign \\
  --tx-body-file tx-upgrade-nft.raw \\
  --signing-key-file ../../../keys/owner.skey \\
  --testnet-magic 2 \\
  --out-file tx-upgrade-nft.signed

$ cardano-cli conway transaction submit --tx-file tx-upgrade-nft.signed
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                Most people think of NFTs as static images glued to a blockchain. On Cardano,
                that's only the beginning. Because every UTxO can carry a <strong>Datum</strong> — an
                arbitrary chunk of structured data — we can build NFTs that <em>evolve</em>.
            </p>

            <p>
                The <strong>Stateful NFT</strong> validator locks an NFT token together with a
                datum that acts like a character sheet. The owner can "level up" their NFT by
                submitting a transaction that consumes the old state and produces a new UTxO
                with the level incremented. Nobody else can touch it — only the owner's
                signature unlocks the upgrade path.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="StatefulNFT.hs"
            />
            <br />

            <h2 id="explanation">How It Works</h2>

            <h3>NFT Identity Is Enforced, Not Assumed</h3>

            <p className="pexplaination">
                An important detail: the validator doesn't just check signatures
                and levels. It also verifies that the actual NFT token stays locked at
                the script address in the continuing output. Without this, an attacker
                could strip the token out of the UTxO, leaving behind
                an empty datum.
            </p>

            <CodeBlock
                code={`nftStaysAtScript =
    valueOf (PlutusV2.txOutValue continuingOutput)
            (nftPolicyId dat) (nftTokenName dat) >= 1`}
                language="haskell"
                filename="Token Guard"
            />

            <p className="pexplaination">
                By storing the <code>CurrencySymbol</code> and <code>TokenName</code> directly
                in the datum, the validator can always look up the continuing output's value
                and confirm the NFT is still there. This binds the token's identity to the
                datum permanently.
            </p>

            <h3>Two Paths, One Owner</h3>

            <p className="pexplaination pt-2">
                The redeemer gives the owner two choices: <code>Upgrade</code> or{" "}
                <code>Transfer</code>. During an upgrade, the level must go up by exactly 1
                and the owner field stays the same. During a transfer, the level stays
                frozen but the owner field flips to the new <code>PubKeyHash</code>.
                You can't do both at once — the Haskell pattern match enforces
                mutual exclusivity.
            </p>

            <CodeBlock
                code={`case action of
    Upgrade ->
        levelIncremented && ownerPreserved
    Transfer newOwner ->
        newOwnerSet newOwner && levelPreserved`}
                language="haskell"
                filename="Action Routing"
            />

            <p className="pexplaination">
                This prevents an attack where someone transfers AND levels up in the same
                transaction—trying to sneak in a stat boost during a sale. The validator
                rejects it.
            </p>

            <br />

            <h2 id="execution">Execution Lifecycle</h2>

            <p className="pexplaination">
                The lifecycle starts by locking a minted NFT at the script address with
                an initial datum (Level 0). From there, the owner submits upgrade
                transactions to evolve it over time.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Stateful NFT CLI Commands"
            />

            <h3>The Continuing Output Pattern</h3>

            <p className="pexplaination pt-2">
                Notice how the upgrade transaction must both <em>consume</em> the old UTxO
                (via <code>--tx-in-script-file</code>) and <em>create</em> a new one at
                the same script address (via <code>--tx-out</code>) with the updated datum.
                The NFT token must travel from input to output. If you forget to include
                the token in the output, the <code>nftStaysAtScript</code> check blocks
                the entire transaction.
            </p>

        </div>
    );
}
