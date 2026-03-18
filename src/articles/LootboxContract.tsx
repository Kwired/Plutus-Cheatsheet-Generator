/* eslint-disable react-refresh/only-export-components */
import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "lootbox-contract",
    title: "Lootbox Contract",
    subtitle: "On-chain mystery box with transparent pseudo-random reward selection",
    date: "2025-02-20T16:00:00.000Z",
    readTime: "7 min read",
    tags: ["plutus", "cardano", "nft", "randomness", "intermediate"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=16",
    },
    plutusVersion: "V2",
    complexity: "Intermediate",
    useCase: "Gaming",

};

export default function LootboxContractArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module LootboxContract where

import qualified Plutus.V2.Ledger.Api      as PlutusV2
import           PlutusTx                  (BuiltinData, compile, unstableMakeIsData)
import           PlutusTx.Prelude          (Bool (False), Integer, traceIfFalse,
                                            (==), (&&), ($), (>=), modulo, divide)
import           PlutusTx.Builtins         (blake2b_256, sliceByteString,
                                            indexByteString)
import           Plutus.V1.Ledger.Value    (flattenValue, valueOf)
import           Plutus.V2.Ledger.Contexts (getContinuingOutputs)
import           Prelude                   (IO)
import           Utilities                 (wrapValidator, writeValidatorToFile)

-- | Datum holds the lootbox config: available rewards, price, house address,
-- and a counter that changes each time someone opens the box.

data LootboxDatum = LootboxDatum
    { rewardPolicyId  :: PlutusV2.CurrencySymbol
    , rewardTokens    :: [PlutusV2.TokenName]
    , openPrice       :: Integer                 -- lovelace
    , houseAddress    :: PlutusV2.PubKeyHash
    , openCounter     :: Integer                 -- increments on each open
    }
PlutusTx.unstableMakeIsData ''LootboxDatum

{-# INLINABLE mkLootboxValidator #-}
mkLootboxValidator :: LootboxDatum -> () -> PlutusV2.ScriptContext -> Bool
mkLootboxValidator dat () ctx =
    traceIfFalse "Opening fee not paid to the house!" feePaid &&
    traceIfFalse "Exactly one reward token must be minted!" oneRewardMinted &&
    traceIfFalse "Wrong reward token minted!" correctRewardMinted &&
    traceIfFalse "Lootbox state not updated correctly!" stateUpdated
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    feePaid :: Bool
    feePaid =
        valueOf (PlutusV2.valuePaidTo info (houseAddress dat))
                PlutusV2.adaSymbol PlutusV2.adaToken >= openPrice dat

    rewardMintEntries :: [(PlutusV2.CurrencySymbol, PlutusV2.TokenName, Integer)]
    rewardMintEntries =
        filter (\\(cs, _, _) -> cs == rewardPolicyId dat)
               (flattenValue (PlutusV2.txInfoMint info))

    oneRewardMinted :: Bool
    oneRewardMinted = case rewardMintEntries of
        [(_, _, amt)] -> amt == 1
        _             -> False

    -- Pseudo-random selection: hash(txId ++ counter), take first byte, mod by reward count
    pseudoRandomIndex :: Integer
    pseudoRandomIndex =
        let txIdBytes  = PlutusV2.getTxId (PlutusV2.txInfoId info)
            entropy    = blake2b_256 (appendByteString txIdBytes
                           (sliceByteString 0 8 (consByteString (openCounter dat) emptyByteString)))
            firstByte  = indexByteString entropy 0
            numRewards = length (rewardTokens dat)
        in modulo firstByte numRewards

    expectedReward :: PlutusV2.TokenName
    expectedReward = rewardTokens dat !! pseudoRandomIndex

    correctRewardMinted :: Bool
    correctRewardMinted = case rewardMintEntries of
        [(_, tn, _)] -> tn == expectedReward
        _            -> False

    stateUpdated :: Bool
    stateUpdated = case getContinuingOutputs ctx of
        [output] -> case PlutusV2.txOutDatum output of
            PlutusV2.OutputDatum (PlutusV2.Datum rawDatum) ->
                case PlutusTx.fromBuiltinData rawDatum of
                    Just newDat -> openCounter newDat == openCounter dat + 1
                    Nothing     -> False
            _ -> False
        _ -> False

{-# INLINABLE wrappedMkVal #-}
wrappedMkVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedMkVal = wrapValidator mkLootboxValidator

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrappedMkVal ||])

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/lootbox.plutus" validator
`;

    const bashCommands = `# 1. Set up the lootbox with 3 possible rewards and a 10 ADA price
$ cardano-cli conway transaction build \\
  --tx-in 6b1c4e2d8a37f905c12de94a7b053186f2c8d40e9ba71535c6f0e82d91a4b3c7#0 \\
  --tx-out $(cat lootbox.addr)+50000000 \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"reward_policy_aaa..."},{"list":[{"bytes":"476f6c64537461"},{"bytes":"53696c76657253746172"},{"bytes":"42726f6e7a65"}]},{"int":10000000},{"bytes":"house_pkh_bbb..."},{"int":0}]}' \\
  --change-address addr_test1q2auksz2vyqpg4tqdnqptv0mu628pt85070z063kxldrm3tw6xuva \\
  --testnet-magic 2 \\
  --out-file tx-setup-lootbox.raw

