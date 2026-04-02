import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "breeding-contract",
    title: "Breeding Contract",
    subtitle: "Combine two parent NFTs to mint a unique child — genetic alchemy on the blockchain",
    date: "2025-02-23T11:00:00.000Z",
    readTime: "9 min read",
    tags: ["plutus", "cardano", "nft", "minting", "intermediate"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=15",
    },
};

export default function BreedingContractArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module BreedingContract where

import qualified Plutus.V2.Ledger.Api      as PlutusV2
import           PlutusTx                  (BuiltinData, compile, unstableMakeIsData)
import           PlutusTx.Prelude          (Bool (False), Integer, BuiltinByteString,
                                            traceIfFalse, (==), (&&), ($), (>), length,
                                            filter, map, appendByteString)
import           PlutusTx.Builtins         (blake2b_256)
import           Plutus.V1.Ledger.Value    (flattenValue, valueOf)
import           Prelude                   (IO)
import           Utilities                 (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

-- The Datum records the breeding rules: which collection policy spawned the parents,
-- and the child minting policy that's authorized to produce offspring.

data BreedingDatum = BreedingDatum
    { parentPolicyId   :: PlutusV2.CurrencySymbol  -- The NFT collection's policy ID
    , childPolicyId    :: PlutusV2.CurrencySymbol  -- The authorized child minting policy
    , breedingFee      :: Integer                  -- ADA fee in Lovelace to breed
    , feeCollector     :: PlutusV2.PubKeyHash      -- Who receives the breeding fee
    }
PlutusTx.unstableMakeIsData ''BreedingDatum

-- The Redeemer carries the two parent token names so the validator
-- can verify both parents are actually being spent in this tx.
data BreedingRedeemer = Breed
    { parentA :: PlutusV2.TokenName
    , parentB :: PlutusV2.TokenName
    }
PlutusTx.unstableMakeIsData ''BreedingRedeemer

{-# INLINABLE mkBreedingValidator #-}
mkBreedingValidator :: BreedingDatum -> BreedingRedeemer -> PlutusV2.ScriptContext -> Bool
mkBreedingValidator dat (Breed pA pB) ctx =
    -- Both parent NFTs must be present as inputs to the transaction.
    -- This proves the breeder actually owns (or at least controls) both parents.
    traceIfFalse "Parent A NFT not found in inputs!" (parentInInputs pA) &&
    traceIfFalse "Parent B NFT not found in inputs!" (parentInInputs pB) &&

    -- Exactly one child token must be minted under the authorized child policy.
    traceIfFalse "Exactly one child NFT must be minted!" exactlyOneChildMinted &&

    -- The child's token name must be derived from the two parents (deterministic).
    -- This prevents people from minting arbitrary child names.
    traceIfFalse "Child token name doesn't match parent hash!" childNameValid &&

    -- The breeding fee must be paid to the fee collector.
    traceIfFalse "Breeding fee not paid!" feePaid
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    -- Check if a specific parent NFT exists somewhere in the transaction inputs
    parentInInputs :: PlutusV2.TokenName -> Bool
    parentInInputs tn =
        let inputValues = map (PlutusV2.txOutValue . PlutusV2.txInInfoResolved)
                              (PlutusV2.txInfoInputs info)
            counts      = map (\\v -> valueOf v (parentPolicyId dat) tn) inputValues
        in length (filter (> 0) counts) > 0

    -- Look at everything minted in this transaction and find child policy tokens
    childMintEntries :: [(PlutusV2.CurrencySymbol, PlutusV2.TokenName, Integer)]
    childMintEntries =
        filter (\\(cs, _, _) -> cs == childPolicyId dat) (flattenValue (PlutusV2.txInfoMint info))

    exactlyOneChildMinted :: Bool
    exactlyOneChildMinted = case childMintEntries of
        [(_, _, amt)] -> amt == 1
        _             -> False

    -- The child's name is the blake2b hash of concatenating both parent names.
    -- This makes every breeding pair produce a unique, deterministic child.
    expectedChildName :: PlutusV2.TokenName
    expectedChildName =
        let PlutusV2.TokenName rawA = pA
            PlutusV2.TokenName rawB = pB
        in PlutusV2.TokenName (blake2b_256 (appendByteString rawA rawB))

    childNameValid :: Bool
    childNameValid = case childMintEntries of
        [(_, childTn, _)] -> childTn == expectedChildName
        _                 -> False

    -- Verify the fee collector gets at least the breeding fee in ADA
    feePaid :: Bool
    feePaid =
        let paidToCollector = PlutusV2.valuePaidTo info (feeCollector dat)
        in valueOf paidToCollector PlutusV2.adaSymbol PlutusV2.adaToken
             >= breedingFee dat

{-# INLINABLE wrappedMkVal #-}
wrappedMkVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedMkVal = wrapValidator mkBreedingValidator

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrappedMkVal ||])

---------------------------------------------------------------------------------------------------
------------------------------------- HELPER FUNCTIONS --------------------------------------------

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/breeding.plutus" validator
`;

    const bashCommands = `# 1. Lock the Breeding Configuration at the Script Address
# Datum stores: parent collection policy, child mint policy, fee (25 ADA), fee collector
$ cardano-cli conway transaction build \\
  --tx-in dummy_tx_hash_uuid_here_1111111111111111#0 \\
  --tx-out $(cat breeding.addr)+5000000 \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"parent_policy_aaa..."},{"bytes":"child_policy_bbb..."},{"int":25000000},{"bytes":"fee_collector_pkh_ccc..."}]}' \\
  --change-address addr_test1_dummy_admin_address \\
  --testnet-magic 2 \\
  --out-file tx-setup-breeding.raw

