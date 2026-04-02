import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "lootbox-contract",
    title: "Lootbox Contract",
    subtitle: "Pay ADA to open a mystery box and receive a pseudo-random on-chain reward",
    date: "2025-02-23T12:00:00.000Z",
    readTime: "8 min read",
    tags: ["plutus", "cardano", "nft", "randomness", "intermediate"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=16",
    },
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

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

-- The Datum holds the lootbox configuration:
-- what collection can be rewarded, how much each opening costs,
-- and a counter that changes with each open to produce different outcomes.

data LootboxDatum = LootboxDatum
    { rewardPolicyId  :: PlutusV2.CurrencySymbol  -- NFT/token collection for rewards
    , rewardTokens    :: [PlutusV2.TokenName]      -- List of possible reward token names
    , openPrice       :: Integer                   -- ADA cost per opening (Lovelace)
    , houseAddress    :: PlutusV2.PubKeyHash       -- Who collects the opening fees
    , openCounter     :: Integer                   -- Increments each opening for entropy
    }
PlutusTx.unstableMakeIsData ''LootboxDatum

{-# INLINABLE mkLootboxValidator #-}
mkLootboxValidator :: LootboxDatum -> () -> PlutusV2.ScriptContext -> Bool
mkLootboxValidator dat () ctx =
    -- The opener must pay the opening fee to the house
    traceIfFalse "Opening fee not paid to the house!" feePaid &&

    -- Exactly one reward token must be minted
    traceIfFalse "Exactly one reward token must be minted!" oneRewardMinted &&

    -- The minted reward must match the pseudo-random selection
    traceIfFalse "Wrong reward token minted!" correctRewardMinted &&

    -- The lootbox state must be updated (counter incremented)
    traceIfFalse "Lootbox state not updated correctly!" stateUpdated
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    -- Pay the house its fee
    feePaid :: Bool
    feePaid =
        valueOf (PlutusV2.valuePaidTo info (houseAddress dat))
                PlutusV2.adaSymbol PlutusV2.adaToken >= openPrice dat

    -- Extract all minted tokens under the reward collection policy
    rewardMintEntries :: [(PlutusV2.CurrencySymbol, PlutusV2.TokenName, Integer)]
    rewardMintEntries =
        filter (\\(cs, _, _) -> cs == rewardPolicyId dat)
               (flattenValue (PlutusV2.txInfoMint info))

    oneRewardMinted :: Bool
    oneRewardMinted = case rewardMintEntries of
        [(_, _, amt)] -> amt == 1
        _             -> False

    -- Pseudo-random index: hash the transaction ID + the counter,
    -- then take the first byte modulo the number of available rewards.
    -- This is deterministic per-transaction but unpredictable in advance.
    pseudoRandomIndex :: Integer
    pseudoRandomIndex =
        let txIdBytes  = PlutusV2.getTxId (PlutusV2.txInfoId info)
            entropy    = blake2b_256 (appendByteString txIdBytes
                           (sliceByteString 0 8 (consByteString (openCounter dat) emptyByteString)))
            firstByte  = indexByteString entropy 0
            numRewards = length (rewardTokens dat)
        in modulo firstByte numRewards

    -- Determine the expected reward token name
    expectedReward :: PlutusV2.TokenName
    expectedReward = rewardTokens dat !! pseudoRandomIndex

    correctRewardMinted :: Bool
    correctRewardMinted = case rewardMintEntries of
        [(_, tn, _)] -> tn == expectedReward
        _            -> False

    -- The continuing output must have counter + 1
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

---------------------------------------------------------------------------------------------------
------------------------------------- HELPER FUNCTIONS --------------------------------------------

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/lootbox.plutus" validator
`;

    const bashCommands = `# 1. Initialize the Lootbox with available rewards
# Datum: reward policy, list of 3 reward token names, 10 ADA price, house address, counter = 0
$ cardano-cli conway transaction build \\
  --tx-in dummy_tx_hash_uuid_here_1111111111111111#0 \\
  --tx-out $(cat lootbox.addr)+50000000 \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"reward_policy_aaa..."},{"list":[{"bytes":"476f6c64537461"},{"bytes":"53696c76657253746172"},{"bytes":"42726f6e7a65"}]},{"int":10000000},{"bytes":"house_pkh_bbb..."},{"int":0}]}' \\
  --change-address addr_test1_dummy_admin_address \\
  --testnet-magic 2 \\
  --out-file tx-setup-lootbox.raw