# ... sign and submit ...

-------------------------------------------------------------------------

# 2. Open the box! The script picks a reward based on tx hash + counter
$ cardano-cli conway transaction build \\
  --tx-in c72a1df8e94b056f2c81e9da4b07365f18c2d0b49ae7153c6f80e2d91a4b3c7e#0 \\
  --tx-in-script-file lootbox.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor": 0, "fields": []}' \\
  --tx-in b9ea7153c6f0e82d91a4b3c7e3cf82a1d7e94b056f2c81e9da40b7365f18c2d0#0 \\
  --mint "1 $(cat reward_policy.id).476f6c64537461" \\
  --mint-script-file reward_mint.plutus \\
  --mint-redeemer-value '{"constructor": 0, "fields": []}' \\
  --tx-out addr_test1_opener_address+"2000000 + 1 $(cat reward_policy.id).476f6c64537461" \\
  --tx-out addr_test1_house_address+10000000 \\
  --tx-out $(cat lootbox.addr)+40000000 \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"reward_policy_aaa..."},{"list":[{"bytes":"476f6c64537461"},{"bytes":"53696c76657253746172"},{"bytes":"42726f6e7a65"}]},{"int":10000000},{"bytes":"house_pkh_bbb..."},{"int":1}]}' \\
  --tx-in-collateral 53c6f0e82d91a4b3c7e3cf82a1d7e94b056f2c81e9da40b7365f18c2d0b9ea71#0 \\
  --change-address addr_test1_opener_address \\
  --testnet-magic 2 \\
  --out-file tx-open-lootbox.raw

$ cardano-cli conway transaction sign \\
  --tx-body-file tx-open-lootbox.raw \\
  --signing-key-file ../../../keys/opener.skey \\
  --testnet-magic 2 \\
  --out-file tx-open-lootbox.signed

$ cardano-cli conway transaction submit --tx-file tx-open-lootbox.signed
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                Lootboxes in most games are black boxes — you pay, you get something, and
                you have no idea if the odds were rigged. The whole drop rate system lives
                on someone else's server.
            </p>

            <p>
                This contract puts the randomness algorithm directly in the on-chain code.
                The reward is determined by hashing the transaction ID with a rotating
                counter, so the drop rates are visible to anyone reading the source.
                You pay ADA, the script picks a reward from a predefined list, and a
                token gets minted to your wallet.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="LootboxContract.hs"
            />
            <br />

            <h2 id="explanation">Explanation</h2>

            <h3>Pseudo-randomness on a deterministic chain</h3>

            <p className="pexplaination">
                Blockchains are deterministic — every node has to reach the same result.
                So we can't use traditional random number generators. Instead, we hash
                together values that nobody controls ahead of time: the transaction ID
                (which depends on all inputs and outputs) and a counter:
            </p>

            <CodeBlock
                code={`pseudoRandomIndex =
    let txIdBytes  = PlutusV2.getTxId (PlutusV2.txInfoId info)
        entropy    = blake2b_256 (appendByteString txIdBytes counterBytes)
        firstByte  = indexByteString entropy 0
        numRewards = length (rewardTokens dat)
    in modulo firstByte numRewards`}
                language="haskell"
                filename="Entropy Derivation"
            />

            <p className="pexplaination">
                The blake2b hash gives us 32 bytes. We grab the first byte (0-255) and
                mod it by the number of rewards. With 3 rewards, the result is 0, 1, or 2.
                The distribution isn't perfectly uniform (255 mod 3 has a slight bias),
                but it's good enough for most use cases and fully transparent.
            </p>

            <h3>Why the counter matters</h3>

            <p className="pexplaination pt-2">
                Without the counter, if someone opened the lootbox twice with very similar
                transactions, they might get the same result. The counter lives in the datum
                and gets incremented by 1 after each opening (verified via the continuing
                output). Every opening has a different entropy seed.
            </p>

            <br />

            <h2 id="execution">Execution</h2>

            <p className="pexplaination">
                The lootbox starts with a set of reward token names in the datum. Each
                opening consumes the state, picks a reward, mints it, and produces a new
                state with counter + 1.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Lootbox CLI Commands"
            />

            <h3>Security note</h3>

            <p className="pexplaination pt-2">
                The off-chain code has to pre-compute which reward the script will select,
                because you need to include the correct <code>--mint</code> argument when
                building the transaction. You run the same hash algorithm off-chain using
                the expected tx hash, then build accordingly. If your prediction is wrong,
                the script just rejects the transaction — it's self-correcting, but it
                also means a determined user could potentially craft specific transaction
                inputs to influence the outcome. For high-stakes applications, you'd want
                to use an external randomness oracle (like Chainlink VRF) instead.
            </p>

        </div>
    );
}