# ... sign and submit ...

-------------------------------------------------------------------------

# 2. Breed! Spend both parent NFTs + the breeding config, mint the child
# Redeemer: Breed {parentA: "DragonA_hex", parentB: "DragonB_hex"}
$ cardano-cli conway transaction build \\
  --tx-in dummy_parent_a_utxo_hash_2222222222222222#0 \\
  --tx-in dummy_parent_b_utxo_hash_3333333333333333#0 \\
  --tx-in dummy_breeding_config_utxo_444444444444444#0 \\
  --tx-in-script-file breeding.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor":0,"fields":[{"bytes":"447261676f6e41"},{"bytes":"447261676f6e42"}]}' \\
  --mint "1 $(cat child_policy.id).child_token_name_hash_hex" \\
  --mint-script-file child_mint.plutus \\
  --mint-redeemer-value '{"constructor": 0, "fields": []}' \\
  --tx-out addr_test1_breeder_address+"2000000 + 1 $(cat child_policy.id).child_token_name_hash_hex" \\
  --tx-out addr_test1_fee_collector_address+25000000 \\
  --required-signer-hash breeder_pkh_hash_here \\
  --tx-in-collateral dummy_collateral_hash_uuid_here_5555#0 \\
  --change-address addr_test1_breeder_address \\
  --testnet-magic 2 \\
  --out-file tx-breed.raw

$ cardano-cli conway transaction sign \\
  --tx-body-file tx-breed.raw \\
  --signing-key-file ../../../keys/breeder.skey \\
  --testnet-magic 2 \\
  --out-file tx-breed.signed

$ cardano-cli conway transaction submit --tx-file tx-breed.signed
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                Breeding mechanics are some of the most popular features in NFT gaming.
                CryptoKitties, Axie Infinity — they all let you combine two assets to
                produce a new one. On Cardano, we can enforce the <em>entire breeding
                logic</em> on-chain, making it impossible for anyone to cheat the system.
            </p>

            <p>
                The <strong>Breeding Contract</strong> verifies that two parent NFTs from
                a specific collection are being spent in the transaction, then authorizes
                the minting of exactly one child NFT whose name is deterministically derived
                from the parents. No server. No backend. Just math.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="BreedingContract.hs"
            />
            <br />

            <h2 id="explanation">How It Works</h2>

            <h3>Proving Parentage</h3>

            <p className="pexplaination">
                Anyone can <em>claim</em> they own two NFTs. The validator doesn't take
                their word for it — it scans every single input in the transaction and
                checks whether the parent NFT tokens are actually being spent. If you
                don't physically include both parent UTxOs as transaction inputs, the
                breed fails.
            </p>

            <CodeBlock
                code={`parentInInputs tn =
    let inputValues = map (PlutusV2.txOutValue . PlutusV2.txInInfoResolved)
                          (PlutusV2.txInfoInputs info)
        counts      = map (\\v -> valueOf v (parentPolicyId dat) tn) inputValues
    in length (filter (> 0) counts) > 0`}
                language="haskell"
                filename="Scanning Inputs for Parent NFTs"
            />

            <p className="pexplaination">
                This is crucial because on Cardano, spending a UTxO requires the owner's
                signature (or the script's approval). So if the parent NFTs are in the
                inputs, the breeder must legitimately control them.
            </p>

            <h3>Deterministic Child Names</h3>

            <p className="pexplaination pt-2">
                The child token name isn't random — it's the <code>blake2b_256</code> hash
                of concatenating both parent token names. This gives every parent pair a
                unique, predictable child. DragonA + DragonB will always produce the same
                child name. This prevents duplicate breeding and makes lineage auditable
                on-chain forever.
            </p>

            <CodeBlock
                code={`expectedChildName =
    let PlutusV2.TokenName rawA = pA
        PlutusV2.TokenName rawB = pB
    in PlutusV2.TokenName (blake2b_256 (appendByteString rawA rawB))`}
                language="haskell"
                filename="Child Name Derivation"
            />

            <h3>The Fee Mechanism</h3>

            <p className="pexplaination pt-2">
                Breeding isn't free. The datum specifies a <code>breedingFee</code> in
                Lovelace and a <code>feeCollector</code> address. The validator uses{" "}
                <code>valuePaidTo</code> to confirm the fee actually arrives at the
                collector. This is the exact same pattern used in the Escrow validator —
                guaranteed delivery checked by the script, not by trust.
            </p>

            <br />

            <h2 id="execution">Execution Lifecycle</h2>

            <p className="pexplaination">
                A breeding transaction is more complex than most because it involves multiple
                inputs (both parents + the breeding config), a minting operation (the child),
                and a fee output — all in a single atomic transaction.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Breeding CLI Commands"
            />

            <h3>Atomicity Is Your Friend</h3>

            <p className="pexplaination pt-2">
                The beauty of Cardano's transaction model is that all of this happens
                atomically. Either <em>everything</em> succeeds — parents are verified,
                child is minted, fee is paid — or <em>nothing</em> happens. There's no
                state where the fee was paid but the child wasn't minted, or the child
                was minted but the parents weren't checked.
            </p>

        </div>
    );
}