# ... sign and submit ...

-------------------------------------------------------------------------

# 2. Open the Lootbox! The script picks a reward based on your tx hash + counter
$ cardano-cli conway transaction build \\
  --tx-in dummy_lootbox_utxo_hash_2222222222222222#0 \\
  --tx-in-script-file lootbox.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor": 0, "fields": []}' \\
  --tx-in dummy_opener_funding_utxo_3333333333333#0 \\
  --mint "1 $(cat reward_policy.id).476f6c64537461" \\
  --mint-script-file reward_mint.plutus \\
  --mint-redeemer-value '{"constructor": 0, "fields": []}' \\
  --tx-out addr_test1_opener_address+"2000000 + 1 $(cat reward_policy.id).476f6c64537461" \\
  --tx-out addr_test1_house_address+10000000 \\
  --tx-out $(cat lootbox.addr)+40000000 \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"reward_policy_aaa..."},{"list":[{"bytes":"476f6c64537461"},{"bytes":"53696c76657253746172"},{"bytes":"42726f6e7a65"}]},{"int":10000000},{"bytes":"house_pkh_bbb..."},{"int":1}]}' \\
  --tx-in-collateral dummy_collateral_hash_uuid_here_4444#0 \\
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
                Lootboxes are everywhere in gaming — from Fortnite to Genshin Impact.
                The problem? You have <em>zero proof</em> that the odds are fair.
                The company can secretly rig the drop rates and you'd never know.
            </p>

            <p>
                On Cardano, we can build a <strong>Lootbox Contract</strong> where the
                randomness algorithm is <em>visible in the source code</em>. Every drop
                is determined by the transaction hash and a rotating counter, making
                the odds 100% auditable. You pay ADA, the script picks a reward,
                and a new token is minted directly to your wallet.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="LootboxContract.hs"
            />
            <br />

            <h2 id="explanation">How It Works</h2>

            <h3>On-Chain Pseudo-Randomness</h3>

            <p className="pexplaination">
                True randomness doesn't exist on a deterministic blockchain. But we can
                get <em>unpredictable-enough</em> randomness by hashing together values
                that nobody can control in advance: the transaction ID (which changes based
                on all inputs and outputs) and a counter that increments with each opening.
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
                The <code>blake2b_256</code> hash produces 32 bytes of seemingly random data.
                We take the first byte (a number from 0 to 255) and <code>modulo</code> it
                by the number of available rewards. If there are 3 rewards, the index will
                be 0, 1, or 2. The distribution isn't perfectly uniform (255 doesn't divide
                evenly by 3), but it's fair enough for most gaming use cases and completely
                transparent.
            </p>

            <h3>Anti-Replay via Counter</h3>

            <p className="pexplaination pt-2">
                Without the counter, someone could potentially try to replay or front-run
                openings. The counter lives in the datum and must be incremented by exactly
                1 on each opening (using the continuing output pattern). This ensures every
                single lootbox opening produces a different entropy seed, even if the same
                person opens twice in a row.
            </p>

            <h3>Fee Guarantee</h3>

            <p className="pexplaination pt-2">
                The same <code>valuePaidTo</code> pattern we've seen in the Escrow validator
                is reused here. The script doesn't just <em>hope</em> the opener pays the
                house — it mathematically verifies the ADA arrived at the house address
                before allowing the reward to mint.
            </p>

            <br />

            <h2 id="execution">Execution Lifecycle</h2>

            <p className="pexplaination">
                The lootbox is initialized with a pool of reward token names. Each opening
                consumes the current state, picks a reward, mints it, and produces a new
                state with an incremented counter.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Lootbox CLI Commands"
            />

            <h3>The Off-Chain Puzzle</h3>

            <p className="pexplaination pt-2">
                Here's the tricky part: the off-chain code (your wallet or script runner)
                must <em>pre-compute</em> which reward the script will select, because
                you need to include the correct <code>--mint</code> argument. You run the
                same hashing algorithm off-chain using the expected transaction hash, then
                build the transaction with the matching reward. If your prediction is wrong,
                the on-chain script simply rejects the transaction. It's self-correcting.
            </p>

        </div>
    );
}
