/* eslint-disable react-refresh/only-export-components */
import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "stateful-nft",
    title: "Stateful NFT",
    subtitle: "Building an NFT that levels up on-chain using Plutus datums",
    date: "2025-02-18T10:00:00.000Z",
    readTime: "8 min read",
    tags: ["plutus", "cardano", "nft", "state-machine", "intermediate"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=14",
    },
    plutusVersion: "V2",
    complexity: "Intermediate",
    useCase: "NFTs",

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

-- | The datum is basically a character sheet for the NFT. It tracks who owns it,
-- what level it's on, and which token it actually is (so nobody can swap fakes in).

data NFTDatum = NFTDatum
    { nftOwner     :: PlutusV2.PubKeyHash
    , nftName      :: BuiltinByteString
    , nftLevel     :: Integer
    , nftPolicyId  :: PlutusV2.CurrencySymbol
    , nftTokenName :: PlutusV2.TokenName
    }
PlutusTx.unstableMakeIsData ''NFTDatum

data NFTAction = Upgrade | Transfer PlutusV2.PubKeyHash
PlutusTx.unstableMakeIsData ''NFTAction

{-# INLINABLE mkStatefulNFTValidator #-}
mkStatefulNFTValidator :: NFTDatum -> NFTAction -> PlutusV2.ScriptContext -> Bool
mkStatefulNFTValidator dat action ctx =
    traceIfFalse "Not signed by the NFT owner!" signedByOwner &&
    traceIfFalse "NFT token must remain at the script!" nftStaysAtScript &&
    case action of
        Upgrade ->
            traceIfFalse "Level must increase by exactly 1!" levelIncremented &&
            traceIfFalse "Owner must not change during upgrade!" ownerPreserved

        Transfer newOwner ->
            traceIfFalse "New owner not set correctly!" (newOwnerSet newOwner) &&
            traceIfFalse "Level must not change during transfer!" levelPreserved
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    signedByOwner :: Bool
    signedByOwner = PlutusV2.txSignedBy info (nftOwner dat)

    continuingOutput :: PlutusV2.TxOut
    continuingOutput = case getContinuingOutputs ctx of
        [o] -> o
        _   -> PlutusV2.error ()

    newDatum :: NFTDatum
    newDatum = case PlutusV2.txOutDatum continuingOutput of
        PlutusV2.OutputDatum (PlutusV2.Datum rawDatum) ->
            case fromBuiltinData rawDatum of
                Just d  -> d
                Nothing -> PlutusV2.error ()
        _ -> PlutusV2.error ()

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

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/stateful_nft.plutus" validator
`;

    const bashCommands = `# 1. Lock an NFT at the script address with its initial state (Level 0)
# Datum fields: owner PKH, display name (hex), level, policy ID, token name
$ cardano-cli conway transaction build \\
  --tx-in 8a3b72cf19dd5e1b42a8e7f0c63d4152ba9010e4d8f56c71a2e390b7d4f18cde#0 \\
  --tx-out $(cat stateful_nft.addr)+"2000000 + 1 policy_id_hex.token_name_hex" \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"owner_pkh_aaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"bytes":"4d79447261676f6e"},{"int":0},{"bytes":"policy_id_hex_here_bbbbbbbbbbbbb"},{"bytes":"token_name_hex_ccccccccccccccc"}]}' \\
  --change-address addr_test1qpzphphgkze3t0kgmaj87tr3nyzqk7qjcw3gvecvgnxedfvgmlrd0 \\
  --testnet-magic 2 \\
  --out-file tx-lock-nft.raw

# ... sign and submit ...

-------------------------------------------------------------------------

# 2. Upgrade the NFT from Level 0 -> Level 1
# Redeemer: Upgrade -> {"constructor": 0, "fields": []}
# The output datum MUST have level = 1
$ cardano-cli conway transaction build \\
  --tx-in e7b4c21f891da5c032b6f14e80ac7d35f6e1920b4c87a5d3f092e18b6c43d7a1#0 \\
  --tx-in-script-file stateful_nft.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor": 0, "fields": []}' \\
  --tx-out $(cat stateful_nft.addr)+"2000000 + 1 policy_id_hex.token_name_hex" \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"owner_pkh_aaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"bytes":"4d79447261676f6e"},{"int":1},{"bytes":"policy_id_hex_here_bbbbbbbbbbbbb"},{"bytes":"token_name_hex_ccccccccccccccc"}]}' \\
  --required-signer-hash owner_pkh_aaaaaaaaaaaaaaaaaaaaaaaaaaaa \\
  --tx-in-collateral b5d2a18c7ef4930d126b8a5c49e71f36d0283b7e5c94a1f8d037e26c51b8f490#0 \\
  --change-address addr_test1hah6ux9qvla7cdpfyl7njqjgjmt4szkq3getvmmsccnrmycq0kh87 \\
  --testnet-magic 2 \\
  --out-file tx-upgrade-nft.raw

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
                Most NFTs are static. You mint them, they sit in your wallet with some metadata
                attached, and that's about it. On Cardano though, every UTxO carries a Datum,
                which means we can attach <em>mutable state</em> to an NFT and update it
                over time.
            </p>

            <p>
                This validator locks an NFT together with a datum that works like a character
                sheet. The owner can submit transactions to "level up" or transfer ownership.
                The script enforces the rules — only the owner signs, and the level can only
                go up by 1 at a time.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="StatefulNFT.hs"
            />
            <br />

            <h2 id="explanation">How It Works</h2>

            <h3>Why the token has to stay locked</h3>

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
                We store the <code>CurrencySymbol</code> and <code>TokenName</code> right
                in the datum so the validator always knows what to look for. This binds the
                token identity to the datum permanently.
            </p>

            <h3>Upgrade vs Transfer</h3>

            <p className="pexplaination pt-2">
                The redeemer gives two options: <code>Upgrade</code> bumps the level by 1 and
                keeps the same owner. <code>Transfer</code> changes the owner but freezes
                the level. You can't do both at once — the pattern match makes them
                mutually exclusive:
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

            <h2 id="execution">Execution</h2>

            <p className="pexplaination">
                You start by minting an NFT (using a separate minting policy) and then locking
                it at this script address with Level 0. After that, each upgrade consumes the
                old UTxO and produces a new one at the same address with the level incremented.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Stateful NFT CLI Commands"
            />

            <h3>The Continuing Output Pattern</h3>

            <p className="pexplaination pt-2">
                The upgrade transaction consumes the old UTxO with{" "}
                <code>--tx-in-script-file</code> and creates a new one at the same address
                with <code>--tx-out</code>. The NFT token has to move from input to output.
                If you forget to include it in the output, <code>nftStaysAtScript</code>{" "}
                rejects the whole thing.
            </p>

            <h2 id="summary">Summary</h2>

            <p>
                The Stateful NFT pattern is useful for any scenario where on-chain data
                needs to change over time while staying attached to a specific token —
                game characters, reputation scores, evolving art. The validator keeps
                the rules tight and the state machine predictable.
            </p>

        </div>
    );
}
